/**
 * Vitest setup: stub HTMLCanvasElement.getContext so Phaser's CanvasFeatures
 * detector doesn't crash when running in jsdom (which lacks a real canvas).
 */

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
