import Phaser from 'phaser';
import { SaveManager, CONSUMABLE_COSTS, GOLD_BOOST_AMOUNT } from '../meta/SaveManager';
import type { ConsumablePending } from '../meta/SaveManager';
import { UNLOCK_NODES } from '../meta/unlockDefs';
import type { UnlockNode } from '../meta/unlockDefs';
import { MobileManager, TAP_EVENT } from '../systems/MobileManager';
import { AchievementManager } from '../systems/AchievementManager';
import { PAL } from '../ui/palette';
import { MetaAmbiance } from '../systems/MetaAmbiance';
import type { MetaAmbianceConfig } from '../systems/MetaAmbiance';
import { ALL_STAGES, ALL_REGIONS } from '../data/stageDefs';
import type { SeasonalTheme } from '../data/stageDefs';
import {
  TOWER_META_UPGRADE_DEFS,
  META_TIER_COSTS,
  MAX_META_TIER,
  getMetaBonusDisplay,
  getNextTierBonusDisplay,
} from '../data/towerMetaUpgradeDefs';

const PANEL_W     = 420;
const NODE_H          = 90;
const NODE_H_COMPACT  = 60;
const NODE_GAP        = 10;
const NODE_PAD_X  = 20;

/** Tabs available in the meta menu. */
type MetaTab = 'unlocks' | 'shop' | 'upgrades';

/** Data passed to scene.restart() to preserve tab selection. */
interface MetaMenuData { tab?: MetaTab }

// ── Shop item definitions ────────────────────────────────────────────────────

interface ShopItem {
  key:         keyof ConsumablePending;
  label:       string;
  description: string;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    key:         'rerollTokens',
    label:       'Reroll Token',
    description: `Grants one free offer reroll during a between-wave pick screen. Spend it to see 3 fresh offers. Stacks — multiple tokens carry into the run.`,
  },
  {
    key:         'goldBoostTokens',
    label:       'Gold Boost',
    description: `+${GOLD_BOOST_AMOUNT} starting gold for your next run. Tokens stack — buy several to build a larger gold cushion.`,
  },
  {
    key:         'extraLifeTokens',
    label:       'Extra Life',
    description: `+1 starting life for your next run. Tokens stack — stockpile before a difficult stage.`,
  },
];

export class MetaMenuScene extends Phaser.Scene {
  /** True when running on a mobile/touch device. Set once in create(). */
  private _isMobile = false;

  /** Living background ambiance system. Nulled at scene start; created in create(). */
  private _ambiance: MetaAmbiance | null = null;

  /**
   * Returns a CSS font-size string scaled up by 1.35× on mobile.
   */
  private _fs(size: number): string {
    const s = this._isMobile ? Math.round(size * 1.35) : size;
    return `${s}px`;
  }

  constructor() {
    super({ key: 'MetaMenuScene' });
  }

  create(data?: object): void {
    this._ambiance = null;  // clear any previous reference (Phaser has already destroyed old objects)
    this._isMobile = MobileManager.getInstance().isMobile();

    const { tab = 'unlocks' } = (data ?? {}) as MetaMenuData;
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Ambient living background (must be first so it renders behind all UI) ─
    const save = SaveManager.getInstance();
    const ambianceConfig: MetaAmbianceConfig = {
      width:            width,
      height:           height,
      season:           this._getSeason(save.getLastPlayedStage()),
      defeatedBossKeys: save.getDefeatedBossKeys(),
      isMobile:         this._isMobile,
    };
    this._ambiance = new MetaAmbiance(this, ambianceConfig);

    // Background (grid overlay rendered after ambiance so it's on top of nature)
    this.createBackground();

    // Title
    this.add.text(cx, 36, 'META UPGRADES', {
      fontSize:   this._fs(32),
      color:      PAL.textPrimary,
      fontFamily: PAL.fontTitle,
      fontStyle:  'bold',
    }).setOrigin(0.5);

    // Crystal balance
    const balanceText = this.add.text(cx, 76, `Crystals: ${save.getCurrency()}`, {
      fontSize:   this._fs(20),
      color:      PAL.gold,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    }).setOrigin(0.5);

    // ── Tab buttons — 44px minimum height on mobile ──────────────────────────
    const TAB_Y = 112;
    this.makeTabButton(cx - 200, TAB_Y, 'UNLOCKS', tab === 'unlocks', () => {
      this.scene.restart({ tab: 'unlocks' } as MetaMenuData);
    });
    this.makeTabButton(cx, TAB_Y, 'UPGRADES', tab === 'upgrades', () => {
      this.scene.restart({ tab: 'upgrades' } as MetaMenuData);
    });
    this.makeTabButton(cx + 200, TAB_Y, 'SHOP', tab === 'shop', () => {
      this.scene.restart({ tab: 'shop' } as MetaMenuData);
    });

    // Separator line below tabs — spans all 3 tab positions
    const sepGfx = this.add.graphics();
    sepGfx.lineStyle(1, PAL.borderInactive, 0.8);
    sepGfx.beginPath();
    sepGfx.moveTo(cx - 310, TAB_Y + 22);
    sepGfx.lineTo(cx + 310, TAB_Y + 22);
    sepGfx.strokePath();

    const contentY = TAB_Y + 36;

    // ── Render active tab content ────────────────────────────────────────────
    if (tab === 'unlocks') {
      this.renderUnlocksTab(cx, contentY, save, balanceText);
    } else if (tab === 'upgrades') {
      this.renderUpgradesTab(cx, contentY, save, balanceText);
    } else {
      this.renderShopTab(cx, contentY, save, balanceText);
    }

    // Navigation buttons — use _navigateTo() so the ambiance fades out smoothly
    const btnY = height - (this._isMobile ? 64 : 60);
    this.makeButton(cx - 220, btnY, 'BACK', () => {
      this._navigateTo('MainMenuScene');
    });
    this.makeButton(cx, btnY, 'GEAR', () => {
      this._navigateTo('InventoryScene');
    });
    this.makeButton(cx + 220, btnY, 'CHALLENGES', () => {
      this._navigateTo('ChallengeSelectScene');
    });

    // Swipe-right to go back (mobile only)
    if (this._isMobile) {
      let swipeStartX = 0;
      let swipeStartY = 0;
      this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        swipeStartX = ptr.x;
        swipeStartY = ptr.y;
      });
      this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        const dx = ptr.x - swipeStartX;
        const dy = ptr.y - swipeStartY;
        if (dx > 100 && Math.abs(dy) < 50) {
          this._navigateTo('MainMenuScene');
        }
      });
    }
  }

  /**
   * Fade out the ambiance layer then start the target scene.
   * Falls back to an immediate switch when no ambiance is active.
   */
  private _navigateTo(targetScene: string): void {
    if (this._ambiance) {
      this._ambiance.startFadeOut(() => {
        this.scene.start(targetScene);
      });
    } else {
      this.scene.start(targetScene);
    }
  }

  /**
   * Look up the seasonal theme of the player's last-played stage.
   * Defaults to 'summer' when the stage is unknown.
   */
  private _getSeason(lastStageId: string): SeasonalTheme {
    const stage = ALL_STAGES.find(s => s.id === lastStageId);
    if (!stage) return 'summer';
    const region = ALL_REGIONS.find(r => r.id === stage.regionId);
    return region?.seasonalTheme ?? 'summer';
  }

  override update(_time: number, delta: number): void {
    this._ambiance?.update(delta);
  }

  // ── Background ─────────────────────────────────────────────────────────────

  private createBackground(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, PAL.bgDark);

    const gfx = this.add.graphics();
    gfx.lineStyle(1, PAL.bgPanel, 0.3);
    const ts = 40;
    for (let x = 0; x < width; x += ts) { gfx.moveTo(x, 0); gfx.lineTo(x, height); }
    for (let y = 0; y < height; y += ts) { gfx.moveTo(0, y); gfx.lineTo(width, y); }
    gfx.strokePath();
  }

  // ── Scroll helpers ─────────────────────────────────────────────────────────

  /**
   * Attach touch-drag (and mouse-wheel) scroll to a container.
   * Returns an applyScroll function for use by arrow buttons.
   */
  private _attachScrollHandlers(
    container: Phaser.GameObjects.Container,
    startY: number,
    contentH: number,
    visibleH: number,
  ): (delta: number) => void {
    const maxScroll = contentH - visibleH;
    let scrollOffset = 0;

    const applyScroll = (delta: number): void => {
      scrollOffset = Phaser.Math.Clamp(scrollOffset + delta, 0, maxScroll);
      container.y = -scrollOffset;
    };

    // Mouse wheel
    this.input.on('wheel', (
      _pointer: Phaser.Input.Pointer,
      _over: Phaser.GameObjects.GameObject[],
      _dx: number,
      deltaY: number,
    ) => {
      applyScroll(deltaY * 0.5);
    });

    // Touch drag
    let touchLastY  = 0;
    let isTouchScrolling = false;

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      // Only start touch scroll when pointer is inside the scrollable area
      if (ptr.y >= startY && ptr.y <= startY + visibleH) {
        touchLastY  = ptr.y;
        isTouchScrolling = true;
      }
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!isTouchScrolling || !ptr.isDown) return;
      const dy = touchLastY - ptr.y;
      touchLastY = ptr.y;
      applyScroll(dy);
    });

    this.input.on('pointerup', () => {
      isTouchScrolling = false;
    });

    return applyScroll;
  }

  // ── Tab renderers ─────────────────────────────────────────────────────────

  private renderUnlocksTab(
    cx: number,
    startY: number,
    save: SaveManager,
    balanceText: Phaser.GameObjects.Text,
  ): void {
    const mapNodes       = UNLOCK_NODES.filter(n => n.effect.type === 'map');
    const stageNodes     = UNLOCK_NODES.filter(n => n.effect.type === 'stage');
    const commanderNodes = UNLOCK_NODES.filter(n => n.effect.type === 'commander');

    // All scrollable unlock content lives in this container.
    const container = this.add.container(0, 0);

    // Use full node height so wrapped descriptions don't overflow the box.
    const nodeH = NODE_H;

    let y = startY;

    // Maps section
    if (mapNodes.length > 0) {
      container.add(this.add.text(cx - PANEL_W / 2, y, 'Maps', {
        fontSize:   this._fs(14),
        color:      PAL.textSecondary,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }));
      y += 24;
      for (const node of mapNodes) {
        this.renderNode(cx, y, node, save, balanceText, nodeH, container);
        y += nodeH + NODE_GAP;
      }
    }

    // Stages section
    if (stageNodes.length > 0) {
      y += 8;
      container.add(this.add.text(cx - PANEL_W / 2, y, 'Stages', {
        fontSize:   this._fs(14),
        color:      PAL.textSecondary,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }));
      y += 24;
      for (const node of stageNodes) {
        this.renderNode(cx, y, node, save, balanceText, nodeH, container);
        y += nodeH + NODE_GAP;
      }
    }

    // Commanders section
    if (commanderNodes.length > 0) {
      y += 8;
      container.add(this.add.text(cx - PANEL_W / 2, y, 'Commanders', {
        fontSize:   this._fs(14),
        color:      PAL.textSecondary,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }));
      y += 24;
      for (const node of commanderNodes) {
        this.renderNode(cx, y, node, save, balanceText, nodeH, container);
        y += nodeH + NODE_GAP;
      }
    }

    // Set up scrolling if content overflows the visible area.
    const contentH = y - startY;
    const visibleH = this.scale.height - startY - 80;

    if (contentH > visibleH) {
      const maskGfx = this.make.graphics({});
      maskGfx.fillRect(0, startY, this.scale.width, visibleH);
      container.setMask(maskGfx.createGeometryMask());

      const applyScroll = this._attachScrollHandlers(container, startY, contentH, visibleH);

      // Touch-friendly scroll arrows
      const arrowX = cx + PANEL_W / 2 + 24;

      const upArrow = this.add.text(arrowX, startY + 8, '▲', {
        fontSize: this._fs(20), color: PAL.textSecondary, fontFamily: PAL.fontBody,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      upArrow.on(TAP_EVENT, () => applyScroll(-(NODE_H_COMPACT + NODE_GAP)));
      upArrow.on('pointerover', () => upArrow.setColor(PAL.textPrimary));
      upArrow.on('pointerout',  () => upArrow.setColor(PAL.textSecondary));

      const downArrow = this.add.text(arrowX, startY + visibleH - 8, '▼', {
        fontSize: this._fs(20), color: PAL.textSecondary, fontFamily: PAL.fontBody,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      downArrow.on(TAP_EVENT, () => applyScroll(NODE_H_COMPACT + NODE_GAP));
      downArrow.on('pointerover', () => downArrow.setColor(PAL.textPrimary));
      downArrow.on('pointerout',  () => downArrow.setColor(PAL.textSecondary));
    }
  }

  private renderShopTab(
    cx: number,
    startY: number,
    save: SaveManager,
    balanceText: Phaser.GameObjects.Text,
  ): void {
    const pending = save.getPendingConsumables();

    this.add.text(cx - PANEL_W / 2, startY, 'Repeatable — spend crystals each run', {
      fontSize:   this._fs(13),
      color:      PAL.accentBlue,
      fontFamily: PAL.fontBody,
    });

    let y = startY + 28;

    for (const item of SHOP_ITEMS) {
      const cost      = CONSUMABLE_COSTS[item.key];
      const count     = pending[item.key];
      const canAfford = save.getCurrency() >= cost;

      const bgColor     = canAfford ? PAL.bgCard : PAL.bgPanel;
      const borderColor = canAfford ? PAL.accentBlueN : PAL.borderInactive;
      const labelColor  = canAfford ? PAL.accentBlueLight : PAL.textMuted;

      const panel = this.add.rectangle(cx, y + NODE_H / 2, PANEL_W, NODE_H, bgColor)
        .setStrokeStyle(2, borderColor);

      // Label
      this.add.text(cx - PANEL_W / 2 + NODE_PAD_X, y + 10, item.label, {
        fontSize:   this._fs(16),
        color:      labelColor,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      });

      // Description — word-wrapped with maxLines to prevent overflow on mobile.
      this.add.text(cx - PANEL_W / 2 + NODE_PAD_X, y + 32, item.description, {
        fontSize:   this._fs(11),
        color:      PAL.textDesc,
        fontFamily: PAL.fontBody,
        wordWrap:   { width: PANEL_W - NODE_PAD_X * 2 - 110 },
        maxLines:   3,
      });

      // Right-side cost + stock badge
      const badgeX = cx + PANEL_W / 2 - NODE_PAD_X - 48;
      const badgeY = y + NODE_H / 2;

      // Cost display
      this.add.text(badgeX, badgeY - 20, `${cost}`, {
        fontSize:   this._fs(16),
        color:      canAfford ? PAL.accentBlueLight : PAL.textDim,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5);
      this.add.text(badgeX, badgeY - 4, 'crystals', {
        fontSize:   this._fs(11),
        color:      PAL.accentBlue,
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5);

      // Pending stock count
      const stockColor = count > 0 ? PAL.accentGreen : PAL.textDim;
      this.add.text(badgeX, badgeY + 14, `held: ${count}`, {
        fontSize:   this._fs(11),
        color:      stockColor,
        fontFamily: PAL.fontBody,
        fontStyle:  count > 0 ? 'bold' : 'normal',
      }).setOrigin(0.5);

      // Make clickable
      if (canAfford) {
        panel.setInteractive({ useHandCursor: true });
        panel.on('pointerover',  () => panel.setFillStyle(PAL.bgCardHover));
        panel.on('pointerout',   () => panel.setFillStyle(bgColor));
        panel.on(TAP_EVENT, () => {
          const ok = save.purchaseConsumable(item.key);
          if (ok) {
            AchievementManager.getInstance().addCrystalsSpent(CONSUMABLE_COSTS[item.key]);
            balanceText.setText(`Crystals: ${save.getCurrency()}`);
            this.scene.restart({ tab: 'shop' } as MetaMenuData);
          }
        });
      }

      y += NODE_H + NODE_GAP;
    }

    // Info footer
    this.add.text(cx, y + 12,
      'Tokens are consumed at the start of your next run.',
      {
        fontSize:   this._fs(12),
        color:      PAL.textFaint,
        fontFamily: PAL.fontBody,
        align:      'center',
        wordWrap:   { width: PANEL_W },
      },
    ).setOrigin(0.5, 0);
  }

  private renderUpgradesTab(
    cx:          number,
    startY:      number,
    save:        SaveManager,
    balanceText: Phaser.GameObjects.Text,
  ): void {
    const container = this.add.container(0, 0);

    this.add.text(cx - PANEL_W / 2, startY,
      'Permanent stat boosts — applied to every run.',
      {
        fontSize:   this._fs(12),
        color:      PAL.accentBlue,
        fontFamily: PAL.fontBody,
      },
    );

    let y = startY + 26;

    for (const towerDef of TOWER_META_UPGRADE_DEFS) {
      // Tower block header
      const headerBg = this.add.rectangle(cx, y + 14, PANEL_W, 28, PAL.bgPanel)
        .setStrokeStyle(1, PAL.borderInactive);
      container.add(headerBg);

      container.add(this.add.text(cx - PANEL_W / 2 + NODE_PAD_X, y + 4, towerDef.towerName, {
        fontSize:   this._fs(14),
        color:      PAL.textPrimary,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }));

      y += 28 + 4;

      // Stat rows
      for (const track of towerDef.stats) {
        const tier     = save.getTowerMetaUpgradeTier(towerDef.towerKey, track.key);
        const isMaxed  = tier >= MAX_META_TIER;
        const cost     = isMaxed ? 0 : META_TIER_COSTS[tier];
        const canAfford = !isMaxed && save.getCurrency() >= cost;

        const rowBg = this.add.rectangle(cx, y + 20, PANEL_W, 40, PAL.bgCard)
          .setStrokeStyle(1, isMaxed ? PAL.borderActive : (canAfford ? PAL.borderInactive : PAL.bgPanel));
        container.add(rowBg);

        // Stat label
        container.add(this.add.text(cx - PANEL_W / 2 + NODE_PAD_X, y + 8, track.label, {
          fontSize:   this._fs(12),
          color:      PAL.textMuted,
          fontFamily: PAL.fontBody,
        }));

        // Tier pips (5 small squares)
        const pipStartX = cx - 60;
        for (let i = 0; i < MAX_META_TIER; i++) {
          const filled = i < tier;
          const pip = this.add.rectangle(pipStartX + i * 16, y + 20, 12, 12,
            filled ? PAL.accentGreenN : PAL.bgPanelLocked,
          ).setStrokeStyle(1, filled ? PAL.borderActive : PAL.borderInactive);
          container.add(pip);
        }

        // Current bonus display
        const bonusStr = getMetaBonusDisplay(track, tier);
        container.add(this.add.text(cx + 38, y + 20, bonusStr, {
          fontSize:   this._fs(11),
          color:      isMaxed ? PAL.gold : PAL.textSecondary,
          fontFamily: PAL.fontBody,
          fontStyle:  isMaxed ? 'bold' : 'normal',
        }).setOrigin(0.5));

        if (isMaxed) {
          // MAXED indicator
          container.add(this.add.text(cx + PANEL_W / 2 - NODE_PAD_X - 30, y + 20, 'MAXED', {
            fontSize:   this._fs(11),
            color:      PAL.gold,
            fontFamily: PAL.fontBody,
            fontStyle:  'bold',
          }).setOrigin(0.5));
        } else {
          // Cost + next-tier bonus
          const nextBonus = getNextTierBonusDisplay(track, tier);
          const costColor = canAfford ? PAL.accentBlueLight : PAL.textDim;

          container.add(this.add.text(cx + PANEL_W / 2 - NODE_PAD_X - 70, y + 12, nextBonus, {
            fontSize:   this._fs(11),
            color:      canAfford ? PAL.accentGreen : PAL.textFaint,
            fontFamily: PAL.fontBody,
          }).setOrigin(0.5));

          container.add(this.add.text(cx + PANEL_W / 2 - NODE_PAD_X - 70, y + 26, `${cost}💎`, {
            fontSize:   this._fs(11),
            color:      costColor,
            fontFamily: PAL.fontBody,
          }).setOrigin(0.5));

          if (canAfford) {
            rowBg.setInteractive({ useHandCursor: true });
            rowBg.on('pointerover',  () => rowBg.setFillStyle(PAL.bgCardHover));
            rowBg.on('pointerout',   () => rowBg.setFillStyle(PAL.bgCard));
            rowBg.on(TAP_EVENT, () => {
              const ok = save.purchaseTowerMetaUpgrade(towerDef.towerKey, track.key);
              if (ok) {
                AchievementManager.getInstance().addCrystalsSpent(cost);
                balanceText.setText(`Crystals: ${save.getCurrency()}`);
                this.scene.restart({ tab: 'upgrades' } as MetaMenuData);
              }
            });
          }
        }

        y += 40 + 4;
      }

      y += 8; // extra gap between tower blocks
    }

    // Set up scrolling if content overflows
    const contentH = y - startY;
    const visibleH  = this.scale.height - startY - 80;

    if (contentH > visibleH) {
      const maskGfx = this.make.graphics({});
      maskGfx.fillRect(0, startY, this.scale.width, visibleH);
      container.setMask(maskGfx.createGeometryMask());

      const applyScroll = this._attachScrollHandlers(container, startY, contentH, visibleH);

      const arrowX = cx + PANEL_W / 2 + 24;

      const upArrow = this.add.text(arrowX, startY + 8, '▲', {
        fontSize: this._fs(20), color: PAL.textSecondary, fontFamily: PAL.fontBody,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      upArrow.on(TAP_EVENT,   () => applyScroll(-44));
      upArrow.on('pointerover', () => upArrow.setColor(PAL.textPrimary));
      upArrow.on('pointerout',  () => upArrow.setColor(PAL.textSecondary));

      const downArrow = this.add.text(arrowX, startY + visibleH - 8, '▼', {
        fontSize: this._fs(20), color: PAL.textSecondary, fontFamily: PAL.fontBody,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      downArrow.on(TAP_EVENT,   () => applyScroll(44));
      downArrow.on('pointerover', () => downArrow.setColor(PAL.textPrimary));
      downArrow.on('pointerout',  () => downArrow.setColor(PAL.textSecondary));
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  private renderNode(
    cx: number,
    y:  number,
    node: UnlockNode,
    save: SaveManager,
    balanceText: Phaser.GameObjects.Text,
    nodeHeight: number = NODE_H,
    container?: Phaser.GameObjects.Container,
  ): void {
    const owned      = save.isUnlocked(node.id);
    const prereqsMet = node.prereqs.every(id => save.isUnlocked(id));
    const affordable = !owned && prereqsMet && save.getCurrency() >= node.cost;
    const canBuy     = affordable;
    const locked     = !owned && !prereqsMet;

    let bgColor: number;
    let borderColor: number;
    let labelColor: string;

    if (owned) {
      bgColor = PAL.bgStartBtn;
      borderColor = PAL.borderActive;
      labelColor = PAL.textPrimary;
    } else if (locked) {
      bgColor = PAL.bgPanelLocked;
      borderColor = PAL.borderLocked;
      labelColor = PAL.textLocked;
    } else if (affordable) {
      bgColor = PAL.bgCard;
      borderColor = PAL.accentBlueN;
      labelColor = PAL.accentBlueLight;
    } else {
      bgColor = PAL.bgPanel;
      borderColor = PAL.borderInactive;
      labelColor = PAL.textMuted;
    }

    // ── Subtle glow layer behind the panel ──────────────────────────────────
    if (owned) {
      // Owned nodes: pulsing green glow
      const ownedGlow = this.add.rectangle(
        cx, y + nodeHeight / 2, PANEL_W + 6, nodeHeight + 6, PAL.accentGreenN, 0,
      );
      if (container) container.add(ownedGlow);
      this.tweens.add({
        targets:  ownedGlow,
        alpha:    { from: 0, to: 0.10 },
        duration: 1200,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    } else if (affordable) {
      // Available-to-purchase nodes: "come hither" shimmer
      const shimmerGlow = this.add.rectangle(
        cx, y + nodeHeight / 2, PANEL_W + 6, nodeHeight + 6, PAL.accentBlueN, 0,
      );
      if (container) container.add(shimmerGlow);
      this.tweens.add({
        targets:  shimmerGlow,
        alpha:    { from: 0, to: 0.08 },
        duration: 700,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
        delay:    Math.floor(Math.random() * 600),
      });
    }

    const panel = this.add.rectangle(cx, y + nodeHeight / 2, PANEL_W, nodeHeight, bgColor)
      .setStrokeStyle(2, borderColor);
    if (container) container.add(panel);

    // Label
    const label = this.add.text(cx - PANEL_W / 2 + NODE_PAD_X, y + 10, node.label, {
      fontSize:   this._fs(16),
      color:      labelColor,
      fontFamily: PAL.fontBody,
      fontStyle:  'bold',
    });
    if (container) container.add(label);

    // Description — word-wrapped to fit within the node box; maxLines guards against overflow.
    const desc = this.add.text(cx - PANEL_W / 2 + NODE_PAD_X, y + 32, node.description, {
      fontSize:    this._fs(11),
      color:       PAL.textDesc,
      fontFamily:  PAL.fontBody,
      wordWrap:    { width: PANEL_W - NODE_PAD_X * 2 - 100 },
      maxLines:    3,
    });
    if (container) container.add(desc);

    // Cost / status badge on the right
    const badgeX = cx + PANEL_W / 2 - NODE_PAD_X - 50;
    const badgeY = y + nodeHeight / 2;

    if (owned) {
      const badge = this.add.text(badgeX, badgeY, 'OWNED', {
        fontSize:   this._fs(14),
        color:      PAL.accentGreen,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5);
      if (container) container.add(badge);
    } else if (locked) {
      const badge = this.add.text(badgeX, badgeY, 'LOCKED', {
        fontSize:   this._fs(13),
        color:      PAL.textLocked,
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5);
      if (container) container.add(badge);
    } else {
      const costText = this.add.text(badgeX, badgeY, `${node.cost}`, {
        fontSize:   this._fs(18),
        color:      affordable ? PAL.accentBlueLight : PAL.textDim,
        fontFamily: PAL.fontBody,
        fontStyle:  'bold',
      }).setOrigin(0.5);
      if (container) container.add(costText);

      // "crystals" label
      const crystalsLabel = this.add.text(badgeX, badgeY + 16, 'crystals', {
        fontSize:   this._fs(11),
        color:      PAL.accentBlue,
        fontFamily: PAL.fontBody,
      }).setOrigin(0.5);
      if (container) container.add(crystalsLabel);
    }

    // Make clickable when purchasable
    if (canBuy) {
      panel.setInteractive({ useHandCursor: true });
      panel.on('pointerover',  () => panel.setFillStyle(PAL.bgCardHover));
      panel.on('pointerout',   () => panel.setFillStyle(bgColor));
      panel.on(TAP_EVENT, () => {
        const purchased = save.purchaseUnlock(node.id, node.cost);
        if (purchased) {
          AchievementManager.getInstance().addCrystalsSpent(node.cost);
          AchievementManager.getInstance().onMetaUnlockPurchased();
          balanceText.setText(`Crystals: ${save.getCurrency()}`);
          this.scene.restart({ tab: 'unlocks' } as MetaMenuData);
        }
      });
    }
  }

  private makeTabButton(
    x: number,
    y: number,
    label: string,
    active: boolean,
    onClick: () => void,
  ): void {
    const fillColor   = active ? PAL.bgCard : PAL.bgPanel;
    const borderColor = active ? PAL.borderActive : PAL.borderInactive;
    const textColor   = active ? PAL.textPrimary : PAL.textSecondary;
    // Ensure 44px minimum height on mobile for tap target.
    const tabH = this._isMobile ? 44 : 36;

    const bg = this.add.rectangle(x, y, 180, tabH, fillColor)
      .setStrokeStyle(2, borderColor)
      .setInteractive({ useHandCursor: !active });

    const text = this.add.text(x, y, label, {
      fontSize:   this._fs(16),
      color:      textColor,
      fontFamily: PAL.fontBody,
      fontStyle:  active ? 'bold' : 'normal',
    }).setOrigin(0.5);

    if (!active) {
      bg.on('pointerover',  () => { bg.setFillStyle(PAL.bgPanelHover); text.setColor(PAL.textPrimary); });
      bg.on('pointerout',   () => { bg.setFillStyle(fillColor); text.setColor(textColor); });
      bg.on(TAP_EVENT,    onClick);
    }
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const btnH = this._isMobile ? 52 : 48;
    const bg = this.add.rectangle(x, y, 200, btnH, PAL.bgPanel)
      .setStrokeStyle(2, PAL.borderInactive)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize:   this._fs(18),
      color:      PAL.textSecondary,
      fontFamily: PAL.fontBody,
    }).setOrigin(0.5);

    bg.on('pointerover',  () => { bg.setFillStyle(PAL.bgPanelHover); text.setColor(PAL.textPrimary); });
    bg.on('pointerout',   () => { bg.setFillStyle(PAL.bgPanel); text.setColor(PAL.textSecondary); });
    bg.on(TAP_EVENT,    onClick);
  }
}
