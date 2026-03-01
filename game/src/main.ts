import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CommanderSelectScene } from './scenes/CommanderSelectScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { BetweenWaveScene } from './scenes/BetweenWaveScene';
import { MetaMenuScene } from './scenes/MetaMenuScene';
import { CodexScene } from './scenes/CodexScene';

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
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
