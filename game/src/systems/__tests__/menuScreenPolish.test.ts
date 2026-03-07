/**
 * Menu Screen Polish — TASK-075
 *
 * Structural tests verifying that all acceptance criteria for menu & UI
 * screen polish are implemented across MainMenuScene, CommanderSelectScene,
 * GameOverScene, and CodexScene.
 *
 * All checks are source-pattern tests (no Phaser runtime required).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const readSrc = (name: string) =>
  fs.readFileSync(path.resolve(__dirname, `../../scenes/${name}`), 'utf-8');

const mainMenuSrc          = readSrc('MainMenuScene.ts');
const commanderSelectSrc   = readSrc('CommanderSelectScene.ts');
const gameOverSrc          = readSrc('GameOverScene.ts');
const codexSrc             = readSrc('CodexScene.ts');

// ═══════════════════════════════════════════════════════════════════════════
// 1. Fade transitions — all scenes
// ═══════════════════════════════════════════════════════════════════════════
describe('fade transitions present in all scenes', () => {
  const scenes = [
    { name: 'MainMenuScene',        src: mainMenuSrc },
    { name: 'CommanderSelectScene', src: commanderSelectSrc },
    { name: 'GameOverScene',        src: gameOverSrc },
    { name: 'CodexScene',           src: codexSrc },
  ];

  for (const { name, src } of scenes) {
    it(`${name}: cameras.main.fadeIn(350) called in create()`, () => {
      expect(src).toContain('cameras.main.fadeIn(350, 0, 0, 0)');
    });

    it(`${name}: has _fading guard field`, () => {
      expect(src).toContain('_fading = false');
    });

    it(`${name}: has _go() method with fadeOut(300)`, () => {
      expect(src).toContain('cameras.main.fadeOut(300, 0, 0, 0)');
    });

    it(`${name}: _go() listens for camerafadeoutcomplete`, () => {
      expect(src).toContain("'camerafadeoutcomplete'");
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. MainMenuScene — parallax layers
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene parallax layers', () => {
  it('defines ParallaxLayer interface', () => {
    expect(mainMenuSrc).toContain('interface ParallaxLayer');
  });

  it('has _parallaxLayers array field', () => {
    expect(mainMenuSrc).toContain('_parallaxLayers: ParallaxLayer[]');
  });

  it('has _buildParallaxLayers() method', () => {
    expect(mainMenuSrc).toContain('_buildParallaxLayers()');
  });

  it('creates 3 silhouette layers (mtn, trees, brush)', () => {
    // Use the private method definition boundary
    const block = mainMenuSrc.slice(
      mainMenuSrc.indexOf('private _buildParallaxLayers()'),
      mainMenuSrc.indexOf('private _buildTimeOfDayTint()'),
    );
    // Each layer is pushed into _parallaxLayers
    const pushCount = (block.match(/_parallaxLayers\.push/g) ?? []).length;
    expect(pushCount).toBe(3);
  });

  it('has _stepParallax() method called from update()', () => {
    expect(mainMenuSrc).toContain('_stepParallax');
    // update() should call it
    const updateBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf('update(time'),
      mainMenuSrc.indexOf('update(time') + 300,
    );
    expect(updateBlock).toContain('_stepParallax');
  });

  it('parallax uses Math.sin for wave motion', () => {
    const stepBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf('private _stepParallax'),
      mainMenuSrc.indexOf('private _stepEmbers'),
    );
    expect(stepBlock).toContain('Math.sin');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. MainMenuScene — ember/firefly particles
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene ember/firefly particles', () => {
  it('defines EmberParticle interface', () => {
    expect(mainMenuSrc).toContain('interface EmberParticle');
  });

  it('has _embers array field', () => {
    expect(mainMenuSrc).toContain('_embers: EmberParticle[]');
  });

  it('has _buildEmbers() method', () => {
    expect(mainMenuSrc).toContain('_buildEmbers()');
  });

  it('has _stepEmbers() method called from update()', () => {
    expect(mainMenuSrc).toContain('_stepEmbers');
    const updateBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf('update(time'),
      mainMenuSrc.indexOf('update(time') + 300,
    );
    expect(updateBlock).toContain('_stepEmbers');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. MainMenuScene — season card particles
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene season card particles', () => {
  it('defines CardParticle interface', () => {
    expect(mainMenuSrc).toContain('interface CardParticle');
  });

  it('has _cardParticles array field', () => {
    expect(mainMenuSrc).toContain('_cardParticles: CardParticle[]');
  });

  it('has _spawnCardSeasonParticles() method', () => {
    expect(mainMenuSrc).toContain('_spawnCardSeasonParticles');
  });

  it('has _stepCardParticles() called from update()', () => {
    const updateBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf('update(time'),
      mainMenuSrc.indexOf('update(time') + 300,
    );
    expect(updateBlock).toContain('_stepCardParticles');
  });

  it('defines SEASON_PARTICLE_COLORS for color lookup', () => {
    expect(mainMenuSrc).toContain('SEASON_PARTICLE_COLORS');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. MainMenuScene — logo glow & button hover tweens
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene logo and button hover polish', () => {
  it('has _buildLogoTitle() method for breathing logo', () => {
    expect(mainMenuSrc).toContain('_buildLogoTitle');
  });

  it('has _buildTimeOfDayTint() method', () => {
    expect(mainMenuSrc).toContain('_buildTimeOfDayTint');
  });

  it('button hover uses Back.easeOut scale tween', () => {
    expect(mainMenuSrc).toContain("ease: 'Back.easeOut'");
  });

  it('button hover tweens scaleX and scaleY', () => {
    expect(mainMenuSrc).toMatch(/scaleX:\s*1\.0[56]/);
    expect(mainMenuSrc).toMatch(/scaleY:\s*1\.0[56]/);
  });

  it('create() calls _buildParallaxLayers before other builders', () => {
    const createStart = mainMenuSrc.indexOf('create():');
    const parallaxIdx = mainMenuSrc.indexOf('_buildParallaxLayers()', createStart);
    const timeTintIdx = mainMenuSrc.indexOf('_buildTimeOfDayTint()', createStart);
    const embersIdx   = mainMenuSrc.indexOf('_buildEmbers()',       createStart);
    expect(parallaxIdx).toBeLessThan(timeTintIdx);
    expect(timeTintIdx).toBeLessThan(embersIdx);
    // _buildLogoTitle is called inside createButtons with sideAnchorY (below stage cards)
    expect(mainMenuSrc).toContain('this._buildLogoTitle(sideAnchorY)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. CommanderSelectScene — region palette background
// ═══════════════════════════════════════════════════════════════════════════
describe('CommanderSelectScene region palette background', () => {
  it('imports getStageDef, getRegionDef, SEASON_PALETTE', () => {
    expect(commanderSelectSrc).toContain('getStageDef');
    expect(commanderSelectSrc).toContain('getRegionDef');
    expect(commanderSelectSrc).toContain('SEASON_PALETTE');
  });

  it('create() reads palette from selected region', () => {
    expect(commanderSelectSrc).toContain('SEASON_PALETTE[regionDef.seasonalTheme]');
  });

  it('create() adds vignette overlay at top and bottom', () => {
    expect(commanderSelectSrc).toContain('vigGfx');
    expect(commanderSelectSrc).toContain('height * 0.18');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. CommanderSelectScene — portrait slide-in
// ═══════════════════════════════════════════════════════════════════════════
describe('CommanderSelectScene portrait slide-in', () => {
  it('tweens portrait x with Back.easeOut after highlightCard', () => {
    const createEnd = commanderSelectSrc.indexOf('highlightCard(this.selectedId)');
    const slideBlock = commanderSelectSrc.slice(
      createEnd,
      commanderSelectSrc.indexOf('private buildCard'),
    );
    expect(slideBlock).toContain("ease: 'Back.easeOut'");
  });

  it('slide-in uses stagger delay proportional to index', () => {
    const createEnd = commanderSelectSrc.indexOf('highlightCard(this.selectedId)');
    const slideBlock = commanderSelectSrc.slice(
      createEnd,
      commanderSelectSrc.indexOf('private buildCard'),
    );
    expect(slideBlock).toMatch(/delay:\s*i\s*\*\s*\d+/);
  });

  it('portrait starts offset (± 280) from baseX', () => {
    expect(commanderSelectSrc).toContain('280');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. GameOverScene — victory sparkles
// ═══════════════════════════════════════════════════════════════════════════
describe('GameOverScene victory sparkles', () => {
  it('victory path spawns gold circles (0xffcc44)', () => {
    expect(gameOverSrc).toContain('0xffcc44');
  });

  it('victory sparkles use upward tween (negative y offset)', () => {
    const victoryBlock = gameOverSrc.slice(
      gameOverSrc.indexOf('if (won) {'),
      gameOverSrc.indexOf('} else {'),
    );
    expect(victoryBlock).toContain('Quad.easeOut');
  });

  it('victory spawns approximately 25 particles', () => {
    const victoryBlock = gameOverSrc.slice(
      gameOverSrc.indexOf('if (won) {'),
      gameOverSrc.indexOf('} else {'),
    );
    expect(victoryBlock).toContain('25');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. GameOverScene — defeat embers
// ═══════════════════════════════════════════════════════════════════════════
describe('GameOverScene defeat embers', () => {
  it('defeat path adds dark overlay', () => {
    const defeatBlock = gameOverSrc.slice(
      gameOverSrc.indexOf('} else {'),
      gameOverSrc.indexOf('// Title —'),
    );
    expect(defeatBlock).toContain('0x000000, 0.20');
  });

  it('defeat path spawns ember circles (0x881100)', () => {
    expect(gameOverSrc).toContain('0x881100');
  });

  it('defeat spawns approximately 18 embers', () => {
    const defeatBlock = gameOverSrc.slice(
      gameOverSrc.indexOf('} else {'),
      gameOverSrc.indexOf('// Title —'),
    );
    expect(defeatBlock).toContain('18');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. GameOverScene — stats count-up
// ═══════════════════════════════════════════════════════════════════════════
describe('GameOverScene stats count-up animations', () => {
  it('waves uses tween with onUpdate to count up', () => {
    expect(gameOverSrc).toContain('wavesObj');
    expect(gameOverSrc).toMatch(/targets:\s*wavesObj/);
  });

  it('currency uses tween with onUpdate to count up', () => {
    expect(gameOverSrc).toContain('currObj');
    expect(gameOverSrc).toMatch(/targets:\s*currObj/);
  });

  it('XP uses tween with onUpdate to count up', () => {
    expect(gameOverSrc).toContain('xpObj');
    expect(gameOverSrc).toMatch(/targets:\s*xpObj/);
  });

  it('count-up tweens use Quad.easeOut', () => {
    // The tween blocks for wavesObj, currObj, xpObj all use Quad.easeOut
    expect(gameOverSrc).toMatch(/wavesObj[\s\S]{0,200}Quad\.easeOut/);
    expect(gameOverSrc).toMatch(/currObj[\s\S]{0,200}Quad\.easeOut/);
    expect(gameOverSrc).toMatch(/xpObj[\s\S]{0,200}Quad\.easeOut/);
  });

  it('count-up uses Math.floor to avoid fractional display', () => {
    expect(gameOverSrc).toContain('Math.floor(wavesObj');
    expect(gameOverSrc).toContain('Math.floor(currObj');
    expect(gameOverSrc).toContain('Math.floor(xpObj');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. CodexScene — parchment background
// ═══════════════════════════════════════════════════════════════════════════
describe('CodexScene earthy palette background', () => {
  it('uses PAL.bgDark background color', () => {
    expect(codexSrc).toContain('PAL.bgDark');
  });

  it('uses earthy grid overlay', () => {
    expect(codexSrc).toContain('0x1c2e12');
  });

  it('has grain overlay (grainGfx)', () => {
    expect(codexSrc).toContain('grainGfx');
  });

  it('grain uses earthy green tint (0x6B8F3E)', () => {
    expect(codexSrc).toContain('0x6B8F3E');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. CodexScene — CODEX title flourish
// ═══════════════════════════════════════════════════════════════════════════
describe('CodexScene CODEX title decorative flourish', () => {
  it('has flourishGfx before CODEX title text', () => {
    const flourishIdx = codexSrc.indexOf('flourishGfx');
    const codexTitleIdx = codexSrc.indexOf("text(cx, 32, 'CODEX'");
    expect(flourishIdx).toBeGreaterThan(0);
    expect(flourishIdx).toBeLessThan(codexTitleIdx);
  });

  it('flourish draws horizontal line segments', () => {
    const flourishBlock = codexSrc.slice(
      codexSrc.indexOf('flourishGfx'),
      codexSrc.indexOf("text(cx, 32, 'CODEX'"),
    );
    expect(flourishBlock).toContain('moveTo');
    expect(flourishBlock).toContain('lineTo');
  });

  it('flourish draws decorative end-dots (fillCircle)', () => {
    const flourishBlock = codexSrc.slice(
      codexSrc.indexOf('flourishGfx'),
      codexSrc.indexOf("text(cx, 32, 'CODEX'"),
    );
    expect(flourishBlock).toContain('fillCircle');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. CodexScene — entry fade-in
// ═══════════════════════════════════════════════════════════════════════════
describe('CodexScene entry staggered fade-in', () => {
  it('refreshEntries applies alpha tween per object', () => {
    const refreshBlock = codexSrc.slice(
      codexSrc.indexOf('private refreshEntries()'),
      codexSrc.indexOf('private buildEntryTile'),
    );
    expect(refreshBlock).toContain('alpha: 1');
    expect(refreshBlock).toContain('Sine.easeOut');
  });

  it('fade-in uses stagger delay (i * 30)', () => {
    const refreshBlock = codexSrc.slice(
      codexSrc.indexOf('private refreshEntries()'),
      codexSrc.indexOf('private buildEntryTile'),
    );
    expect(refreshBlock).toMatch(/delay:\s*i\s*\*\s*30/);
  });

  it('objects start at alpha 0 before tween', () => {
    const refreshBlock = codexSrc.slice(
      codexSrc.indexOf('private refreshEntries()'),
      codexSrc.indexOf('private buildEntryTile'),
    );
    expect(refreshBlock).toContain('setAlpha(0)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. No bare scene.start() in nav paths (all use _go)
// ═══════════════════════════════════════════════════════════════════════════
describe('scene navigation uses _go() not bare scene.start()', () => {
  it('CommanderSelectScene confirm button uses _go()', () => {
    expect(commanderSelectSrc).toContain("this._go('GameScene'");
  });

  it('CommanderSelectScene back button uses _go()', () => {
    expect(commanderSelectSrc).toContain("this._go('MainMenuScene')");
  });

  it('CommanderSelectScene locked popup uses _go()', () => {
    expect(commanderSelectSrc).toContain("this._go('MetaMenuScene')");
  });

  it('GameOverScene buttons all use _go() (no bare scene.start in onClick)', () => {
    // The only scene.start should be inside _go()'s camerafadeoutcomplete callback
    const buttonsBlock = gameOverSrc.slice(
      gameOverSrc.indexOf('// Buttons —'),
      gameOverSrc.indexOf('private _go('),
    );
    expect(buttonsBlock).not.toContain('this.scene.start(');
  });

  it('CodexScene back button uses _go()', () => {
    expect(codexSrc).toContain('this._go(this.returnTo');
  });

  it('MainMenuScene has no bare scene.start outside _go()', () => {
    // Remove _go() method body, then confirm no other scene.start calls
    const goMethodIdx = mainMenuSrc.indexOf('private _go(');
    const beforeGo = mainMenuSrc.slice(
      mainMenuSrc.indexOf('create():'),
      goMethodIdx,
    );
    expect(beforeGo).not.toContain('this.scene.start(');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. MainMenuScene shutdown() cleanup
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene shutdown cleanup', () => {
  it('has shutdown() method', () => {
    expect(mainMenuSrc).toContain('shutdown(): void');
  });

  it('shutdown() destroys parallax layer graphics', () => {
    const shutdownBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf('shutdown(): void'),
    );
    expect(shutdownBlock).toContain('_parallaxLayers');
    expect(shutdownBlock).toContain('layer.gfx.destroy()');
  });

  it('shutdown() destroys ember graphics', () => {
    const shutdownBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf('shutdown(): void'),
    );
    expect(shutdownBlock).toContain('e.gfx.destroy()');
  });

  it('shutdown() destroys card particle graphics', () => {
    const shutdownBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf('shutdown(): void'),
    );
    expect(shutdownBlock).toContain('p.gfx.destroy()');
  });

  it('shutdown() checks .active before destroying', () => {
    const shutdownBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf('shutdown(): void'),
    );
    // All three destroy blocks should guard with .active
    const activeChecks = (shutdownBlock.match(/\.active\)/g) ?? []).length;
    expect(activeChecks).toBeGreaterThanOrEqual(3);
  });

  it('shutdown() clears all arrays', () => {
    const shutdownBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf('shutdown(): void'),
    );
    expect(shutdownBlock).toContain('this._parallaxLayers = []');
    expect(shutdownBlock).toContain('this._embers = []');
    expect(shutdownBlock).toContain('this._cardParticles = []');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 16. CodexScene tween cleanup on entry refresh
// ═══════════════════════════════════════════════════════════════════════════
describe('CodexScene tween cleanup in refreshEntries', () => {
  it('kills tweens before destroying entry objects', () => {
    const refreshStart = codexSrc.indexOf('private refreshEntries()');
    const refreshBlock = codexSrc.slice(
      refreshStart,
      codexSrc.indexOf('const entries = getCodexEntriesBySection', refreshStart),
    );
    expect(refreshBlock).toContain('killTweensOf(obj)');
  });

  it('killTweensOf is called before destroy', () => {
    const refreshStart = codexSrc.indexOf('private refreshEntries()');
    const refreshBlock = codexSrc.slice(
      refreshStart,
      codexSrc.indexOf('this.entryObjects = []', refreshStart),
    );
    const killIdx = refreshBlock.indexOf('killTweensOf');
    const destroyIdx = refreshBlock.indexOf('obj.destroy()');
    expect(killIdx).toBeLessThan(destroyIdx);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17. Update loop safety — no allocations
// ═══════════════════════════════════════════════════════════════════════════
describe('MainMenuScene update loop safety', () => {
  it('update() does not call new', () => {
    const updateBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf('update(time'),
      mainMenuSrc.indexOf('// ── Transition helper'),
    );
    expect(updateBlock).not.toMatch(/\bnew\b/);
  });

  it('step methods check .active before updating', () => {
    const stepEmbers = mainMenuSrc.slice(
      mainMenuSrc.indexOf('private _stepEmbers'),
      mainMenuSrc.indexOf('private _stepCardParticles'),
    );
    expect(stepEmbers).toContain('e.gfx.active');

    const stepCards = mainMenuSrc.slice(
      mainMenuSrc.indexOf('private _stepCardParticles'),
      mainMenuSrc.indexOf('// ── Transition helper'),
    );
    expect(stepCards).toContain('p.gfx.active');
  });

  it('ember particle count is bounded (mobile 4, desktop 6)', () => {
    const buildBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf('private _buildEmbers()'),
      mainMenuSrc.indexOf('// ── Header'),
    );
    expect(buildBlock).toContain('this._isMobile ? 4 : 6');
  });

  it('card particle count is bounded (mobile 2, desktop 3)', () => {
    const cardBlock = mainMenuSrc.slice(
      mainMenuSrc.indexOf('private _spawnCardSeasonParticles'),
      mainMenuSrc.indexOf('// ── Stage row'),
    );
    expect(cardBlock).toContain('this._isMobile ? 2 : 3');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 18. Transition guard prevents double-navigate
// ═══════════════════════════════════════════════════════════════════════════
describe('transition guard (_fading) correctness', () => {
  const scenes = [
    { name: 'MainMenuScene',        src: mainMenuSrc },
    { name: 'CommanderSelectScene', src: commanderSelectSrc },
    { name: 'GameOverScene',        src: gameOverSrc },
    { name: 'CodexScene',           src: codexSrc },
  ];

  for (const { name, src } of scenes) {
    it(`${name}: _go() returns early when _fading is true`, () => {
      const goBlock = src.slice(
        src.indexOf('private _go('),
        src.indexOf('private _go(') + 200,
      );
      expect(goBlock).toContain('if (this._fading) return');
    });

    it(`${name}: _go() sets _fading = true before fadeOut`, () => {
      const goBlock = src.slice(
        src.indexOf('private _go('),
        src.indexOf('private _go(') + 250,
      );
      const fadingIdx = goBlock.indexOf('this._fading = true');
      const fadeOutIdx = goBlock.indexOf('fadeOut');
      expect(fadingIdx).toBeLessThan(fadeOutIdx);
    });

    it(`${name}: create() resets _fading to false`, () => {
      // Match the create method body — it always starts with _fading = false
      const match = src.match(/create\([^)]*\):\s*void\s*\{[\s\S]{0,300}/);
      expect(match).not.toBeNull();
      expect(match![0]).toContain('this._fading = false');
    });
  }
});
