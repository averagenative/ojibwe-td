#!/usr/bin/env node
/**
 * generate-assets.js
 *
 * Generates all Ojibwe TD game art via the OpenAI DALL-E 3 API.
 * Run once (or re-run with --force to regenerate everything).
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-assets.js
 *   OPENAI_API_KEY=sk-... node scripts/generate-assets.js --force
 *   OPENAI_API_KEY=sk-... node scripts/generate-assets.js --only towers
 *   OPENAI_API_KEY=sk-... node scripts/generate-assets.js --only commanders
 *   OPENAI_API_KEY=sk-... node scripts/generate-assets.js --only creeps
 *   OPENAI_API_KEY=sk-... node scripts/generate-assets.js --only tiles
 *
 * Output directories:
 *   game/public/assets/icons/       ← tower icons    (64×64 game use, generated at 1024×1024)
 *   game/public/assets/portraits/   ← commander art  (96×96 game use, generated at 1024×1024)
 *   game/public/assets/sprites/     ← creep sprites  (48×48 game use, generated at 1024×1024)
 *   game/public/assets/tiles/       ← map tiles      (64×64 game use, generated at 1024×1024)
 *
 * NOTE: DALL-E 3 generates images with solid backgrounds, not transparent ones.
 * After generation, run each image through https://www.remove.bg or use the
 * companion script `scripts/remove-backgrounds.js` (requires a remove.bg API key)
 * to strip backgrounds before using in Phaser.
 *
 * Alternatively, Phaser can use setTint() or a shader to key out the background
 * colour — the code comments in BootScene note which key each texture uses.
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

// ── Config ──────────────────────────────────────────────────────────────────

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set OPENAI_API_KEY environment variable first.');
  console.error('  export OPENAI_API_KEY=sk-...');
  process.exit(1);
}

const FORCE     = process.argv.includes('--force');
const ONLY_ARG  = process.argv.indexOf('--only');
const ONLY      = ONLY_ARG >= 0 ? process.argv[ONLY_ARG + 1] : null;
const DELAY_MS  = 12000; // ~5 req/min limit on DALL-E 3 tier 1; adjust if you have higher limits

// ── Style foundation ─────────────────────────────────────────────────────────
//
// Injected into every prompt to keep the visual language consistent.
// Woodland/Anishinaabe art: bold geometry, limited palette, clean outlines.

const STYLE = [
  'Anishinaabe Woodland art style',
  'bold geometric flat illustration',
  'clean thick black outlines',
  'limited palette of 4 colours maximum',
  'pure white background',      // we strip this later
  'square format',
  'game asset icon',
  'no text, no letters, no labels',
  'no gradients, no photorealism, no shadows',
].join(', ');

// ── Asset definitions ─────────────────────────────────────────────────────────
//
// Each entry:
//   filename : where to save (relative to REPO_ROOT)
//   prompt   : full DALL-E 3 prompt
//   size     : DALL-E 3 size ('1024x1024' | '1792x1024' | '1024x1792')
//   quality  : 'hd' | 'standard'

const ASSETS = {

  // ── Tower Icons ─────────────────────────────────────────────────────────────
  // Saved to assets/icons/ — loaded in BootScene as 'icon-*'
  // Displayed at 48-64px in TowerPanel

  towers: [
    {
      filename: 'game/public/assets/icons/icon-cannon.png',
      quality: 'hd',
      prompt: `A bow and arrow icon. ${STYLE}. The bow is a strong curved arc, the arrow is nocked and aimed right. Earth tones: dark brown bow, cream arrow, rust-red fletching. Represents strength and precision. Centred in frame with generous padding.`,
    },
    {
      filename: 'game/public/assets/icons/icon-frost.png',
      quality: 'hd',
      prompt: `A six-pointed geometric snowflake icon. ${STYLE}. Pale ice blue and white. Each arm of the snowflake ends in a small diamond. Clean rotational symmetry. Represents Biboon, the winter spirit. Cold, sharp, beautiful.`,
    },
    {
      filename: 'game/public/assets/icons/icon-tesla.png',
      quality: 'hd',
      prompt: `A thunderbird icon seen from above with wings spread wide. ${STYLE}. Deep navy blue bird silhouette, bright yellow lightning bolt across its chest. Geometric feather shapes. Represents Animikiikaa, the thunderbird spirit. Powerful and symmetrical.`,
    },
    {
      filename: 'game/public/assets/icons/icon-mortar.png',
      quality: 'hd',
      prompt: `A stone icon. ${STYLE}. Concentric circles radiating from a central dot, like ripples in earth or a target carved in granite. Grey and charcoal tones with warm ochre centre dot. Represents earth power and impact. Simple, weighty.`,
    },
    {
      filename: 'game/public/assets/icons/icon-poison.png',
      quality: 'hd',
      prompt: `A medicinal plant icon. ${STYLE}. A stylised mushroom or leaf with a spiral pattern on its cap. Forest green, deep teal, and pale yellow. Represents mashkiki, plant medicine. Organic shapes within geometric constraints.`,
    },
    {
      filename: 'game/public/assets/icons/icon-aura.png',
      quality: 'hd',
      prompt: `A medicine wheel icon. ${STYLE}. A circle divided into four equal quadrants: East quadrant yellow, South quadrant red, West quadrant black, North quadrant white. Thin cross dividers and an outer ring. Sacred geometry. Simple and balanced.`,
    },
    {
      filename: 'game/public/assets/icons/icon-dice.png',
      quality: 'standard',
      prompt: `A question mark icon inside a circle. ${STYLE}. Bold white question mark on a deep teal circle background. Mystery and possibility. Used for unknown roguelike offers.`,
    },
    {
      filename: 'game/public/assets/icons/icon-mystery.png',
      quality: 'standard',
      prompt: `A sealed birchbark scroll icon. ${STYLE}. Rolled white birchbark tied with red cord, small red wax seal. Represents hidden knowledge. Warm cream and red tones.`,
    },
  ],

  // ── Commander Portraits ──────────────────────────────────────────────────────
  // Saved to assets/portraits/ — loaded as 'portrait-*'
  // Displayed at 96×96 on select screen, 48×48 in HUD
  // IMPORTANT: generate at 1024×1024 (square), resize in Phaser

  commanders: [
    {
      filename: 'game/public/assets/portraits/portrait-nokomis.png',
      quality: 'hd',
      prompt: `Portrait of Nokomis, an Ojibwe grandmother elder. ${STYLE}. Warm earth tones: dark skin, silver-white hair in two braids, deep burgundy clothing with geometric beadwork pattern at collar. Calm, wise expression. Centred bust portrait. No background detail — pure white. Respectful and dignified.`,
    },
    {
      filename: 'game/public/assets/portraits/portrait-makoons.png',
      quality: 'hd',
      prompt: `Portrait icon of a bear spirit warrior — Makoons. ${STYLE}. A bear's face, forward-facing, geometric style. Dark chocolate brown fur with warm amber highlights around the eyes and muzzle. Three parallel claw-mark lines on each cheek. Strong and protective.`,
    },
    {
      filename: 'game/public/assets/portraits/portrait-waabizii.png',
      quality: 'hd',
      prompt: `Portrait icon of Waabizii the swan spirit healer. ${STYLE}. A swan's face and upper neck, forward-facing. Pure white feathers with pale blue-grey wing tips visible at edges. Calm gold eye. Water ripple pattern below chin. Serene and graceful.`,
    },
    {
      filename: 'game/public/assets/portraits/portrait-bizhiw.png',
      quality: 'hd',
      prompt: `Portrait icon of Bizhiw the lynx spirit hunter. ${STYLE}. A lynx face, forward-facing, geometric. Tawny amber fur with dark brown geometric spot markings. Sharp tufted ears pointing up. Piercing yellow-green eyes. Alert and quick.`,
    },
    {
      filename: 'game/public/assets/portraits/portrait-animikiikaa.png',
      quality: 'hd',
      prompt: `Portrait icon of Animikiikaa the thunderbird. ${STYLE}. A thunderbird face, forward-facing with wings visible behind head like a headdress. Deep midnight blue and black feathers. Bright yellow lightning bolt pupils in the eyes. Geometric feather crown. Powerful and commanding.`,
    },
  ],

  // ── Creep Sprites ────────────────────────────────────────────────────────────
  // Saved to assets/sprites/ — loaded as 'creep-*'
  // Displayed at 32-48px in game, top-down view

  creeps: [
    {
      filename: 'game/public/assets/sprites/creep-normal.png',
      quality: 'standard',
      prompt: `Top-down view of a small forest creature spirit for a tower defense game. ${STYLE}. A compact rounded animal shape like a marten or weasel seen from above. Warm tan and brown. Simple, small, non-threatening. Moving right.`,
    },
    {
      filename: 'game/public/assets/sprites/creep-fast.png',
      quality: 'standard',
      prompt: `Top-down view of a fast deer spirit for a tower defense game. ${STYLE}. An elongated deer silhouette viewed from above, mid-leap, legs stretched fore and aft. Bright golden yellow with white tail. Streamlined and dynamic. Moving right.`,
    },
    {
      filename: 'game/public/assets/sprites/creep-armored.png',
      quality: 'standard',
      prompt: `Top-down view of a snapping turtle spirit — Mikinaak — for a tower defense game. ${STYLE}. A turtle seen from above with a heavily patterned shell as armour. Dark grey-green shell with geometric hexagonal pattern, lighter underbelly edges visible. Solid and heavy. Moving right.`,
    },
    {
      filename: 'game/public/assets/sprites/creep-immune.png',
      quality: 'standard',
      prompt: `Top-down view of a raven spirit — Gaagaagi — for a tower defense game. ${STYLE}. A raven seen from above with wings slightly spread. Pure black with an iridescent blue-purple sheen on wings. Surrounded by a faint white glowing circle (magic immunity). Moving right.`,
    },
    {
      filename: 'game/public/assets/sprites/creep-regen.png',
      quality: 'standard',
      prompt: `Top-down view of a bear spirit cub for a tower defense game. ${STYLE}. A rounded bear cub viewed from above. Dark brown with small bright green cross or leaf shapes on its back (regeneration). Sturdy and rounded. Moving right.`,
    },
    {
      filename: 'game/public/assets/sprites/creep-flying.png',
      quality: 'standard',
      prompt: `Top-down view of an eagle spirit — Migiizi — for a tower defense game. ${STYLE}. A bald eagle viewed directly from above with wings fully spread, soaring. White head, dark brown wings, yellow beak visible. Wingspan wider than body. Moving right. Cast a tiny oval shadow below it.`,
    },
    {
      filename: 'game/public/assets/sprites/creep-boss.png',
      quality: 'hd',
      prompt: `Top-down view of Waabooz the spirit hare boss for a tower defense game. ${STYLE}. A large hare viewed from above, twice the size of a normal creep. Deep crimson red fur with white geometric stripe pattern along the spine. Large powerful haunches. Imposing. Moving right.`,
    },
    {
      filename: 'game/public/assets/sprites/creep-boss-mini.png',
      quality: 'standard',
      prompt: `Top-down view of a small spirit hare — a mini copy of Waabooz — for a tower defense game. ${STYLE}. A small hare viewed from above, compact. Crimson red with white stripe pattern, same as the boss but smaller and slightly more frantic-looking. Moving right.`,
    },
  ],

  // ── Environment Tiles ────────────────────────────────────────────────────────
  // Saved to assets/tiles/ — loaded as 'tile-*'
  // Rendered as 64×64 map decorations

  tiles: [
    {
      filename: 'game/public/assets/tiles/tile-tree.png',
      quality: 'standard',
      prompt: `Top-down view of a pine tree tile for a tower defense game map. ${STYLE}. Two or three overlapping dark green circles of different sizes, representing a conifer canopy viewed from above. Deep forest green and pine shadow. Circular cluster centred in tile. Northern Ontario boreal forest.`,
    },
    {
      filename: 'game/public/assets/tiles/tile-brush.png',
      quality: 'standard',
      prompt: `Top-down view of low brush and grass tile for a tower defense game map. ${STYLE}. Irregular blob of light green and olive tones, like tall grass and low shrubs viewed from above. Soft irregular edges. Light sage green and warm yellow-green. Sparse, airy feel.`,
    },
    {
      filename: 'game/public/assets/tiles/tile-rock.png',
      quality: 'standard',
      prompt: `Top-down view of a granite rock outcropping tile for a tower defense game map. ${STYLE}. An irregular polygon of grey granite with cracks and facets viewed from above. Cool grey with warm charcoal cracks. Shield rock, Canadian Precambrian Shield style. Solid and immovable.`,
    },
    {
      filename: 'game/public/assets/tiles/tile-water.png',
      quality: 'standard',
      prompt: `Top-down view of a shallow water or lake tile for a tower defense game map. ${STYLE}. A rectangle of calm lake water viewed from above. Deep lake blue with two or three thin pale blue horizontal lines as ripples. Great Lakes water colour. Still and reflective.`,
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = require('fs').createWriteStream(destPath);
    proto.get(url, response => {
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', err => {
      require('fs').unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function generateImage(asset) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: asset.prompt,
      n: 1,
      size: '1024x1024',
      quality: asset.quality ?? 'standard',
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`API error ${response.status}: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  return data.data[0].url;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Resolve which categories to run
  const categories = ONLY
    ? [ONLY]
    : Object.keys(ASSETS);

  const allAssets = categories.flatMap(cat => {
    if (!ASSETS[cat]) {
      console.error(`Unknown category: ${cat}. Choose from: ${Object.keys(ASSETS).join(', ')}`);
      process.exit(1);
    }
    return ASSETS[cat];
  });

  // Create output dirs
  const dirs = new Set(allAssets.map(a =>
    join(REPO_ROOT, a.filename).replace(/\/[^/]+$/, '')
  ));
  for (const d of dirs) {
    mkdirSync(d, { recursive: true });
  }

  console.log(`\nOjibwe TD — Asset Generator`);
  console.log(`Generating ${allAssets.length} image(s)  [force=${FORCE}]\n`);

  let generated = 0, skipped = 0, failed = 0;

  for (const asset of allAssets) {
    const destPath = join(REPO_ROOT, asset.filename);
    const name = asset.filename.split('/').pop();

    if (!FORCE && existsSync(destPath)) {
      console.log(`  ⏭  ${name}  (already exists, use --force to regenerate)`);
      skipped++;
      continue;
    }

    process.stdout.write(`  ⏳ ${name}  generating…`);

    try {
      const url = await generateImage(asset);

      // Download the image
      await new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        const chunks = [];
        proto.get(url, res => {
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            writeFileSync(destPath, Buffer.concat(chunks));
            resolve();
          });
        }).on('error', reject);
      });

      process.stdout.write(`  ✓ saved\n`);
      generated++;
    } catch (err) {
      process.stdout.write(`  ✗ FAILED: ${err.message}\n`);
      failed++;
    }

    // Rate limit: DALL-E 3 is ~5 images/min on tier 1
    if (generated + failed < allAssets.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone. Generated: ${generated}  Skipped: ${skipped}  Failed: ${failed}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review images in game/public/assets/`);
  console.log(`  2. Remove backgrounds: https://www.remove.bg (free tier: 50 images/month)`);
  console.log(`     Or batch-process with: node scripts/remove-backgrounds.js`);
  console.log(`  3. Resize tower icons to 64×64, creep sprites to 48×48`);
  console.log(`     Or use: node scripts/resize-assets.js`);
  console.log(`  4. The game will use them automatically on next browser reload.\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
