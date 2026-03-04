/**
 * TASK-154 — Bounty (escape) offer mechanic
 *
 * Covers:
 *   1. OfferManager — getBountyKillMult() returns 3.0 when bounty is active.
 *   2. OfferManager — activate / consume / reset lifecycle.
 *   3. offerDefs — description no longer references impossible re-encounter mechanic.
 *   4. GameScene (structural) — escape handler arms the bounty once per wave.
 *   5. GameScene (structural) — kill handler applies getBountyKillMult() and consumes.
 *   6. GameScene (structural) — _doStartWave() resets bounty state between waves.
 *   7. offerDefs audit — no other offer descriptions reference re-route/re-encounter.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OfferManager }  from '../OfferManager';
import { ALL_OFFERS }    from '../../data/offerDefs';

import gameSceneSrc from '../../scenes/GameScene.ts?raw';
import offerDefsSrc from '../../data/offerDefs.ts?raw';

// ── 1–2. OfferManager unit tests ──────────────────────────────────────────

describe('OfferManager — getBountyKillMult()', () => {
  let om: OfferManager;
  beforeEach(() => { om = new OfferManager(); });

  it('returns 1.0 when bounty is not active', () => {
    expect(om.getBountyKillMult()).toBe(1.0);
  });

  it('returns 1.0 even when offer is active but bounty not yet armed', () => {
    om.applyOffer('bounty-escape');
    expect(om.getBountyKillMult()).toBe(1.0);
  });

  it('returns 3.0 after activateBounty()', () => {
    om.activateBounty();
    expect(om.getBountyKillMult()).toBe(3.0);
  });

  it('returns 1.0 after consumeBounty() clears the active state', () => {
    om.activateBounty();
    om.consumeBounty();
    expect(om.getBountyKillMult()).toBe(1.0);
  });

  it('activate → consume cycle can be repeated (fresh each wave)', () => {
    om.activateBounty();
    expect(om.getBountyKillMult()).toBe(3.0);
    om.consumeBounty();
    expect(om.getBountyKillMult()).toBe(1.0);

    // Second wave — escape happens again.
    om.activateBounty();
    expect(om.getBountyKillMult()).toBe(3.0);
    om.consumeBounty();
    expect(om.getBountyKillMult()).toBe(1.0);
  });

  it('consumeBounty() is idempotent when no bounty is active', () => {
    om.consumeBounty();
    expect(om.isBountyActive()).toBe(false);
  });
});

// ── 3. offerDefs — description is accurate ───────────────────────────────

describe('offerDefs — bounty-escape description', () => {
  const def = ALL_OFFERS.find(o => o.id === 'bounty-escape')!;

  it('bounty-escape offer exists', () => {
    expect(def).toBeDefined();
  });

  it('description does not claim escaped creep is killable', () => {
    // The old text ("dropped on the next kill" referring to the escaped creep) was wrong.
    expect(def.description).not.toContain('escaped creep drops');
    expect(def.description).not.toContain('re-encounter');
    expect(def.description).not.toContain('loop back');
  });

  it('description mentions triple gold', () => {
    expect(def.description).toMatch(/triple/i);
  });

  it('description communicates once-per-wave semantics', () => {
    // Should mention "wave" or "once" so the player knows the limit.
    expect(def.description).toMatch(/wave|once/i);
  });
});

// ── 4. GameScene — escape handler arms bounty (structural) ──────────────

describe('GameScene — creep-escaped handler wires bounty', () => {
  it('calls hasBountyEscape() in the creep-escaped handler', () => {
    expect(gameSceneSrc).toContain("hasBountyEscape()");
  });

  it('calls activateBounty() inside the creep-escaped handler', () => {
    expect(gameSceneSrc).toContain('activateBounty()');
  });

  it('guards with _bountyEscapeArmedThisWave so only the first escape arms it', () => {
    expect(gameSceneSrc).toContain('_bountyEscapeArmedThisWave');
  });

  it('sets _bountyEscapeArmedThisWave = true after arming', () => {
    expect(gameSceneSrc).toContain('_bountyEscapeArmedThisWave = true');
  });
});

// ── 5. GameScene — kill handler applies and consumes bounty (structural) ─

describe('GameScene — creep-killed handler applies getBountyKillMult()', () => {
  it('calls getBountyKillMult() in the creep-killed handler', () => {
    expect(gameSceneSrc).toContain('getBountyKillMult()');
  });

  it('calls consumeBounty() after checking the multiplier', () => {
    expect(gameSceneSrc).toContain('consumeBounty()');
  });

  it('bountyMult is factored into killGold calculation', () => {
    // The kill-gold line should multiply by bountyMult.
    expect(gameSceneSrc).toContain('bountyMult');
    expect(gameSceneSrc).toMatch(/killGold\s*=.*bountyMult/);
  });
});

// ── 6. GameScene — _doStartWave resets bounty state ─────────────────────

describe('GameScene — _doStartWave() resets bounty for new wave', () => {
  it('resets _bountyEscapeArmedThisWave to false in _doStartWave', () => {
    // Must be reset before wave spawning so the bounty can re-arm on first escape.
    const doStartWaveBlock = gameSceneSrc.slice(
      gameSceneSrc.indexOf('private _doStartWave'),
      gameSceneSrc.indexOf('private _doStartWave') + 2000,
    );
    expect(doStartWaveBlock).toContain('_bountyEscapeArmedThisWave = false');
  });

  it('calls consumeBounty() in _doStartWave to clear stale bounties', () => {
    const doStartWaveBlock = gameSceneSrc.slice(
      gameSceneSrc.indexOf('private _doStartWave'),
      gameSceneSrc.indexOf('private _doStartWave') + 2000,
    );
    expect(doStartWaveBlock).toContain('consumeBounty()');
  });
});

// ── 7. offerDefs audit — no impossible re-route mechanics ────────────────

describe('offerDefs audit — no impossible re-route / re-encounter mechanics', () => {
  const impossiblePhrases = [
    'loop back',
    're-route',
    'reroute',
    // "drops ... on the next kill" referring to an escaped creep
  ];

  for (const phrase of impossiblePhrases) {
    it(`no offer description contains "${phrase}"`, () => {
      for (const offer of ALL_OFFERS) {
        expect(offer.description.toLowerCase()).not.toContain(phrase);
      }
    });
  }

  it('bounty-escape old impossible description is gone from offerDefs source', () => {
    expect(offerDefsSrc).not.toContain(
      'The first creep to escape each wave drops triple gold on the next kill',
    );
  });
});
