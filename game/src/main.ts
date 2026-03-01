import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { BetweenWaveScene } from './scenes/BetweenWaveScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#0a0a0a',
  parent: 'game-container',
  scene: [
    BootScene,          // 1. Loads assets, shows progress bar
    MainMenuScene,      // 2. Title screen, start button
    GameScene,          // 3. Core game loop
    BetweenWaveScene,   // 4. Roguelike offer selection (launched on top of GameScene)
    GameOverScene,      // 5. End of run — lives hit 0
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
