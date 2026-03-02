/**
 * Stage Unlock Nodes — unit tests for data integrity, prerequisite chains,
 * getStageUnlockNode helper, LOCKED_STAGE_IDS export, cross-reference between
 * stageDefs and unlockDefs, and structural verification that MetaMenuScene
 * renders stage nodes and checks prerequisites before marking affordable.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  UNLOCK_NODES,
  LOCKED_STAGE_IDS,
  getStageUnlockNode,
  getMapUnlockNode,
} from '../../meta/unlockDefs';

import { ALL_STAGES } from '../../data/stageDefs';

// ── Stage unlock node data integrity ──────────────────────────────────────────

describe('stage unlock nodes', () => {
  const stageNodes = UNLOCK_NODES.filter(n => n.effect.type === 'stage');

  it('contains exactly 3 stage unlock nodes', () => {
    expect(stageNodes).toHaveLength(3);
  });

  it('all stage node IDs follow the unlock-stage-{id} convention', () => {
    for (const node of stageNodes) {
      expect(node.id).toMatch(/^unlock-stage-[a-z-]+-\d+$/);
    }
  });

  it('all stage node IDs are unique', () => {
    const ids = stageNodes.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all stage nodes have positive integer costs', () => {
    for (const node of stageNodes) {
      expect(node.cost).toBeGreaterThan(0);
      expect(Number.isInteger(node.cost)).toBe(true);
    }
  });

  it('all stage nodes have non-empty labels and descriptions', () => {
    for (const node of stageNodes) {
      expect(node.label.length).toBeGreaterThan(0);
      expect(node.description.length).toBeGreaterThan(0);
    }
  });

  it('all stage nodes have at least one prerequisite', () => {
    for (const node of stageNodes) {
      expect(node.prereqs.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('unlock-stage-niizh-miikana-01 has cost 250 and prereqs [unlock-map-02]', () => {
    const node = stageNodes.find(n => n.id === 'unlock-stage-niizh-miikana-01');
    expect(node).toBeDefined();
    expect(node!.cost).toBe(250);
    expect(node!.prereqs).toEqual(['unlock-map-02']);
    expect(node!.effect).toEqual({ type: 'stage', stageId: 'niizh-miikana-01' });
  });

  it('unlock-stage-mitigomizh-01 has cost 500 and prereqs [unlock-map-02]', () => {
    const node = stageNodes.find(n => n.id === 'unlock-stage-mitigomizh-01');
    expect(node).toBeDefined();
    expect(node!.cost).toBe(500);
    expect(node!.prereqs).toEqual(['unlock-map-02']);
    expect(node!.effect).toEqual({ type: 'stage', stageId: 'mitigomizh-01' });
  });

  it('unlock-stage-biboon-aki-01 has cost 700 and prereqs [unlock-stage-mitigomizh-01]', () => {
    const node = stageNodes.find(n => n.id === 'unlock-stage-biboon-aki-01');
    expect(node).toBeDefined();
    expect(node!.cost).toBe(700);
    expect(node!.prereqs).toEqual(['unlock-stage-mitigomizh-01']);
    expect(node!.effect).toEqual({ type: 'stage', stageId: 'biboon-aki-01' });
  });

  it('stage costs form ascending progression: 250, 500, 700', () => {
    const costs = stageNodes.map(n => n.cost).sort((a, b) => a - b);
    expect(costs).toEqual([250, 500, 700]);
  });
});

// ── Prerequisite chain integrity ──────────────────────────────────────────────

describe('stage prerequisite chains', () => {
  const allIds = new Set(UNLOCK_NODES.map(n => n.id));

  it('all stage node prereqs reference existing unlock node IDs', () => {
    const stageNodes = UNLOCK_NODES.filter(n => n.effect.type === 'stage');
    for (const node of stageNodes) {
      for (const prereq of node.prereqs) {
        expect(allIds.has(prereq)).toBe(true);
      }
    }
  });

  it('niizh-miikana-01 and mitigomizh-01 share the same prereq (unlock-map-02)', () => {
    const niizh = UNLOCK_NODES.find(n => n.id === 'unlock-stage-niizh-miikana-01')!;
    const oak = UNLOCK_NODES.find(n => n.id === 'unlock-stage-mitigomizh-01')!;
    expect(niizh.prereqs).toEqual(oak.prereqs);
    expect(niizh.prereqs[0]).toBe('unlock-map-02');
  });

  it('biboon-aki-01 depends on mitigomizh-01 (not directly on unlock-map-02)', () => {
    const frozen = UNLOCK_NODES.find(n => n.id === 'unlock-stage-biboon-aki-01')!;
    expect(frozen.prereqs).toEqual(['unlock-stage-mitigomizh-01']);
    expect(frozen.prereqs).not.toContain('unlock-map-02');
  });

  it('unlock-map-02 is a root node with no prereqs', () => {
    const map02 = UNLOCK_NODES.find(n => n.id === 'unlock-map-02')!;
    expect(map02.prereqs).toEqual([]);
  });

  it('no circular dependencies exist in the unlock graph', () => {
    // BFS from each node: should never revisit itself
    for (const node of UNLOCK_NODES) {
      const visited = new Set<string>();
      const queue = [...node.prereqs];
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (id === node.id) {
          throw new Error(`Circular dependency found: ${node.id} → ... → ${node.id}`);
        }
        if (visited.has(id)) continue;
        visited.add(id);
        const dep = UNLOCK_NODES.find(n => n.id === id);
        if (dep) queue.push(...dep.prereqs);
      }
    }
  });
});

// ── getStageUnlockNode ────────────────────────────────────────────────────────

describe('getStageUnlockNode', () => {
  it('returns the unlock node for niizh-miikana-01', () => {
    const node = getStageUnlockNode('niizh-miikana-01');
    expect(node).toBeDefined();
    expect(node!.id).toBe('unlock-stage-niizh-miikana-01');
  });

  it('returns the unlock node for mitigomizh-01', () => {
    const node = getStageUnlockNode('mitigomizh-01');
    expect(node).toBeDefined();
    expect(node!.id).toBe('unlock-stage-mitigomizh-01');
  });

  it('returns the unlock node for biboon-aki-01', () => {
    const node = getStageUnlockNode('biboon-aki-01');
    expect(node).toBeDefined();
    expect(node!.id).toBe('unlock-stage-biboon-aki-01');
  });

  it('returns undefined for zaagaiganing-01 (always accessible)', () => {
    expect(getStageUnlockNode('zaagaiganing-01')).toBeUndefined();
  });

  it('returns undefined for mashkiig-01 (uses map unlock, not stage unlock)', () => {
    expect(getStageUnlockNode('mashkiig-01')).toBeUndefined();
  });

  it('returns undefined for nonexistent stage ID', () => {
    expect(getStageUnlockNode('nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getStageUnlockNode('')).toBeUndefined();
  });

  it('does not return a map node when searching for stages', () => {
    expect(getStageUnlockNode('map-02')).toBeUndefined();
  });

  it('does not return a commander node when searching for stages', () => {
    expect(getStageUnlockNode('makoons')).toBeUndefined();
  });
});

// ── LOCKED_STAGE_IDS ──────────────────────────────────────────────────────────

describe('LOCKED_STAGE_IDS', () => {
  it('contains exactly 3 stage IDs', () => {
    expect(LOCKED_STAGE_IDS).toHaveLength(3);
  });

  it('contains all expected stage IDs', () => {
    expect(LOCKED_STAGE_IDS).toContain('niizh-miikana-01');
    expect(LOCKED_STAGE_IDS).toContain('mitigomizh-01');
    expect(LOCKED_STAGE_IDS).toContain('biboon-aki-01');
  });

  it('does not include zaagaiganing-01 (always accessible)', () => {
    expect(LOCKED_STAGE_IDS).not.toContain('zaagaiganing-01');
  });

  it('does not include mashkiig-01 (map unlock, not stage unlock)', () => {
    expect(LOCKED_STAGE_IDS).not.toContain('mashkiig-01');
  });
});

// ── Cross-reference: stageDefs ↔ unlockDefs ──────────────────────────────────

describe('stageDefs ↔ unlockDefs alignment', () => {
  const stageNodes = UNLOCK_NODES.filter(n => n.effect.type === 'stage');

  it('every stage unlock node references a real stage ID in ALL_STAGES', () => {
    const allStageIds = ALL_STAGES.map(s => s.id);
    for (const node of stageNodes) {
      const effect = node.effect as { type: 'stage'; stageId: string };
      expect(allStageIds).toContain(effect.stageId);
    }
  });

  it('every stage with a stage-type unlockId has a matching unlock node', () => {
    for (const stage of ALL_STAGES) {
      if (stage.unlockId && stage.unlockId.startsWith('unlock-stage-')) {
        const node = UNLOCK_NODES.find(n => n.id === stage.unlockId);
        expect(node).toBeDefined();
        expect(node!.effect.type).toBe('stage');
      }
    }
  });

  it('unlockCost in stageDefs matches cost in unlockDefs for each stage', () => {
    for (const stage of ALL_STAGES) {
      if (!stage.unlockId) continue;
      const node = UNLOCK_NODES.find(n => n.id === stage.unlockId);
      if (node) {
        expect(node.cost).toBe(stage.unlockCost);
      }
    }
  });

  it('getMapUnlockNode does not interfere with stage lookups', () => {
    expect(getMapUnlockNode('niizh-miikana-01')).toBeUndefined();
    expect(getStageUnlockNode('map-02')).toBeUndefined();
  });
});

// ── Structural: MetaMenuScene renders stage nodes ─────────────────────────────

describe('MetaMenuScene structural checks', () => {
  const sceneSrc = readFileSync(
    resolve(__dirname, '../../scenes/MetaMenuScene.ts'),
    'utf-8',
  );

  it('filters UNLOCK_NODES for stage-type nodes', () => {
    expect(sceneSrc).toContain("n.effect.type === 'stage'");
  });

  it('renders a Stages section header', () => {
    expect(sceneSrc).toContain("'Stages'");
  });

  it('passes container to renderNode for all three node types', () => {
    // renderNode should receive a container parameter for map, stage, and commander nodes
    const renderNodeCalls = sceneSrc.match(/this\.renderNode\([^)]+\)/g) ?? [];
    // All renderNode calls in renderUnlocksTab should pass container
    const callsWithContainer = renderNodeCalls.filter(c => c.includes('container'));
    expect(callsWithContainer.length).toBeGreaterThanOrEqual(3);
  });

  it('checks prereqsMet before computing affordable', () => {
    // The fix: affordable must include prereqsMet
    expect(sceneSrc).toContain('prereqsMet && save.getCurrency() >= node.cost');
  });

  it('affordable is gated behind !owned', () => {
    expect(sceneSrc).toContain('!owned && prereqsMet && save.getCurrency() >= node.cost');
  });

  it('locked state checks !prereqsMet', () => {
    expect(sceneSrc).toContain('!owned && !prereqsMet');
  });

  it('renders LOCKED badge for nodes with unmet prereqs', () => {
    expect(sceneSrc).toContain("'LOCKED'");
  });

  it('includes scroll support via wheel event', () => {
    expect(sceneSrc).toContain("this.input.on('wheel'");
  });

  it('creates a scrollable container for unlock content', () => {
    expect(sceneSrc).toContain('this.add.container(0, 0)');
  });

  it('applies scroll clamping with Phaser.Math.Clamp', () => {
    expect(sceneSrc).toContain('Phaser.Math.Clamp(scrollOffset + delta, 0, maxScroll)');
  });
});

// ── UNLOCK_NODES overall integrity (extended) ─────────────────────────────────

describe('UNLOCK_NODES overall integrity with stage nodes', () => {
  it('total node count is 8 (1 map + 3 stages + 4 commanders)', () => {
    expect(UNLOCK_NODES).toHaveLength(8);
  });

  it('all node IDs are globally unique', () => {
    const ids = UNLOCK_NODES.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all prereq references point to existing node IDs', () => {
    const allIds = new Set(UNLOCK_NODES.map(n => n.id));
    for (const node of UNLOCK_NODES) {
      for (const prereq of node.prereqs) {
        expect(allIds.has(prereq)).toBe(true);
      }
    }
  });

  it('map, stage, and commander node counts are 1, 3, 4', () => {
    const maps = UNLOCK_NODES.filter(n => n.effect.type === 'map');
    const stages = UNLOCK_NODES.filter(n => n.effect.type === 'stage');
    const commanders = UNLOCK_NODES.filter(n => n.effect.type === 'commander');
    expect(maps).toHaveLength(1);
    expect(stages).toHaveLength(3);
    expect(commanders).toHaveLength(4);
  });
});
