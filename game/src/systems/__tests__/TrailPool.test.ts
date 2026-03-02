import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock Phaser ──────────────────────────────────────────────────────────────
// TrailPool imports Phaser for the Phaser.Scene type. We mock the entire module
// so Phaser's WebGL renderer (which requires phaser3spectorjs) never loads.
vi.mock('phaser', () => ({ default: {} }));

// ── Mock Phaser Arc ──────────────────────────────────────────────────────────
// TrailPool creates Phaser.GameObjects.Arc via scene.add.circle(). We provide a
// minimal mock that tracks the state TrailPool reads/writes: active, visible,
// position, alpha, radius, fillStyle, depth.

interface MockArc {
  x:       number;
  y:       number;
  active:  boolean;
  visible: boolean;
  alpha:   number;
  radius:  number;
  depth:   number;
  color:   number;
  setPosition: (x: number, y: number) => MockArc;
  setRadius:   (r: number)            => MockArc;
  setFillStyle: (c: number)           => MockArc;
  setDepth:    (d: number)            => MockArc;
  setAlpha:    (a: number)            => MockArc;
  setActive:   (v: boolean)           => MockArc;
  setVisible:  (v: boolean)           => MockArc;
  destroy:     () => void;
  destroyed:   boolean;
}

function createMockArc(): MockArc {
  const arc: MockArc = {
    x: 0, y: 0, active: false, visible: false,
    alpha: 0, radius: 0, depth: 0, color: 0,
    destroyed: false,
    setPosition(x, y) { arc.x = x; arc.y = y; return arc; },
    setRadius(r)      { arc.radius = r;       return arc; },
    setFillStyle(c)   { arc.color = c;        return arc; },
    setDepth(d)       { arc.depth = d;        return arc; },
    setAlpha(a)       { arc.alpha = a;        return arc; },
    setActive(v)      { arc.active = v;       return arc; },
    setVisible(v)     { arc.visible = v;      return arc; },
    destroy()         { arc.destroyed = true; arc.active = false; },
  };
  return arc;
}

// ── Mock Phaser Scene ────────────────────────────────────────────────────────

function createMockScene() {
  const arcs: MockArc[] = [];
  return {
    arcs,
    add: {
      circle: (_x: number, _y: number, _r: number, _color: number, _alpha: number) => {
        const arc = createMockArc();
        arcs.push(arc);
        return arc;
      },
    },
  };
}

// ── Import the class under test ──────────────────────────────────────────────
// vi.mock('phaser') is hoisted above this import by Vitest, so TrailPool loads
// without triggering Phaser's WebGL renderer.

import { TrailPool } from '../TrailPool';

// We cast mock scenes to `any` to satisfy the Phaser.Scene type constraint.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyScene = any;

describe('TrailPool', () => {
  let scene: ReturnType<typeof createMockScene>;
  let pool:  TrailPool;

  beforeEach(() => {
    scene = createMockScene();
    pool = new TrailPool(scene as AnyScene, 4);
  });

  // ── construction ──────────────────────────────────────────────────────────

  it('pre-allocates the requested capacity of arcs', () => {
    expect(scene.arcs).toHaveLength(4);
  });

  it('all pre-allocated arcs start inactive and invisible', () => {
    for (const arc of scene.arcs) {
      expect(arc.active).toBe(false);
      expect(arc.visible).toBe(false);
    }
  });

  // ── emit ──────────────────────────────────────────────────────────────────

  it('emit() activates and positions a pooled arc', () => {
    pool.emit(100, 200, 3, 0xff0000, 0.8, 15, 200);

    const active = scene.arcs.filter(a => a.active);
    expect(active).toHaveLength(1);
    expect(active[0].x).toBe(100);
    expect(active[0].y).toBe(200);
    expect(active[0].visible).toBe(true);
    expect(active[0].alpha).toBe(0.8);
    expect(active[0].depth).toBe(15);
  });

  it('emit() sets radius and fill color', () => {
    pool.emit(50, 50, 5, 0x00ff00, 1.0, 10, 100);

    const active = scene.arcs.filter(a => a.active);
    expect(active[0].radius).toBe(5);
    expect(active[0].color).toBe(0x00ff00);
  });

  it('multiple emit() calls reuse different slots', () => {
    pool.emit(10, 10, 2, 0xff0000, 0.5, 18, 100);
    pool.emit(20, 20, 2, 0x00ff00, 0.5, 18, 100);

    const active = scene.arcs.filter(a => a.active);
    expect(active).toHaveLength(2);
    expect(active[0].x).toBe(10);
    expect(active[1].x).toBe(20);
  });

  it('grows the pool when all slots are busy', () => {
    // Exhaust all 4 pre-allocated slots.
    for (let i = 0; i < 4; i++) {
      pool.emit(i * 10, 0, 2, 0xffffff, 0.5, 18, 100);
    }
    expect(scene.arcs).toHaveLength(4);

    // 5th emit must grow the pool.
    pool.emit(999, 999, 2, 0xffffff, 0.5, 18, 100);
    expect(scene.arcs.length).toBeGreaterThan(4);

    const active = scene.arcs.filter(a => a.active);
    expect(active).toHaveLength(5);
  });

  // ── update (alpha decay) ──────────────────────────────────────────────────

  it('update() decays alpha over time', () => {
    pool.emit(0, 0, 2, 0xffffff, 1.0, 18, 200);
    // After 100ms (half the lifetime), alpha should be ~0.5.
    pool.update(100);

    const arc = scene.arcs.find(a => a.active);
    expect(arc).toBeDefined();
    expect(arc!.alpha).toBeCloseTo(0.5, 1);
  });

  it('update() deactivates particle when alpha reaches 0', () => {
    pool.emit(0, 0, 2, 0xffffff, 1.0, 18, 200);
    // After 200ms (full lifetime), alpha should be 0 → deactivated.
    pool.update(200);

    const arc = scene.arcs[0];
    expect(arc.active).toBe(false);
    expect(arc.visible).toBe(false);
  });

  it('update() with 0 delta does not change alpha', () => {
    pool.emit(0, 0, 2, 0xffffff, 0.8, 18, 200);
    pool.update(0);

    const arc = scene.arcs.find(a => a.active);
    expect(arc).toBeDefined();
    expect(arc!.alpha).toBe(0.8);
  });

  it('deactivated particle is reused by next emit()', () => {
    pool.emit(0, 0, 2, 0xffffff, 1.0, 18, 100);
    // Fully decay the particle.
    pool.update(100);
    expect(scene.arcs[0].active).toBe(false);

    // Next emit should reuse the same arc (no pool growth).
    pool.emit(50, 50, 3, 0xff0000, 0.6, 18, 200);
    expect(scene.arcs).toHaveLength(4); // no growth
    expect(scene.arcs[0].active).toBe(true);
    expect(scene.arcs[0].x).toBe(50);
  });

  it('skips inactive particles during update', () => {
    // Emit only 1 of 4 slots — update should not crash on the 3 inactive ones.
    pool.emit(0, 0, 2, 0xffffff, 1.0, 18, 200);
    expect(() => pool.update(50)).not.toThrow();
  });

  // ── destroy ───────────────────────────────────────────────────────────────

  it('destroy() calls destroy on all arcs', () => {
    pool.emit(0, 0, 2, 0xffffff, 1.0, 18, 200);
    pool.destroy();

    for (const arc of scene.arcs) {
      expect(arc.destroyed).toBe(true);
    }
  });

  it('destroy() clears the internal particle array', () => {
    pool.destroy();
    // After destroy, update should be a no-op (no particles to iterate).
    expect(() => pool.update(100)).not.toThrow();
  });

  // ── edge cases ────────────────────────────────────────────────────────────

  it('handles very large delta (exceeds lifetime in one tick)', () => {
    pool.emit(0, 0, 2, 0xffffff, 1.0, 18, 100);
    pool.update(9999);

    expect(scene.arcs[0].active).toBe(false);
  });

  it('handles fractional delta values', () => {
    pool.emit(0, 0, 2, 0xffffff, 1.0, 18, 1000);
    pool.update(16.67); // ~60fps frame

    const arc = scene.arcs.find(a => a.active);
    expect(arc).toBeDefined();
    // Alpha should decrease by 1.0/1000 * 16.67 ≈ 0.01667
    expect(arc!.alpha).toBeCloseTo(1.0 - 0.01667, 3);
  });

  it('capacity of 0 grows on first emit', () => {
    const emptyScene = createMockScene();
    const emptyPool = new TrailPool(emptyScene as AnyScene, 0);
    expect(emptyScene.arcs).toHaveLength(0);

    emptyPool.emit(10, 10, 2, 0xffffff, 0.5, 18, 100);
    expect(emptyScene.arcs).toHaveLength(1);
    expect(emptyScene.arcs[0].active).toBe(true);
  });
});
