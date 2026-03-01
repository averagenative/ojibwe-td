#!/usr/bin/env node
/**
 * generate-logo.js
 *
 * Generates three Ojibwe TD logo variants via DALL-E 3 for review.
 * Pick the one you like, copy it to game/public/assets/ui/logo.png.
 *
 * Usage:
 *   node scripts/generate-logo.js
 *
 * Output:
 *   game/public/assets/logo-review/logo-v1-text.png       — text-forward
 *   game/public/assets/logo-review/logo-v2-emblem.png     — circular badge
 *   game/public/assets/logo-review/logo-v3-banner.png     — horizontal banner (wide)
 *
 * After picking one:
 *   cp game/public/assets/logo-review/logo-vN-*.png game/public/assets/ui/logo.png
 *   node scripts/remove-backgrounds.js --only ui   (optional — strip white bg)
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

// ── Load .env ────────────────────────────────────────────────────────────────
const envPath = join(REPO_ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set OPENAI_API_KEY in .env or environment.');
  process.exit(1);
}

// ── Output dir ───────────────────────────────────────────────────────────────
const OUT_DIR = join(REPO_ROOT, 'game/public/assets/logo-review');
mkdirSync(OUT_DIR, { recursive: true });

// ── Logo variants ─────────────────────────────────────────────────────────────
//
// Style base shared by all variants — Anishinaabe Woodland art.
// Palette: forest green #2D5016, marsh green #6B8F3E, lake blue #4A7FA5,
//          warm cream #e8dcc8, and black outlines.

const LOGO_VARIANTS = [
  {
    filename: 'logo-v1-text.png',
    size: '1024x1024',
    quality: 'hd',
    label: 'V1 — Text-forward',
    prompt: `Game logo for "Ojibwe TD" — a tower defense video game. \
Anishinaabe Woodland art style. Bold geometric flat illustration, clean thick black outlines. \
The words OJIBWE TD in large stylised hand-lettered text, uppercase, taking up most of the image. \
Letters have geometric decorative details inspired by Woodland beadwork — small triangles, diamonds, \
and dot accents woven into or around the letterforms. \
Colour palette: forest green #2D5016, marsh green #6B8F3E, warm cream #e8dcc8, black outlines. \
Thin decorative border of alternating triangles around the edge of the image. \
Pure white background. Square format 1024x1024. \
No photorealism, no gradients, no drop shadows, no extra characters or symbols.`,
  },
  {
    filename: 'logo-v2-emblem.png',
    size: '1024x1024',
    quality: 'hd',
    label: 'V2 — Circular emblem',
    prompt: `Game logo for "Ojibwe TD" — a tower defense video game. \
Anishinaabe Woodland art style. Bold geometric flat illustration, clean thick black outlines. \
A circular badge / emblem design. \
Centre: a stylised thunderbird (Animikiikaa) with wings spread, geometric feather shapes, \
seen from above, deep navy silhouette with a yellow lightning bolt across its chest. \
Around the bird: a ring of small geometric arrow shapes pointing outward. \
Outer ring: the words OJIBWE TD curved along the top arc of the circle, TD along the bottom arc. \
Text in bold geometric lettering, cream colour on forest-green band. \
Colour palette: forest green #2D5016, marsh green #6B8F3E, lake blue #4A7FA5, \
warm cream #e8dcc8, black outlines. \
Pure white background outside the circle. Square format 1024x1024. \
No photorealism, no gradients, no drop shadows.`,
  },
  {
    filename: 'logo-v3-banner.png',
    size: '1792x1024',
    quality: 'hd',
    label: 'V3 — Horizontal banner',
    prompt: `Game logo for "Ojibwe TD" — a tower defense video game. \
Anishinaabe Woodland art style. Bold geometric flat illustration, clean thick black outlines. \
Horizontal / landscape composition 1792x1024. \
LEFT side: a stylised thunderbird (Animikiikaa) silhouette, wings spread wide, \
geometric feather shapes, deep navy blue with yellow lightning markings, roughly 40% of the width. \
RIGHT side: the words OJIBWE in large bold Woodland-styled lettering on one line, \
TD in slightly smaller text on the line below, right-aligned. \
Both text and bird sit on a dark forest-green panel (#2D5016) framed by a \
thin cream border with small triangular notches at the corners. \
Colour palette: forest green #2D5016, marsh green #6B8F3E, lake blue #4A7FA5, \
warm cream #e8dcc8, black outlines. \
Pure white background outside the panel. \
No photorealism, no gradients, no drop shadows.`,
  },
];

// ── DALL-E 3 API call ─────────────────────────────────────────────────────────

function generateImage(prompt, size, quality) {
  const body = JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size, quality, response_format: 'url' });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path:     '/v1/images/generations',
      method:   'POST',
      headers:  {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type':  'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (res.statusCode !== 200) {
          reject(new Error(`OpenAI API ${res.statusCode}: ${text}`));
          return;
        }
        const data = JSON.parse(text);
        resolve(data.data[0].url);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, res => {
      // Follow one redirect (DALL-E URLs sometimes redirect)
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('Ojibwe TD — Logo Generator');
console.log('Generating 3 variants via DALL-E 3 HD…');
console.log(`Output: ${OUT_DIR}\n`);

for (let i = 0; i < LOGO_VARIANTS.length; i++) {
  const v = LOGO_VARIANTS[i];
  const outPath = join(OUT_DIR, v.filename);

  process.stdout.write(`[${i + 1}/${LOGO_VARIANTS.length}] ${v.label}… `);

  try {
    const url   = await generateImage(v.prompt, v.size, v.quality);
    const data  = await downloadImage(url);
    writeFileSync(outPath, data);
    console.log(`✓  saved → ${outPath.replace(REPO_ROOT + '/', '')}`);
  } catch (err) {
    console.log(`✗  FAILED: ${err.message}`);
  }

  // Respect DALL-E 3 rate limit (~5 req/min on tier 1) between requests
  if (i < LOGO_VARIANTS.length - 1) {
    process.stdout.write('   (waiting 13s for rate limit…)\n');
    await sleep(13000);
  }
}

console.log(`
Done! Open the images and pick your favourite:
  ${OUT_DIR}

To use one as the game logo:
  cp game/public/assets/logo-review/logo-vN-*.png game/public/assets/ui/logo.png

Then optionally strip the white background:
  node scripts/remove-backgrounds.js --only ui
`);
