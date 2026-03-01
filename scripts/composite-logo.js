#!/usr/bin/env node
/**
 * composite-logo.js
 *
 * Builds the final Ojibwe TD logo as a fully transparent PNG:
 *   1. Strips the cream/light background from the thunderbird shield (remove.bg API)
 *   2. Extends the canvas upward with a transparent header band
 *   3. Composites "OJIBWE TD" in Cinzel Bold (thick black outline, no background)
 *
 * The resulting PNG has no background at all — drop it over any colour in HTML/CSS.
 *
 * Usage:
 *   node scripts/composite-logo.js
 *
 * Output:
 *   game/public/assets/logo-review/logo-v3-composited.png   ← review this
 *   game/public/assets/ui/logo.png                          ← game-ready copy
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import https from 'https';

const require = createRequire(import.meta.url);
const sharp   = require('sharp');

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = join(__dirname, '..');
const REVIEW_DIR = join(REPO_ROOT, 'game/public/assets/logo-review');
const UI_DIR     = join(REPO_ROOT, 'game/public/assets/ui');
const SRC        = join(REVIEW_DIR, 'logo-v3-banner.png');
const SRC_NOBG   = join(REVIEW_DIR, 'logo-v3-nobg.png');   // cached transparent version
const OUT_REVIEW = join(REVIEW_DIR, 'logo-v3-composited.png');
const OUT_GAME   = join(UI_DIR, 'logo.png');
const FONT_CACHE = join(REVIEW_DIR, 'Cinzel-Bold.ttf');

mkdirSync(UI_DIR, { recursive: true });

// ── Load .env ─────────────────────────────────────────────────────────────────
const envPath = join(REPO_ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const REMOVEBG_KEY = process.env.REMOVEBG_API_KEY;
if (!REMOVEBG_KEY) {
  console.error('ERROR: REMOVEBG_API_KEY not set in .env');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchUrl(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', ...extraHeaders } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location, extraHeaders).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

// ── Step 1: strip thunderbird background via remove.bg ────────────────────────

async function stripBackground(imagePath) {
  if (existsSync(SRC_NOBG)) {
    console.log('  BG removal: using cached logo-v3-nobg.png');
    return readFileSync(SRC_NOBG);
  }

  console.log('  BG removal: calling remove.bg API…');
  const imageData = readFileSync(imagePath);
  const boundary  = '----FormBoundary' + Math.random().toString(36).slice(2);
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image_file"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`),
    imageData,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\nauto\r\n--${boundary}--\r\n`),
  ]);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.remove.bg',
      path:     '/v1.0/removebg',
      method:   'POST',
      headers:  {
        'X-Api-Key':      REMOVEBG_KEY,
        'Content-Type':   `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = Buffer.concat(chunks);
          writeFileSync(SRC_NOBG, result);
          console.log(`  BG removal: saved transparent version → logo-v3-nobg.png`);
          resolve(result);
        } else {
          reject(new Error(`remove.bg ${res.statusCode}: ${Buffer.concat(chunks).toString()}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Step 2: download Cinzel Bold (cached) ─────────────────────────────────────

async function getCinzelFont() {
  if (existsSync(FONT_CACHE)) {
    console.log('  Font: using cached Cinzel-Bold.ttf');
    return readFileSync(FONT_CACHE);
  }
  console.log('  Font: downloading Cinzel Bold from Google Fonts…');
  const css   = (await fetchUrl('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap')).toString();
  const match = css.match(/src: url\(([^)]+\.ttf)\)/);
  if (!match) throw new Error('Could not parse Cinzel TTF URL from Google Fonts CSS');
  const fontData = await fetchUrl(match[1]);
  writeFileSync(FONT_CACHE, fontData);
  console.log(`  Font: saved Cinzel-Bold.ttf`);
  return fontData;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const meta = await sharp(SRC).metadata();
const W = meta.width;   // 1792
const H = meta.height;  // 1024
console.log(`Source: ${SRC.replace(REPO_ROOT + '/', '')}  (${W}×${H})`);

// 1. Transparent thunderbird
const noBgData = await stripBackground(SRC);

// Read actual dimensions from the bg-removed image (remove.bg may resize)
const noBgMeta = await sharp(noBgData).metadata();
const W2 = noBgMeta.width;
const H2 = noBgMeta.height;
if (W2 !== W || H2 !== H) console.log(`  BG image resized by remove.bg: ${W2}×${H2}`);

// 2. Cinzel font → base64
let fontB64 = null;
try {
  fontB64 = (await getCinzelFont()).toString('base64');
} catch (err) {
  console.warn(`  Font WARNING: ${err.message} — falling back to serif`);
}

// ── Step 3: build text-only SVG (fully transparent background) ───────────────

const headerH  = Math.round(H2 * 0.24);   // ~245px header band

const fontSize = Math.round(headerH * 0.62);
const strokeW  = Math.round(fontSize * 0.14);
const baseline = Math.round(headerH * 0.78);

// Horizontal centering for "OJIBWE  TD" as one unit
const charW    = fontSize * 0.68;  // Cinzel Bold caps ≈ 0.68× font-size
const gap      = Math.round(fontSize * 0.90);
const ojibweW  = charW * 6;
const tdW      = charW * 2;
const totalW   = ojibweW + gap + tdW;
const startX   = Math.round((W2 - totalW) / 2);
const ojibweCX = Math.round(startX + ojibweW / 2);
const tdCX     = Math.round(startX + ojibweW + gap + tdW / 2);

const fontFace   = fontB64
  ? `@font-face { font-family: 'Cinzel'; src: url('data:font/truetype;base64,${fontB64}') format('truetype'); font-weight: 700; }`
  : '';
const fontFamily = fontB64 ? "'Cinzel', serif" : 'Georgia, serif';

// SVG has NO background rect — fully transparent, text only
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${headerH}">
  <defs><style>${fontFace}</style></defs>

  <!-- "OJIBWE" — warm cream, thick black outline -->
  <text
    x="${ojibweCX}" y="${baseline}"
    font-family="${fontFamily}" font-size="${fontSize}px" font-weight="700"
    fill="#e8dcc8"
    stroke="#000000" stroke-width="${strokeW}" stroke-linejoin="round"
    paint-order="stroke fill"
    text-anchor="middle"
    letter-spacing="${Math.round(fontSize * 0.06)}"
  >OJIBWE</text>

  <!-- "TD" — lake blue, same outline -->
  <text
    x="${tdCX}" y="${baseline}"
    font-family="${fontFamily}" font-size="${fontSize}px" font-weight="700"
    fill="#4A7FA5"
    stroke="#000000" stroke-width="${strokeW}" stroke-linejoin="round"
    paint-order="stroke fill"
    text-anchor="middle"
    letter-spacing="${Math.round(fontSize * 0.06)}"
  >TD</text>
</svg>`;

// ── Step 4: extend transparent canvas + composite text + shield ───────────────

process.stdout.write('Building final transparent logo… ');

await sharp(noBgData)
  .extend({
    top:        headerH,
    bottom:     0,
    left:       0,
    right:      0,
    background: { r: 0, g: 0, b: 0, alpha: 0 },  // transparent extension
  })
  .composite([{ input: Buffer.from(svg), top: 0, left: 0, blend: 'over' }])
  .png()
  .toFile(OUT_REVIEW);

await sharp(OUT_REVIEW).toFile(OUT_GAME);

console.log('✓');
console.log(`\nReview copy : ${OUT_REVIEW.replace(REPO_ROOT + '/', '')}`);
console.log(`Game copy   : ${OUT_GAME.replace(REPO_ROOT + '/', '')}`);
console.log('\nFully transparent PNG — drop over any background colour in HTML/CSS.');
