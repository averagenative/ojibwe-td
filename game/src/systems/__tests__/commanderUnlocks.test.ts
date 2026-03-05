/**
 * Commander Unlock Progression — unit tests for unlock nodes, lookup helpers,
 * and alignment between commanderDefs and unlockDefs.
 */

import { describe, it, expect } from 'vitest';
import {
  UNLOCK_NODES,
  getCommanderUnlockNode,
  getMapUnlockNode,
} from '../../meta/unlockDefs';
import {
  ALL_COMMANDERS,
  LOCKED_COMMANDER_IDS,
  getCommanderDef,
} from '../../data/commanderDefs';

// ── Commander unlock node data integrity ────────────────────────────────────

describe('commander unlock nodes', () => {
  const commanderNodes = UNLOCK_NODES.filter(n => n.effect.type === 'commander');

  it('contains exactly 4 commander unlock nodes', () => {
    expect(commanderNodes).toHaveLength(4);
  });

  it('all commander node IDs follow the unlock-commander-{id} convention', () => {
    for (const node of commanderNodes) {
      expect(node.id).toMatch(/^unlock-commander-[a-z]+$/);
    }
  });

  it('all commander node IDs are unique', () => {
    const ids = commanderNodes.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all commander nodes have positive integer costs', () => {
    for (const node of commanderNodes) {
      expect(node.cost).toBeGreaterThan(0);
      expect(Number.isInteger(node.cost)).toBe(true);
    }
  });

  it('all commander nodes have non-empty descriptions', () => {
    for (const node of commanderNodes) {
      expect(node.description.length).toBeGreaterThan(0);
    }
  });

  it('all commander nodes have empty prereqs', () => {
    for (const node of commanderNodes) {
      expect(node.prereqs).toEqual([]);
    }
  });

  it('unlock-commander-makoons has cost 400', () => {
    const node = commanderNodes.find(n => n.id === 'unlock-commander-makoons');
    expect(node).toBeDefined();
    expect(node!.cost).toBe(400);
    expect(node!.description).toBe('Unlock Makoons \u2014 the bear spirit warrior');
    expect(node!.effect).toEqual({ type: 'commander', commanderId: 'makoons' });
  });

  it('unlock-commander-waabizii has cost 500', () => {
    const node = commanderNodes.find(n => n.id === 'unlock-commander-waabizii');
    expect(node).toBeDefined();
    expect(node!.cost).toBe(500);
    expect(node!.description).toBe('Unlock Waabizii \u2014 the swan healer');
    expect(node!.effect).toEqual({ type: 'commander', commanderId: 'waabizii' });
  });

  it('unlock-commander-bizhiw has cost 650', () => {
    const node = commanderNodes.find(n => n.id === 'unlock-commander-bizhiw');
    expect(node).toBeDefined();
    expect(node!.cost).toBe(650);
    expect(node!.description).toBe('Unlock Bizhiw \u2014 the lynx hunter');
    expect(node!.effect).toEqual({ type: 'commander', commanderId: 'bizhiw' });
  });

  it('unlock-commander-animikiikaa has cost 800', () => {
    const node = commanderNodes.find(n => n.id === 'unlock-commander-animikiikaa');
    expect(node).toBeDefined();
    expect(node!.cost).toBe(800);
    expect(node!.description).toBe('Unlock Animikiikaa \u2014 the thunderbird');
    expect(node!.effect).toEqual({ type: 'commander', commanderId: 'animikiikaa' });
  });
});

// ── getCommanderUnlockNode ──────────────────────────────────────────────────

describe('getCommanderUnlockNode', () => {
  it('returns the unlock node for makoons', () => {
    const node = getCommanderUnlockNode('makoons');
    expect(node).toBeDefined();
    expect(node!.id).toBe('unlock-commander-makoons');
  });

  it('returns the unlock node for waabizii', () => {
    const node = getCommanderUnlockNode('waabizii');
    expect(node).toBeDefined();
    expect(node!.id).toBe('unlock-commander-waabizii');
  });

  it('returns the unlock node for bizhiw', () => {
    const node = getCommanderUnlockNode('bizhiw');
    expect(node).toBeDefined();
    expect(node!.id).toBe('unlock-commander-bizhiw');
  });

  it('returns the unlock node for animikiikaa', () => {
    const node = getCommanderUnlockNode('animikiikaa');
    expect(node).toBeDefined();
    expect(node!.id).toBe('unlock-commander-animikiikaa');
  });

  it('returns undefined for nokomis (default unlocked, no node)', () => {
    expect(getCommanderUnlockNode('nokomis')).toBeUndefined();
  });

  it('returns undefined for oshkaabewis (no unlock node yet)', () => {
    expect(getCommanderUnlockNode('oshkaabewis')).toBeUndefined();
  });

  it('returns undefined for nonexistent commander ID', () => {
    expect(getCommanderUnlockNode('nobody')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getCommanderUnlockNode('')).toBeUndefined();
  });

  it('does not return a map node when searching for commanders', () => {
    expect(getCommanderUnlockNode('map-02')).toBeUndefined();
  });
});

// ── Cross-reference: commanderDefs ↔ unlockDefs ─────────────────────────────

describe('commanderDefs ↔ unlockDefs alignment', () => {
  it('every commander unlock node references a real commander ID', () => {
    const commanderNodes = UNLOCK_NODES.filter(n => n.effect.type === 'commander');
    const allIds = ALL_COMMANDERS.map(c => c.id);
    for (const node of commanderNodes) {
      const effect = node.effect as { type: 'commander'; commanderId: string };
      expect(allIds).toContain(effect.commanderId);
    }
  });

  it('every commander with an unlock node is not defaultUnlocked', () => {
    const commanderNodes = UNLOCK_NODES.filter(n => n.effect.type === 'commander');
    for (const node of commanderNodes) {
      const effect = node.effect as { type: 'commander'; commanderId: string };
      const def = getCommanderDef(effect.commanderId);
      expect(def).toBeDefined();
      expect(def!.defaultUnlocked).toBe(false);
    }
  });

  it('nokomis is the only defaultUnlocked commander', () => {
    const defaultUnlocked = ALL_COMMANDERS.filter(c => c.defaultUnlocked);
    expect(defaultUnlocked).toHaveLength(1);
    expect(defaultUnlocked[0].id).toBe('nokomis');
  });

  it('LOCKED_COMMANDER_IDS includes all non-default commanders', () => {
    const nonDefault = ALL_COMMANDERS.filter(c => !c.defaultUnlocked).map(c => c.id);
    expect(LOCKED_COMMANDER_IDS).toEqual(nonDefault);
  });

  it('getMapUnlockNode does not interfere with commander lookups', () => {
    // Ensure the two lookup functions are independent
    expect(getMapUnlockNode('makoons')).toBeUndefined();
    expect(getCommanderUnlockNode('map-02')).toBeUndefined();
  });
});

// ── UNLOCK_NODES overall integrity (extended from phase10 tests) ────────────

describe('UNLOCK_NODES overall integrity with commander nodes', () => {
  it('total node count is 10 (1 map + 4 commanders + 5 stages)', () => {
    expect(UNLOCK_NODES).toHaveLength(10);
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

  it('commander costs form ascending progression: 400, 500, 650, 800', () => {
    const commanderNodes = UNLOCK_NODES.filter(n => n.effect.type === 'commander');
    const costs = commanderNodes.map(n => n.cost).sort((a, b) => a - b);
    expect(costs).toEqual([400, 500, 650, 800]);
  });
});
