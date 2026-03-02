import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingBar();
    this.loadAssets();
  }

  create(): void {
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

    // Ground creep sprites (48×48) — refreshed animal-inspired silhouettes
    this.load.image('creep-normal',  'assets/sprites/creep-normal.png');
    this.load.image('creep-fast',    'assets/sprites/creep-fast.png');
    this.load.image('creep-armored', 'assets/sprites/creep-armored.png');
    this.load.image('creep-immune',  'assets/sprites/creep-immune.png');
    this.load.image('creep-regen',   'assets/sprites/creep-regen.png');

    // Air creep sprites — distinct bird silhouettes per subtype
    this.load.image('creep-air-basic',   'assets/sprites/creep-air-basic.png');
    this.load.image('creep-air-scout',   'assets/sprites/creep-air-scout.png');
    this.load.image('creep-air-armored', 'assets/sprites/creep-air-armored.png');

    // Boss sprites — unique animal portraits (Ojibwe TD bosses)
    this.load.image('boss-makwa',        'assets/sprites/boss-makwa.png');
    this.load.image('boss-migizi',       'assets/sprites/boss-migizi.png');
    this.load.image('boss-waabooz',      'assets/sprites/boss-waabooz.png');
    this.load.image('boss-animikiins',   'assets/sprites/boss-animikiins.png');
    this.load.image('boss-waabooz-mini', 'assets/sprites/boss-waabooz-mini.png');

    // Map tiles (64×64)
    this.load.image('tile-tree',  'assets/tiles/tile-tree.png');
    this.load.image('tile-brush', 'assets/tiles/tile-brush.png');
    this.load.image('tile-rock',  'assets/tiles/tile-rock.png');
    this.load.image('tile-water', 'assets/tiles/tile-water.png');
  }
}
