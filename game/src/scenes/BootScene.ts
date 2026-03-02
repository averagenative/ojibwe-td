import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';

// All audio keys loaded via Phaser loader. Missing files are silently skipped
// (Phaser logs a warning but does not crash). AudioManager falls back to
// procedural synthesis for any key whose buffer was not registered.
const AUDIO_LOAD_DEFS: ReadonlyArray<[key: string, path: string]> = [
  // SFX
  ['sfx-tower-place',    'assets/audio/sfx/tower-place.mp3'],
  ['sfx-cannon',         'assets/audio/sfx/cannon-fire.mp3'],
  ['sfx-frost',          'assets/audio/sfx/frost-fire.mp3'],
  ['sfx-tesla',          'assets/audio/sfx/tesla-fire.mp3'],
  ['sfx-mortar',         'assets/audio/sfx/mortar-fire.mp3'],
  ['sfx-poison',         'assets/audio/sfx/poison-fire.mp3'],
  ['sfx-aura',           'assets/audio/sfx/aura-hum.mp3'],
  ['sfx-creep-death-01', 'assets/audio/sfx/creep-death-01.mp3'],
  ['sfx-creep-death-02', 'assets/audio/sfx/creep-death-02.mp3'],
  ['sfx-creep-death-03', 'assets/audio/sfx/creep-death-03.mp3'],
  ['sfx-creep-escape',   'assets/audio/sfx/creep-escape.mp3'],
  ['sfx-wave-complete',  'assets/audio/sfx/wave-complete.mp3'],
  ['sfx-boss-death',     'assets/audio/sfx/boss-death.mp3'],
  ['sfx-victory',        'assets/audio/sfx/victory-fanfare.mp3'],
  ['sfx-game-over',      'assets/audio/sfx/game-over.mp3'],
  ['sfx-ui-click',       'assets/audio/sfx/ui-click.mp3'],
  // Music tracks
  ['music-menu',         'assets/audio/music/menu-theme.mp3'],
  ['music-gameplay',     'assets/audio/music/gameplay-calm.mp3'],
  ['music-intense',      'assets/audio/music/gameplay-intense.mp3'],
  ['music-victory',      'assets/audio/music/victory.mp3'],
  ['music-gameover',     'assets/audio/music/gameover.mp3'],
] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingBar();
    this.loadAssets();
  }

  create(): void {
    this._bridgeAudioToManager();
    this.scene.start('MainMenuScene');
  }

  private createLoadingBar(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.add.text(cx, cy - 60, 'Ojibwe TD', {
      fontSize: '48px',
      color: '#00ff44',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 20, 'Loading...', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Background bar
    const barBg = this.add.rectangle(cx, cy + 20, 400, 20, 0x333333).setOrigin(0.5);

    // Progress bar (grows right from left edge of barBg)
    const barX = barBg.x - 200;
    const bar = this.add.rectangle(barX, cy + 20, 0, 16, 0x00ff44).setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      bar.width = 400 * value;
    });
  }

  private loadAssets(): void {
    // Audio files — loaded optimistically. Missing files are skipped gracefully;
    // AudioManager falls back to procedural synthesis for any unregistered key.
    for (const [key, path] of AUDIO_LOAD_DEFS) {
      this.load.audio(key, path);
    }

    // Logo (preloaded for optional in-scene use, e.g. loading watermark)
    this.load.image('logo', 'assets/ui/logo.png');

    // Tower icons (original art generated for Ojibwe TD)
    this.load.image('icon-cannon',  'assets/icons/icon-cannon.png');
    this.load.image('icon-frost',   'assets/icons/icon-frost.png');
    this.load.image('icon-mortar',  'assets/icons/icon-mortar.png');
    this.load.image('icon-poison',  'assets/icons/icon-poison.png');
    this.load.image('icon-tesla',   'assets/icons/icon-tesla.png');
    this.load.image('icon-aura',    'assets/icons/icon-aura.png');

    // Misc UI icons
    this.load.image('icon-dice',    'assets/icons/icon-dice.png');
    this.load.image('icon-mystery', 'assets/icons/icon-mystery.png');

    // Commander portraits (96×96)
    this.load.image('portrait-nokomis',     'assets/portraits/portrait-nokomis.png');
    this.load.image('portrait-makoons',     'assets/portraits/portrait-makoons.png');
    this.load.image('portrait-waabizii',    'assets/portraits/portrait-waabizii.png');
    this.load.image('portrait-bizhiw',      'assets/portraits/portrait-bizhiw.png');
    this.load.image('portrait-animikiikaa', 'assets/portraits/portrait-animikiikaa.png');

    // Creep sprites (48×48)
    this.load.image('creep-normal',    'assets/sprites/creep-normal.png');
    this.load.image('creep-fast',      'assets/sprites/creep-fast.png');
    this.load.image('creep-armored',   'assets/sprites/creep-armored.png');
    this.load.image('creep-immune',    'assets/sprites/creep-immune.png');
    this.load.image('creep-regen',     'assets/sprites/creep-regen.png');
    this.load.image('creep-flying',    'assets/sprites/creep-flying.png');
    this.load.image('creep-boss',      'assets/sprites/creep-boss.png');
    this.load.image('creep-boss-mini', 'assets/sprites/creep-boss-mini.png');

    // Map tiles (64×64)
    this.load.image('tile-tree',  'assets/tiles/tile-tree.png');
    this.load.image('tile-brush', 'assets/tiles/tile-brush.png');
    this.load.image('tile-rock',  'assets/tiles/tile-rock.png');
    this.load.image('tile-water', 'assets/tiles/tile-water.png');
  }

  /**
   * After Phaser's loader completes, pass any successfully loaded audio
   * ArrayBuffers to AudioManager for pre-decoding. Keys not present in the
   * cache (missing files) are silently skipped — AudioManager procedural
   * synthesis remains the fallback for those events.
   *
   * Phaser stores audio as ArrayBuffer in WebAudio mode; this is checked at
   * runtime so the method is safe to call in any Phaser audio backend mode.
   */
  private _bridgeAudioToManager(): void {
    const am = AudioManager.getInstance();
    for (const [key] of AUDIO_LOAD_DEFS) {
      const data: unknown = this.cache.audio.get(key);
      if (data instanceof ArrayBuffer) {
        void am.registerBuffer(key, data);
      }
    }
  }
}
