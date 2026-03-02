/**
 * Layout contract tests — TASK-041 (Logo & Page Layout Redesign).
 *
 * These validate that the HTML shell, CSS layout, and Phaser config satisfy
 * the acceptance criteria for the logo + page layout.  Regressions are caught
 * if someone accidentally changes the background colour, logo constraints,
 * or HTML structure.
 *
 * HTML and TS files use Vite's ?raw import.  CSS is read via Node.js fs
 * because Vitest strips CSS content by default (css option is disabled).
 */
import { describe, it, expect, beforeAll } from 'vitest';

// ── HTML + TS loaded via Vite's ?raw suffix (works in test env) ─────────────

import html from '../../../index.html?raw';
import mainTsSrc from '../../main.ts?raw';

// ── CSS loaded via Node.js fs (Vitest strips ?raw CSS by default) ───────────

let css: string;

beforeAll(async () => {
  // Dynamic import with variable prevents TypeScript + Vite from resolving
  // the Node.js built-in at compile time (no @types/node in this project).
  const fsId = 'node:fs';
  const m = await import(/* @vite-ignore */ fsId);
  // Vitest runs from the project root (game/), so relative path works.
  css = m.readFileSync('src/style.css', 'utf-8') as string;
});

// ── style.css ───────────────────────────────────────────────────────────────

describe('style.css — layout contract', () => {
  it('sets body background to dark forest green #0d1208', () => {
    expect(css).toContain('background: #0d1208');
  });

  it('uses flex column layout on body', () => {
    expect(css).toContain('flex-direction: column');
  });

  it('prevents horizontal scrollbar with overflow-x: hidden', () => {
    expect(css).toContain('overflow-x: hidden');
  });

  it('scales logo responsively with max-width: min(320px, 70vw)', () => {
    expect(css).toContain('max-width: min(320px, 70vw)');
  });

  it('keeps logo aspect ratio with height: auto', () => {
    expect(css).toContain('height: auto');
  });

  it('game-container fills remaining height with flex: 1', () => {
    expect(css).toMatch(/flex:\s*1/);
  });

  it('game-container clips overflow', () => {
    expect(css).toContain('overflow: hidden');
  });

  it('header has vertical padding', () => {
    expect(css).toMatch(/padding:\s*\d+px/);
  });
});

// ── index.html ──────────────────────────────────────────────────────────────

describe('index.html — structure contract', () => {
  it('links to external style.css', () => {
    expect(html).toMatch(/<link\s[^>]*href="[^"]*style\.css"/);
  });

  it('contains header#game-header with logo img', () => {
    expect(html).toMatch(/<header\s+id="game-header">/);
    expect(html).toMatch(/<img\s[^>]*src="\/assets\/ui\/logo\.png"/);
    expect(html).toMatch(/<img\s[^>]*alt="Ojibwe TD"/);
    expect(html).toMatch(/<img\s[^>]*id="logo"/);
  });

  it('contains div#game-container for Phaser', () => {
    expect(html).toMatch(/<div\s+id="game-container">/);
  });

  it('header appears before game-container in DOM order', () => {
    const headerIdx = html.indexOf('id="game-header"');
    const containerIdx = html.indexOf('id="game-container"');
    expect(headerIdx).toBeGreaterThan(-1);
    expect(containerIdx).toBeGreaterThan(-1);
    expect(headerIdx).toBeLessThan(containerIdx);
  });
});

// ── main.ts — Phaser config ────────────────────────────────────────────────

describe('main.ts — Phaser config contract', () => {
  it('sets backgroundColor to #0d1208 (matches body bg)', () => {
    expect(mainTsSrc).toContain("backgroundColor: '#0d1208'");
  });

  it('sets parent to game-container', () => {
    expect(mainTsSrc).toContain("parent: 'game-container'");
  });

  it('uses Scale.FIT mode', () => {
    expect(mainTsSrc).toContain('Phaser.Scale.FIT');
  });

  it('uses Scale.CENTER_BOTH for autoCenter', () => {
    expect(mainTsSrc).toContain('Phaser.Scale.CENTER_BOTH');
  });
});
