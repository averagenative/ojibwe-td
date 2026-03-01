#!/usr/bin/env node
/**
 * remove-backgrounds.js
 *
 * Strips white backgrounds from generated assets using the remove.bg API.
 * Free tier: 50 images/month — enough for all game assets.
 * Sign up at https://www.remove.bg/api to get a free API key.
 *
 * Usage:
 *   REMOVEBG_API_KEY=your-key node scripts/remove-backgrounds.js
 *   REMOVEBG_API_KEY=your-key node scripts/remove-backgrounds.js --only icons
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const ASSETS = join(REPO_ROOT, 'game/public/assets');

// Load .env
const envPath = join(REPO_ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const API_KEY = process.env.REMOVEBG_API_KEY;
if (!API_KEY) {
  console.error('Set REMOVEBG_API_KEY environment variable.');
  console.error('  Free tier (50/month): https://www.remove.bg/api');
  process.exit(1);
}

const ONLY_ARG = process.argv.indexOf('--only');
const ONLY = ONLY_ARG >= 0 ? process.argv[ONLY_ARG + 1] : null;

const DIRS = ONLY ? [ONLY] : ['icons', 'portraits', 'sprites', 'tiles'];

async function removeBg(imagePath) {
  const imageData = readFileSync(imagePath);
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image_file"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`
    ),
    imageData,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\nauto\r\n--${boundary}--\r\n`),
  ]);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.remove.bg',
      path: '/v1.0/removebg',
      method: 'POST',
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`remove.bg API error ${res.statusCode}: ${Buffer.concat(chunks).toString()}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

let processed = 0, failed = 0;

for (const dir of DIRS) {
  const folder = join(ASSETS, dir);
  if (!existsSync(folder)) continue;

  for (const file of readdirSync(folder).filter(f => f.endsWith('.png'))) {
    const filePath = join(folder, file);
    process.stdout.write(`  ⏳ ${dir}/${file}  removing background…`);
    try {
      const result = await removeBg(filePath);
      writeFileSync(filePath, result);
      process.stdout.write(`  ✓\n`);
      processed++;
    } catch (err) {
      process.stdout.write(`  ✗ ${err.message}\n`);
      failed++;
    }
    // small delay to be polite to the API
    await new Promise(r => setTimeout(r, 500));
  }
}

console.log(`\nDone. Processed: ${processed}  Failed: ${failed}`);
