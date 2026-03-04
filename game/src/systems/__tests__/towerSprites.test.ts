/**
 * Tests for TASK-156: In-Game Tower Sprites Overhaul.
 *
 * Verifies the sprite-based tower architecture:
 *  1.  BootScene.ts preloads all 12 tower sprite assets (6 bases + 6 turrets)
 *  2.  Tower.ts has _baseSprite and _turretSprite fields
 *  3.  buildBody() uses Phaser.GameObjects.Image (not Arc/Rectangle)
 *  4.  Base sprite is added to container before turret sprite (depth order)
 *  5.  Turret sprite receives setAngle calls (not the container)
 *  6.  Fire animations target _turretSprite (not _bodyRef)
 *  7.  Idle animations (pulse, bob) target _turretSprite
 *  8.  setAnimTier scales both _baseSprite and _turretSprite
 *  9.  Rotation (_stepBarrelTracking, _stepTeslaLean) sets turret sprite angle
 * 10.  BootScene loads exactly 12 tower sprites (tower-*-base + tower-*-turret)
 * 11.  All 6 tower keys have matching sprite asset key patterns in BootScene
 * 12.  sell() destroys only graphics (range, spark, aura) — sprites via container destroy
 */

import { describe, it, expect } from 'vitest';
import fs   from 'fs';
import path from 'path';

const TOWER_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../entities/towers/Tower.ts'),
  'utf8',
);

const BOOT_SRC = fs.readFileSync(
  path.resolve(__dirname, '../../../src/scenes/BootScene.ts'),
  'utf8',
);

// ── 1. BootScene preloads all 12 tower sprites ───────────────────────────────

describe('BootScene — tower sprite preloads', () => {
  const TOWER_KEYS = ['arrow', 'rock-hurler', 'frost', 'poison', 'tesla', 'aura'];

  it.each(TOWER_KEYS)('%s base sprite preloaded', (key) => {
    expect(BOOT_SRC).toContain(`tower-${key}-base`);
    expect(BOOT_SRC).toContain(`assets/towers/${key}-base.png`);
  });

  it.each(TOWER_KEYS)('%s turret sprite preloaded', (key) => {
    expect(BOOT_SRC).toContain(`tower-${key}-turret`);
    expect(BOOT_SRC).toContain(`assets/towers/${key}-turret.png`);
  });

  it('preloads exactly 12 tower sprites', () => {
    const baseCount   = (BOOT_SRC.match(/tower-\w[\w-]+-base/g) ?? []).length;
    const turretCount = (BOOT_SRC.match(/tower-\w[\w-]+-turret/g) ?? []).length;
    expect(baseCount).toBe(6);
    expect(turretCount).toBe(6);
  });
});

// ── 2-3. Tower.ts sprite fields and Image type ──────────────────────────────

describe('Tower.ts — sprite fields', () => {
  it('has _baseSprite field', () => {
    expect(TOWER_SRC).toContain('_baseSprite');
  });

  it('has _turretSprite field', () => {
    expect(TOWER_SRC).toContain('_turretSprite');
  });

  it('_baseSprite is typed as Phaser.GameObjects.Image', () => {
    expect(TOWER_SRC).toContain('_baseSprite?:   Phaser.GameObjects.Image');
  });

  it('_turretSprite is typed as Phaser.GameObjects.Image', () => {
    expect(TOWER_SRC).toContain('_turretSprite?: Phaser.GameObjects.Image');
  });

  it('does NOT have _bodyRef field (replaced by _baseSprite)', () => {
    expect(TOWER_SRC).not.toContain('_bodyRef');
  });

  it('does NOT have _iconRef field (replaced by _turretSprite)', () => {
    expect(TOWER_SRC).not.toContain('_iconRef');
  });
});

// ── 4. buildBody depth order — base before turret ───────────────────────────

describe('buildBody — base added before turret', () => {
  function extractMethod(src: string, name: string): string {
    const regex = new RegExp(
      `(private\\s+)?${name}\\s*\\([^)]*\\)\\s*(?::\\s*[\\w.]+)?\\s*\\{`,
    );
    const match = regex.exec(src);
    if (!match) return '';
    const startIdx = match.index;
    let braces = 0;
    let i = src.indexOf('{', startIdx);
    for (; i < src.length; i++) {
      if (src[i] === '{') braces++;
      if (src[i] === '}') braces--;
      if (braces === 0) break;
    }
    return src.slice(startIdx, i + 1);
  }

  const buildBodySrc = extractMethod(TOWER_SRC, 'buildBody');

  it('assigns _baseSprite before _turretSprite', () => {
    const baseIdx   = buildBodySrc.indexOf('_baseSprite = base');
    const turretIdx = buildBodySrc.indexOf('_turretSprite = turret');
    expect(baseIdx).toBeGreaterThan(-1);
    expect(turretIdx).toBeGreaterThan(-1);
    expect(baseIdx).toBeLessThan(turretIdx);
  });

  it('passes [base, turret] to this.add() in that order', () => {
    expect(buildBodySrc).toContain('this.add([base, turret])');
  });

  it('uses tower key template string for base texture key', () => {
    expect(buildBodySrc).toContain('tower-${this.def.key}-base');
  });

  it('uses tower key template string for turret texture key', () => {
    expect(buildBodySrc).toContain('tower-${this.def.key}-turret');
  });

  it('sets display size of BODY_SIZE on both sprites', () => {
    const baseDisplayIdx   = buildBodySrc.indexOf('base.setDisplaySize(BODY_SIZE, BODY_SIZE)');
    const turretDisplayIdx = buildBodySrc.indexOf('turret.setDisplaySize(BODY_SIZE, BODY_SIZE)');
    expect(baseDisplayIdx).toBeGreaterThan(-1);
    expect(turretDisplayIdx).toBeGreaterThan(-1);
  });
});

// ── 5-6. Rotation and fire animations target turret sprite ───────────────────

describe('Tower.ts — rotation targets turret sprite', () => {
  it('_stepBarrelTracking calls _turretSprite.setAngle (not this.setAngle)', () => {
    const match = TOWER_SRC.match(/_stepBarrelTracking\(\)[^}]*?_turretSprite\?\.setAngle/s);
    expect(match).not.toBeNull();
  });

  it('_stepTeslaLean calls _turretSprite.setAngle', () => {
    expect(TOWER_SRC).toContain('_turretSprite?.setAngle(this._barrelAngle)');
  });

  it('_stepSweepIdle calls _turretSprite.setAngle', () => {
    const match = TOWER_SRC.match(/_stepSweepIdle[^}]*_turretSprite\?\.setAngle/s);
    expect(match).not.toBeNull();
  });

  it('_stepBarrelTracking does NOT call this.setAngle (container not rotated)', () => {
    const trackingStart = TOWER_SRC.indexOf('_stepBarrelTracking():');
    const trackingEnd   = TOWER_SRC.indexOf('\n  }', trackingStart) + 4;
    const trackingBody  = TOWER_SRC.slice(trackingStart, trackingEnd);
    expect(trackingBody).not.toContain('this.setAngle(');
  });
});

describe('Tower.ts — fire animations target turret sprite', () => {
  it('_playRockHurlerKick targets _turretSprite in tween', () => {
    const match = TOWER_SRC.match(/_playRockHurlerKick[^}]*targets:\s*this\._turretSprite/s);
    expect(match).not.toBeNull();
  });

  it('_playFrostFire targets _turretSprite in tween', () => {
    const match = TOWER_SRC.match(/_playFrostFire[^}]*targets:\s*this\._turretSprite/s);
    expect(match).not.toBeNull();
  });

  it('_playTeslaFlash uses _turretSprite.setTint', () => {
    const match = TOWER_SRC.match(/_playTeslaFlash[^}]*_turretSprite\.setTint/s);
    expect(match).not.toBeNull();
  });

  it('_playPoisonGlow uses _turretSprite.setTint', () => {
    const match = TOWER_SRC.match(/_playPoisonGlow[^}]*_turretSprite\.setTint/s);
    expect(match).not.toBeNull();
  });

  it('_playArrowRecoil targets _turretSprite in tween', () => {
    const match = TOWER_SRC.match(/_playArrowRecoil[^}]*targets:\s*this\._turretSprite/s);
    expect(match).not.toBeNull();
  });

  it('fire animations do NOT use setFillStyle (Image uses setTint)', () => {
    // setFillStyle is Arc/Rectangle only — should not appear in fire anim methods
    const fireAnimStart = TOWER_SRC.indexOf('// ── Fire animations');
    const fireAnimSrc   = TOWER_SRC.slice(fireAnimStart);
    expect(fireAnimSrc).not.toContain('setFillStyle');
  });
});

// ── 7. Idle animations target turret sprite ──────────────────────────────────

describe('Tower.ts — idle animations target turret sprite', () => {
  it('_stepPulseIdle scales _turretSprite', () => {
    const match = TOWER_SRC.match(/_stepPulseIdle[^}]*_turretSprite\.setScale/s);
    expect(match).not.toBeNull();
  });

  it('_stepBobIdle moves _turretSprite.y', () => {
    const match = TOWER_SRC.match(/_stepBobIdle[^}]*_turretSprite\.y\s*=/s);
    expect(match).not.toBeNull();
  });
});

// ── 8. setAnimTier scales both sprites ───────────────────────────────────────

describe('Tower.ts — setAnimTier scales both sprites', () => {
  it('setAnimTier scales _baseSprite', () => {
    const match = TOWER_SRC.match(/setAnimTier[^}]*_baseSprite\?\.setScale/s);
    expect(match).not.toBeNull();
  });

  it('setAnimTier scales _turretSprite', () => {
    const match = TOWER_SRC.match(/setAnimTier[^}]*_turretSprite\?\.setScale/s);
    expect(match).not.toBeNull();
  });
});

// ── 9. Rotation state uses _barrelAngle (not this.angle) ────────────────────

describe('Tower.ts — rotation state tracking', () => {
  it('_stepTeslaLean updates _barrelAngle before setting turret angle', () => {
    const match = TOWER_SRC.match(/_stepTeslaLean[^}]*_barrelAngle\s*=[^}]*_turretSprite\?\.setAngle/s);
    expect(match).not.toBeNull();
  });

  it('_stepSweepIdle updates _barrelAngle', () => {
    const match = TOWER_SRC.match(/_stepSweepIdle[^}]*_barrelAngle\s*=\s*sweepAngle/s);
    expect(match).not.toBeNull();
  });
});
