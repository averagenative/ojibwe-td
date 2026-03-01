import Phaser from 'phaser';
import type { TowerDef } from '../entities/towers/Tower';

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
      .setStrokeStyle(1, 0x224422)
      .setDepth(DEPTH);

    defs.forEach((def, i) => {
      const bx = BTN_PADDING + BTN_SIZE / 2 + i * (BTN_SIZE + BTN_PADDING);
      const by = panelY;

      const btn = scene.add.rectangle(bx, by, BTN_SIZE, BTN_SIZE, 0x0d1a0d)
        .setStrokeStyle(2, 0x336633)
        .setInteractive({ useHandCursor: true })
        .setDepth(DEPTH + 1);

      const iconKey = `icon-${def.key}`;
      if (scene.textures.exists(iconKey)) {
        scene.add.image(bx, by - 10, iconKey)
          .setDisplaySize(26, 26)
          .setDepth(DEPTH + 2);
      }

      scene.add.text(bx, by + 14, `${def.cost}g`, {
        fontSize: '11px', color: '#ffcc00', fontFamily: 'monospace',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);

      scene.add.text(bx, by + 26, def.name.toUpperCase(), {
        fontSize: '9px', color: '#778877', fontFamily: 'monospace',
      }).setOrigin(0.5, 0.5).setDepth(DEPTH + 2);

      btn.on('pointerover', () => {
        const canAfford = getGold() >= def.cost;
        btn.setFillStyle(canAfford ? 0x225522 : 0x331111);
      });
      btn.on('pointerout', () => btn.setFillStyle(0x0d1a0d));
      btn.on('pointerup', () => {
        if (getGold() >= def.cost) onSelect(def);
      });
    });
  }
}
