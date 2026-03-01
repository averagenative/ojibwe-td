#!/usr/bin/env node
/**
 * resize-assets.js
 *
 * Resizes generated 1024×1024 images down to game-ready sizes using sharp.
 *
 * Install: npm install sharp -g   OR   npm install --save-dev sharp
 * Run:     node scripts/resize-assets.js
 */

import sharp from 'sharp';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const ASSETS = join(REPO_ROOT, 'game/public/assets');

const RESIZE_MAP = [
  { dir: 'icons',    size: 64  },   // tower icons
  { dir: 'portraits', size: 96 },   // commander portraits (select screen)
  { dir: 'sprites',  size: 48  },   // creep sprites
  { dir: 'tiles',    size: 64  },   // map tiles
];

for (const { dir, size } of RESIZE_MAP) {
  const folder = join(ASSETS, dir);
  if (!existsSync(folder)) continue;

  for (const file of readdirSync(folder).filter(f => f.endsWith('.png'))) {
    const src = join(folder, file);
    const tmp = src + '.tmp.png';
    await sharp(src).resize(size, size).toFile(tmp);
    await sharp(tmp).toFile(src);
    const { unlinkSync } = await import('fs');
    unlinkSync(tmp);
    console.log(`  ✓ ${dir}/${file}  →  ${size}×${size}`);
  }
}

console.log('\nResize complete.');
