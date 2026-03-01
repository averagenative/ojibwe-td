import Phaser from 'phaser';
import type { TowerDef } from '../entities/towers/Tower';
import { PAL } from './palette';

export const PANEL_HEIGHT = 72;
const BTN_SIZE = 52;
const BTN_PADDING = 10;
const DEPTH = 100;

/**
 * Bottom HUD strip for selecting towers to place.
 * Buttons are disabled (visually) when the player can't afford the tower.
 */
export class TowerPanel {
  constructor(
    scene: Phaser.Scene,
    defs: TowerDef[],
    onSelect: (def: TowerDef) => void,
    getGold: () => number,
  ) {
    const { width, height } = scene.scale;
    const panelY = height - PANEL_HEIGHT / 2;

    // Background strip
    scene.add.rectangle(width / 2, panelY, width, PANEL_HEIGHT, 0x000000, 0.85)
      .setStrokeStyle(1, PAL.borderInactive)
      .setDepth(DEPTH);

    defs.forEach((def, i) => {
      const bx = BTN_PADDING + BTN_SIZE / 2 + i * (BTN_SIZE + BTN_PADDING);
      const by = panelY;

      const btn = scene.add.rectangle(bx, by, BTN_SIZE, BTN_SIZE, PAL.bgCard)
        .setStrokeStyle(2, PAL.borderInactive)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 1);

      const iconKey = `icon-${def.key}`;
      if (scene.textures.exists(iconKey)) {
        scene.add.image(bx, by - 10, iconKey)
          .setDisplaySize(26, 26)
          .setDepth(DEPTH + 2);
      }

      scene.add.text(bx, by + 14, `${def.cost}g`, {
        fontSize: '11px', color: PAL.gold, fontFamily: PAL.fontBody,
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);

      scene.add.text(bx, by + 26, def.name.toUpperCase(), {
        fontSize: '9px', color: PAL.textDesc, fontFamily: PAL.fontBody,
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);

      btn.on('pointerover', () => {
        const canAfford = getGold() >= def.cost;
        btn.setFillStyle(canAfford ? PAL.bgPanelHover : PAL.bgCantAfford);
      });
      btn.on('pointerout', () => btn.setFillStyle(PAL.bgCard));
      btn.on('pointerup', () => {
        if (getGold() >= def.cost) onSelect(def);
      });
    });
  }
}
