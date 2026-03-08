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
import { AchievementsScene } from './scenes/AchievementsScene';
import { CutsceneScene } from './scenes/CutsceneScene';
import { initCapacitorNative } from './capacitor-init';

// Initialise mobile detection early — sets window.__OJIBWE_MOBILE and
// toggles the 'mobile' body class used by CSS.
MobileManager.getInstance();

// Activate native shell features (status bar, splash screen) when running
// inside Capacitor.  No-ops gracefully in a browser.
initCapacitorNative();

// Use higher canvas resolution on retina displays for crisp text rendering.
// Capped at 2× to balance sharpness vs GPU load on mobile.
const DPR = Math.min(window.devicePixelRatio || 1, 2);

// On mobile, widen the game to match the device's screen aspect ratio so the
// canvas fills the entire display with no black bars. On desktop keep 16:9.
const BASE_H = 720;
let GAME_W = 1280;
if (MobileManager.getInstance().isMobile()) {
  // Use max/min so the AR is correct even if the phone reports portrait dims.
  const landscapeW = Math.max(window.innerWidth, window.innerHeight);
  const landscapeH = Math.min(window.innerWidth, window.innerHeight);
  const screenAR = landscapeW / Math.max(landscapeH, 1);
  GAME_W = Math.max(1280, Math.round(BASE_H * screenAR));
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: BASE_H,
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
    AchievementsScene,       // 11. Achievement gallery
    CutsceneScene,           // 12. Cutscene/dialog overlay (launched on top of any scene)
  ],
  input: {
    activePointers: 2,   // Required for pinch-to-zoom on mobile
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: DPR,
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
