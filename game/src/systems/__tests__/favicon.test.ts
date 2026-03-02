/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const INDEX_HTML = resolve(ROOT, 'index.html');
const SVG_PATH = resolve(ROOT, 'public', 'assets', 'ui', 'medicine-wheel.svg');

describe('Favicon', () => {
  it('index.html contains SVG favicon link', () => {
    const html = readFileSync(INDEX_HTML, 'utf-8');
    expect(html).toContain(
      '<link rel="icon" type="image/svg+xml" href="/assets/ui/medicine-wheel.svg"',
    );
  });

  it('medicine-wheel.svg exists in public assets', () => {
    expect(existsSync(SVG_PATH)).toBe(true);
  });

  it('medicine-wheel.svg is valid SVG with expected structure', () => {
    const svg = readFileSync(SVG_PATH, 'utf-8');
    expect(svg).toContain("<svg xmlns='http://www.w3.org/2000/svg'");
    expect(svg).toContain('viewBox');
    // Four quadrant colours: white(ish), red, black, yellow
    expect(svg).toContain('#e8e8e8');
    expect(svg).toContain('#e83030');
    expect(svg).toContain('#222');
    expect(svg).toContain('#e8a735');
    // Gold rim
    expect(svg).toContain('#c8a96e');
  });

  it('no duplicate favicon links in index.html', () => {
    const html = readFileSync(INDEX_HTML, 'utf-8');
    const faviconMatches = html.match(/rel="icon"/g);
    expect(faviconMatches).toHaveLength(1);
  });
});
