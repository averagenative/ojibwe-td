/**
 * Vitest setup: stub HTMLCanvasElement.getContext so Phaser's CanvasFeatures
 * detector doesn't crash when running in jsdom (which lacks a real canvas).
 *
 * Also provides a complete localStorage polyfill for Node 25+ compatibility.
 * Node 25 introduces a native `localStorage` global via `--localstorage-file`,
 * but without a valid file path the object has no Web Storage methods.
 */

// ── localStorage polyfill (Node 25 / jsdom compat) ───────────────────────────
((): void => {
  const _map = new Map<string, string>();
  const _ls: Storage = {
    get length() { return _map.size; },
    getItem:    (k: string) => _map.get(k) ?? null,
    setItem:    (k: string, v: string) => { _map.set(k, String(v)); },
    removeItem: (k: string) => { _map.delete(k); },
    clear:      () => { _map.clear(); },
    key:        (i: number) => ([..._map.keys()][i] ?? null),
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: _ls, writable: true, configurable: true,
  });
})();

const CANVAS_2D_STUB: Partial<CanvasRenderingContext2D> = {
  fillStyle: '',
  fillRect:  () => {},
  getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1, colorSpace: 'srgb' } as ImageData),
  putImageData: () => {},
  createImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1, colorSpace: 'srgb' } as ImageData),
  setTransform:  () => {},
  drawImage:     () => {},
  save:          () => {},
  restore:       () => {},
  scale:         () => {},
  rotate:        () => {},
  translate:     () => {},
  clearRect:     () => {},
  beginPath:     () => {},
  closePath:     () => {},
  moveTo:        () => {},
  lineTo:        () => {},
  stroke:        () => {},
  fill:          () => {},
  arc:           () => {},
  canvas:        {} as HTMLCanvasElement,
};

// jsdom returns null for getContext by default; give Phaser a minimal stub.
// The cast bypasses the overloaded DOM signature which TypeScript can't
// narrow correctly for a single-parameter stub.
(HTMLCanvasElement.prototype as { getContext: unknown }).getContext =
  (contextId: string) => {
    if (contextId === '2d') return CANVAS_2D_STUB as CanvasRenderingContext2D;
    return null;
  };
