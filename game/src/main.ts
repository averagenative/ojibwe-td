import Phaser from 'phaser';
import { MobileManager } from './systems/MobileManager';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CommanderSelectScene } from './scenes/CommanderSelectScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { BetweenWaveScene } from './scenes/BetweenWaveScene';
import { MetaMenuScene } from './scenes/MetaMenuScene';
import { CodexScene } from './scenes/CodexScene';
import { InventoryScene } from './scenes/InventoryScene';
import { ChallengeSelectScene } from './scenes/ChallengeSelectScene';
import { TowerEquipScene } from './scenes/TowerEquipScene';

// Initialise mobile detection early — sets window.__OJIBWE_MOBILE and
// toggles the 'mobile' body class used by CSS.
MobileManager.getInstance();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#0d1208',
  parent: 'game-container',
  scene: [
    BootScene,          // 1. Loads assets, shows progress bar
    MainMenuScene,           // 2. Title screen + map selection
    CommanderSelectScene,    // 3. Commander selection (pre-run)
    GameScene,               // 4. Core game loop
    BetweenWaveScene,   // 4. Roguelike offer selection (launched on top of GameScene)
    GameOverScene,      // 5. End of run — lives hit 0
    MetaMenuScene,      // 6. Meta-progression unlocks (currency + unlock tree)
    CodexScene,         // 7. Lore codex browser (accessible from menus)
    InventoryScene,          // 8. Gear inventory browser
    ChallengeSelectScene,    // 9. Challenge map selection
    TowerEquipScene,         // 10. Tower gear equip screen
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Explicit FPS target — prefer requestAnimationFrame over setTimeout.
  // forceSetTimeOut: false is already the Phaser default; stated explicitly
  // so the intent is clear and auditable.
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
};

const game = new Phaser.Game(config);

// ── Background-tab throttle (global) ──────────────────────────────────────────
// When the browser tab is hidden the game loop sleeps (stops RAF) to avoid
// wasting CPU/battery.  Phaser's TimeStep clamps the delta on the first frame
// after wake, so gameplay does not jump forward.
// Registered once at the global level so it covers all scenes (menus,
// between-wave, game-over, gameplay) without duplicating the logic.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.loop.sleep();
  } else {
    game.loop.wake();
  }
});
