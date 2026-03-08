import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { MobileManager } from '../systems/MobileManager';
import { PAL } from '../ui/palette';


// SFX audio keys — loaded only when the mp3 files actually exist.
// AudioManager falls back to procedural synthesis for any unregistered key,
// so missing SFX are silent (not broken). When SFX mp3s are added to
// public/assets/audio/sfx/, uncomment the corresponding entry here.
const AUDIO_LOAD_DEFS: ReadonlyArray<[key: string, path: string]> = [
  // Tower fire SFX (ElevenLabs-generated)
  ['sfx-arrow-fire',       'assets/audio/sfx-arrow-fire.mp3'],
  ['sfx-rock-hurler-fire', 'assets/audio/sfx-rock-fire.mp3'],
  ['sfx-frost-fire',       'assets/audio/sfx-frost-fire.mp3'],
  ['sfx-poison-fire',      'assets/audio/sfx-poison-fire.mp3'],
  ['sfx-tesla-fire',       'assets/audio/sfx-tesla-fire.mp3'],
  // Tower hit / impact SFX
  ['sfx-arrow-hit',        'assets/audio/sfx-arrow-hit.mp3'],
  ['sfx-rock-hurler-hit',  'assets/audio/sfx-rock-hit.mp3'],
  ['sfx-frost-hit',        'assets/audio/sfx-frost-hit.mp3'],
  ['sfx-poison-hit',       'assets/audio/sfx-poison-hit.mp3'],
  ['sfx-tesla-hit',        'assets/audio/sfx-tesla-hit.mp3'],
  // Remaining SFX — uncomment as mp3s are added:
  // ['sfx-tower-place',    'assets/audio/sfx/tower-place.mp3'],
  // ['sfx-aura',           'assets/audio/sfx/aura-hum.mp3'],
  // ['sfx-creep-death-01', 'assets/audio/sfx/creep-death-01.mp3'],
  // ['sfx-creep-death-02', 'assets/audio/sfx/creep-death-02.mp3'],
  // ['sfx-creep-death-03', 'assets/audio/sfx/creep-death-03.mp3'],
  // ['sfx-creep-escape',   'assets/audio/sfx/creep-escape.mp3'],
  // ['sfx-wave-complete',  'assets/audio/sfx/wave-complete.mp3'],
  // ['sfx-boss-death',     'assets/audio/sfx/boss-death.mp3'],
  // ['sfx-victory',        'assets/audio/sfx/victory-fanfare.mp3'],
  // ['sfx-game-over',      'assets/audio/sfx/game-over.mp3'],
  // ['sfx-ui-click',       'assets/audio/sfx/ui-click.mp3'],
] as const;

/** Music tracks with two variants each. Randomly picks one per session. */
const MUSIC_VARIANT_DEFS: ReadonlyArray<[key: string, basePath: string]> = [
  ['music-menu',     'assets/audio/music/menu-theme'],
  ['music-gameplay', 'assets/audio/music/gameplay-calm'],
  ['music-intense',  'assets/audio/music/gameplay-intense'],
  ['music-victory',  'assets/audio/music/victory'],
  ['music-gameover', 'assets/audio/music/gameover'],
];

function pickVariant(basePath: string): string {
  const variant = Math.random() < 0.5 ? '_001' : '_002';
  return `${basePath}${variant}.mp3`;
}

export class BootScene extends Phaser.Scene {
  /** Objects created during loading phase — destroyed when splash shows. */
  private _loadingObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this._createLoadingBar();
    this._loadAssets();
  }

  create(): void {
    this._bridgeAudioToManager();

    // Destroy all loading-phase visuals before building the splash.
    for (const obj of this._loadingObjects) obj.destroy();
    this._loadingObjects = [];

    this._showSplash();
  }

  // ── Loading phase ──────────────────────────────────────────────────────────

  private _createLoadingBar(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Dark background (matches game palette)
    this._loadingObjects.push(
      this.add.rectangle(cx, cy, width, height, PAL.bgDark),
    );

    this._loadingObjects.push(
      this.add.text(cx, cy - 30, 'Loading...', {
        fontSize: '18px',
        color: PAL.textDim,
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5),
    );

    // Progress bar
    const barBg = this.add.rectangle(cx, cy + 10, 300, 12, 0x1a2a10).setOrigin(0.5);
    this._loadingObjects.push(barBg);

    const barX = barBg.x - 150;
    const bar = this.add.rectangle(barX, cy + 10, 0, 8, PAL.accentGreenN).setOrigin(0, 0.5);
    this._loadingObjects.push(bar);

    this.load.on('progress', (value: number) => {
      bar.width = 300 * value;
    });
  }

  // ── Splash screen ──────────────────────────────────────────────────────────

  private _showSplash(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const mob = MobileManager.getInstance().isMobile();

    // Full-screen dark background
    this.add.rectangle(cx, height / 2, width, height, PAL.bgDark);

    // Relative layout: all positions derived from screen height.
    // The vertical stack is: logo → gap → title → gap → subtitle → gap → button.
    // Logo centre sits at 30% of screen height; everything else flows below.
    const logoScale = Math.min(mob ? 0.35 : 0.22, height * 0.0004);
    const logoY = height * 0.30;
    let logo: Phaser.GameObjects.Image | null = null;
    if (this.textures.exists('logo')) {
      logo = this.add.image(cx, logoY, 'logo').setScale(logoScale);
    }

    // Compute the bottom edge of the logo to anchor text below it.
    const logoHalfH = logo ? (logo.height * logoScale) / 2 : 0;
    const gap = height * 0.04; // 4% of screen height between elements

    // Title text below logo
    const titleY = logoY + logoHalfH + gap;
    const titleSize = Math.max(18, Math.round(height * (mob ? 0.07 : 0.044)));
    this.add.text(cx, titleY, 'Ojibwe TD', {
      fontSize: `${titleSize}px`,
      color: PAL.textPrimary,
      fontFamily: PAL.fontTitle,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle below title
    const subSize = Math.max(10, Math.round(titleSize * 0.48));
    const subtitleY = titleY + titleSize + gap * 0.5;
    this.add.text(cx, subtitleY, 'A Tower Defense Game', {
      fontSize: `${subSize}px`,
      color: PAL.textDim,
      fontFamily: PAL.fontBody,
    }).setOrigin(0.5);

    // PLAY button — below the subtitle, rounded on mobile
    const btnW = mob ? Math.min(320, width * 0.35) : 180;
    const btnH = mob ? Math.min(80, height * 0.11) : 50;
    const btnY = subtitleY + subSize + gap * 2;
    const btnR = mob ? 20 : 0;

    // Use Graphics for rounded rect on mobile, plain rect on desktop
    const btnGfx = this.add.graphics().setDepth(0);
    const drawBtn = (fill: number) => {
      btnGfx.clear();
      btnGfx.fillStyle(fill, 1);
      if (btnR > 0) {
        btnGfx.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, btnR);
        btnGfx.lineStyle(2, PAL.borderActive, 1);
        btnGfx.strokeRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, btnR);
      } else {
        btnGfx.fillRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
        btnGfx.lineStyle(2, PAL.borderActive, 1);
        btnGfx.strokeRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
      }
    };
    drawBtn(PAL.bgStartBtn);

    // Invisible hit zone over the button graphics
    const btnBg = this.add.zone(cx, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true });

    const btnFontSize = Math.max(16, Math.round(btnH * 0.5));
    const btnText = this.add.text(cx, btnY, 'PLAY', {
      fontSize: `${btnFontSize}px`,
      color: PAL.textPrimary,
      fontFamily: PAL.fontTitle,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => {
      drawBtn(PAL.bgStartBtnHover);
      btnText.setColor(PAL.accentGreen);
    });
    btnBg.on('pointerout', () => {
      drawBtn(PAL.bgStartBtn);
      btnText.setColor(PAL.textPrimary);
    });
    btnBg.on('pointerdown', () => {
      drawBtn(PAL.bgStartBtnPress);
    });

    // Click → enable audio, enter main menu.
    // Uses 'pointerup' even on mobile: iOS WKWebView requires a completed
    // tap gesture (not just pointerdown) to unlock the WebAudio context.
    btnBg.on('pointerup', () => {
      AudioManager.getInstance().startMusicTrack('music-menu');
      this.scene.start('MainMenuScene');
    });

    // Gentle alpha pulse on the button text (avoids sub-pixel rendering artifacts)
    this.tweens.add({
      targets: btnText,
      alpha: { from: 1.0, to: 0.6 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ── Asset loading ──────────────────────────────────────────────────────────

  private _loadAssets(): void {
    for (const [key, path] of AUDIO_LOAD_DEFS) {
      this.load.audio(key, path);
    }
    for (const [key, basePath] of MUSIC_VARIANT_DEFS) {
      this.load.audio(key, pickVariant(basePath));
    }

    this.load.image('logo', 'assets/ui/logo.png');

    // Tower icons
    this.load.image('icon-rock-hurler', 'assets/icons/icon-rock-hurler.png');
    this.load.image('icon-frost',       'assets/icons/icon-frost.png');
    this.load.image('icon-poison',      'assets/icons/icon-poison.png');
    this.load.image('icon-tesla',       'assets/icons/icon-tesla.png');
    this.load.image('icon-aura',        'assets/icons/icon-aura.png');
    this.load.image('icon-arrow',       'assets/icons/icon-arrow.png');

    // Misc UI icons
    this.load.image('icon-dice',    'assets/icons/icon-dice.png');
    this.load.image('icon-mystery', 'assets/icons/icon-mystery.png');

    // Gear type icons (64×64 SVG — one per gear slot)
    this.load.image('gear-barrel-mod',      'assets/icons/gear-barrel-mod.svg');
    this.load.image('gear-crystal-core',    'assets/icons/gear-crystal-core.svg');
    this.load.image('gear-coil-amplifier',  'assets/icons/gear-coil-amplifier.svg');
    this.load.image('gear-shell-casing',    'assets/icons/gear-shell-casing.svg');
    this.load.image('gear-venom-gland',     'assets/icons/gear-venom-gland.svg');
    this.load.image('gear-spirit-totem',    'assets/icons/gear-spirit-totem.svg');
    this.load.image('gear-arrow-fletching', 'assets/icons/gear-arrow-fletching.svg');
    this.load.image('gear-universal-charm', 'assets/icons/gear-universal-charm.svg');

    // Commander portraits (96x96)
    this.load.image('portrait-nokomis',     'assets/portraits/portrait-nokomis.png');
    this.load.image('portrait-makoons',     'assets/portraits/portrait-makoons.png');
    this.load.image('portrait-waabizii',    'assets/portraits/portrait-waabizii.png');
    this.load.image('portrait-bizhiw',      'assets/portraits/portrait-bizhiw.png');
    this.load.image('portrait-animikiikaa', 'assets/portraits/portrait-animikiikaa.png');
    this.load.image('portrait-oshkaabewis', 'assets/portraits/portrait-oshkaabewis.png');

    // Elder portraits (96x96) — narrative speakers in vignettes
    this.load.image('elder-mishoomis',         'assets/portraits/elder-mishoomis.png');
    this.load.image('elder-mishoomis-proud',   'assets/portraits/elder-mishoomis-proud.png');
    this.load.image('elder-nokomis',           'assets/portraits/elder-nokomis.png');
    this.load.image('elder-nokomis-teaching',  'assets/portraits/elder-nokomis-teaching.png');
    this.load.image('elder-ogichidaa',         'assets/portraits/elder-ogichidaa.png');
    this.load.image('elder-ogichidaa-fierce',  'assets/portraits/elder-ogichidaa-fierce.png');
    this.load.image('scout',                   'assets/portraits/scout.png');

    // Ground creep sprites (48x48)
    this.load.image('creep-normal',  'assets/sprites/creep-normal.png');
    this.load.image('creep-fast',    'assets/sprites/creep-fast.png');
    this.load.image('creep-armored', 'assets/sprites/creep-armored.png');
    this.load.image('creep-immune',  'assets/sprites/creep-immune.png');
    this.load.image('creep-regen',   'assets/sprites/creep-regen.png');

    // Air creep sprites
    this.load.image('creep-air-basic',   'assets/sprites/creep-air-basic.png');
    this.load.image('creep-air-scout',   'assets/sprites/creep-air-scout.png');
    this.load.image('creep-air-armored', 'assets/sprites/creep-air-armored.png');

    // Boss sprites
    this.load.image('boss-makwa',        'assets/sprites/boss-makwa.png');
    this.load.image('boss-migizi',       'assets/sprites/boss-migizi.png');
    this.load.image('boss-waabooz',      'assets/sprites/boss-waabooz.png');
    this.load.image('boss-animikiins',   'assets/sprites/boss-animikiins.png');
    this.load.image('boss-waabooz-mini', 'assets/sprites/boss-waabooz-mini.png');

    // Map tiles (64x64)
    this.load.image('tile-tree',  'assets/tiles/tile-tree.png');
    this.load.image('tile-brush', 'assets/tiles/tile-brush.png');
    this.load.image('tile-rock',  'assets/tiles/tile-rock.png');
    this.load.image('tile-water',   'assets/tiles/tile-water.png');
    this.load.image('tile-scenery', 'assets/tiles/tile-scenery.png');

    // Teaching codex icons (32x32)
    this.load.image('teaching-balance',   'assets/icons/teaching-balance.png');
    this.load.image('teaching-fire',      'assets/icons/teaching-fire.png');
    this.load.image('teaching-seasons',   'assets/icons/teaching-seasons.png');
    this.load.image('teaching-listening', 'assets/icons/teaching-listening.png');
    this.load.image('teaching-medicine',  'assets/icons/teaching-medicine.png');
    this.load.image('teaching-harmony',   'assets/icons/teaching-harmony.png');
    this.load.image('teaching-grief',     'assets/icons/teaching-grief.png');
    this.load.image('teaching-controlled-burns', 'assets/icons/teaching-controlled-burns.png');
    this.load.image('teaching-oak-resilience',   'assets/icons/teaching-oak-resilience.png');
    this.load.image('teaching-ice-fishing',      'assets/icons/teaching-ice-fishing.png');
    this.load.image('teaching-winter-rest',      'assets/icons/teaching-winter-rest.png');
    this.load.image('teaching-earth-wound',      'assets/icons/teaching-earth-wound.png');

    // Projectile sprites (32x32) — replace procedural Graphics during flight
    this.load.image('proj-arrow',  'assets/projectiles/proj-arrow.png');
    this.load.image('proj-rock',   'assets/projectiles/proj-rock.png');
    this.load.image('proj-frost',  'assets/projectiles/proj-frost.png');
    this.load.image('proj-poison', 'assets/projectiles/proj-poison.png');

    // Rubble effect sprites (40x40) — shown on tiles where towers were sold
    this.load.image('rubble-01', 'assets/effects/rubble-01.png');
    this.load.image('rubble-02', 'assets/effects/rubble-02.png');
    this.load.image('rubble-03', 'assets/effects/rubble-03.png');

    // Tower sprites (64×64) — base (static) + turret (rotating) per tower type
    this.load.image('tower-arrow-base',       'assets/towers/arrow-base.png');
    this.load.image('tower-arrow-turret',     'assets/towers/arrow-turret.png');
    this.load.image('tower-rock-hurler-base',   'assets/towers/rock-hurler-base.png');
    this.load.image('tower-rock-hurler-turret', 'assets/towers/rock-hurler-turret.png');
    this.load.image('tower-frost-base',       'assets/towers/frost-base.png');
    this.load.image('tower-frost-turret',     'assets/towers/frost-turret.png');
    this.load.image('tower-poison-base',      'assets/towers/poison-base.png');
    this.load.image('tower-poison-turret',    'assets/towers/poison-turret.png');
    this.load.image('tower-tesla-base',       'assets/towers/tesla-base.png');
    this.load.image('tower-tesla-turret',     'assets/towers/tesla-turret.png');
    this.load.image('tower-aura-base',        'assets/towers/aura-base.png');
    this.load.image('tower-aura-turret',      'assets/towers/aura-turret.png');

    // Critter spritesheets (48×16, 3 frames of 16×16) — ambient wildlife
    this.load.spritesheet('critter-squirrel', 'assets/critters/squirrel.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('critter-frog',     'assets/critters/frog.png',     { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('critter-loon',     'assets/critters/loon.png',     { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('critter-turtle',   'assets/critters/turtle.png',   { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('critter-heron',    'assets/critters/heron.png',    { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('critter-rabbit',   'assets/critters/rabbit.png',   { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('critter-turkey',   'assets/critters/turkey.png',   { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('critter-hare',     'assets/critters/hare.png',     { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('critter-fox',      'assets/critters/fox.png',      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('critter-owl',      'assets/critters/owl.png',      { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('critter-raccoon',  'assets/critters/raccoon.png',  { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('critter-beaver',   'assets/critters/beaver.png',   { frameWidth: 16, frameHeight: 16 });
  }

  // ── Audio bridge ───────────────────────────────────────────────────────────

  private _bridgeAudioToManager(): void {
    const am = AudioManager.getInstance();
    const allKeys = [
      ...AUDIO_LOAD_DEFS.map(([key]) => key),
      ...MUSIC_VARIANT_DEFS.map(([key]) => key),
    ];
    for (const key of allKeys) {
      const data: unknown = this.cache.audio.get(key);
      if (data instanceof AudioBuffer) {
        am.registerDecodedBuffer(key, data);
      } else if (data instanceof ArrayBuffer) {
        void am.registerBuffer(key, data);
      } else if (data !== null && data !== undefined) {
        const duck = data as Record<string, unknown>;
        if (typeof duck['duration'] === 'number' && typeof duck['getChannelData'] === 'function') {
          am.registerDecodedBuffer(key, data as AudioBuffer);
        }
      }
    }
  }
}
