/**
 * CameraController — handles pinch-to-zoom, pan, and double-tap-reset
 * for the gameplay camera.
 *
 * Works with Phaser's main camera (world camera) while a separate UI
 * camera stays at zoom 1.
 */

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 2.5;
const ZOOM_SPEED = 0.008;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DIST = 30;
const ZOOM_RESET_DURATION = 200;

/** Optional callback: returns true when the pointer is over a UI zone that should block zoom/pan. */
export type UiZoneTest = (x: number, y: number) => boolean;

export class CameraController {
  private scene: Phaser.Scene;
  private cam: Phaser.Cameras.Scene2D.Camera;

  // map dimensions for manual scroll clamping
  private _mapW = 0;
  private _mapH = 0;

  // pinch state
  private _pinchActive = false;
  private _pinchStartDist = 0;
  private _pinchStartZoom = 1;

  // pan state (left-click when zoomed, or middle/right-click drag)
  private _panActive = false;
  private _panStartX = 0;
  private _panStartY = 0;
  private _camStartX = 0;
  private _camStartY = 0;

  // double-tap detection
  private _lastTapTime = 0;
  private _lastTapX = 0;
  private _lastTapY = 0;

  // block flag — disable zoom/pan during placement, boss offers, etc.
  private _blocked = false;

  /** Optional test — when this returns true the pointer is over UI, so skip zoom. */
  private _uiZoneTest: UiZoneTest | null = null;

  constructor(scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene;
    this.cam = camera;

    // Store map size for manual scroll clamping (Phaser's camera.setBounds
    // interferes with zoom-to-point by clamping scroll before the correction
    // offset is applied).
    const { width, height } = scene.scale;
    this._mapW = width;
    this._mapH = height;

    scene.input.on('pointerdown', this._onPointerDown, this);
    scene.input.on('pointermove', this._onPointerMove, this);
    scene.input.on('pointerup', this._onPointerUp, this);

    // Mouse wheel zoom (desktop)
    scene.input.on('wheel', this._onWheel, this);
  }

  /** Register a callback that identifies UI zones where scroll-wheel should scroll, not zoom. */
  setUiZoneTest(fn: UiZoneTest): void {
    this._uiZoneTest = fn;
  }

  get zoom(): number {
    return this.cam.zoom;
  }

  get isZoomed(): boolean {
    return this.cam.zoom > 1.01;
  }

  get isPanning(): boolean {
    return this._panActive;
  }

  get isPinching(): boolean {
    return this._pinchActive;
  }

  set blocked(value: boolean) {
    this._blocked = value;
    if (value) {
      this._pinchActive = false;
      this._panActive = false;
    }
  }

  /** Convert screen pointer coords to world coords accounting for zoom/scroll. */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const pt = this.cam.getWorldPoint(screenX, screenY);
    return { x: pt.x, y: pt.y };
  }

  resetZoom(animate = true): void {
    if (!this.isZoomed) return;
    if (animate) {
      this.scene.tweens.add({
        targets: this.cam,
        zoom: 1,
        scrollX: 0,
        scrollY: 0,
        duration: ZOOM_RESET_DURATION,
        ease: 'Quad.easeOut',
      });
    } else {
      this.cam.setZoom(1);
      this.cam.setScroll(0, 0);
    }
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this._onPointerDown, this);
    this.scene.input.off('pointermove', this._onPointerMove, this);
    this.scene.input.off('pointerup', this._onPointerUp, this);
    this.scene.input.off('wheel', this._onWheel, this);
  }

  // ── internals ────────────────────────────────────────────────────────────

  private _onPointerDown(ptr: Phaser.Input.Pointer): void {
    if (this._blocked) return;

    const pointers = this.scene.input.manager.pointers;
    const activeCount = pointers.filter(p => p.isDown).length;

    if (activeCount >= 2) {
      // Start pinch
      this._startPinch(pointers);
      this._panActive = false;
      return;
    }

    // Middle-mouse drag: always start panning (even at zoom 1)
    if (ptr.middleButtonDown()) {
      this._startPan(ptr);
      return;
    }

    // Single finger — check double-tap, then start pan tracking
    const now = Date.now();
    const dt = now - this._lastTapTime;
    const dx = ptr.x - this._lastTapX;
    const dy = ptr.y - this._lastTapY;

    if (dt < DOUBLE_TAP_MS && Math.hypot(dx, dy) < DOUBLE_TAP_DIST && this.isZoomed) {
      this.resetZoom();
      this._lastTapTime = 0;
      return;
    }

    this._lastTapTime = now;
    this._lastTapX = ptr.x;
    this._lastTapY = ptr.y;

    // Left-click pan only when zoomed in
    if (this.isZoomed) {
      this._startPan(ptr);
    }
  }

  private _startPan(ptr: Phaser.Input.Pointer): void {
    this._panActive = true;
    this._panStartX = ptr.x;
    this._panStartY = ptr.y;
    this._camStartX = this.cam.scrollX;
    this._camStartY = this.cam.scrollY;
  }

  private _onPointerMove(_ptr: Phaser.Input.Pointer): void {
    if (this._blocked) return;

    const pointers = this.scene.input.manager.pointers;
    const activeCount = pointers.filter(p => p.isDown).length;

    if (this._pinchActive && activeCount >= 2) {
      this._updatePinch(pointers);
      return;
    }

    if (this._panActive && activeCount >= 1) {
      const ptr = pointers.find(p => p.isDown);
      if (!ptr) return;
      const dx = (ptr.x - this._panStartX) / this.cam.zoom;
      const dy = (ptr.y - this._panStartY) / this.cam.zoom;
      this.cam.setScroll(this._camStartX - dx, this._camStartY - dy);
      this._clampScroll();
    }
  }

  private _onPointerUp(_ptr: Phaser.Input.Pointer): void {
    const pointers = this.scene.input.manager.pointers;
    const activeCount = pointers.filter(p => p.isDown).length;

    if (activeCount < 2) {
      this._pinchActive = false;
    }
    if (activeCount === 0) {
      this._panActive = false;
    }
  }

  private _onWheel(
    _ptr: Phaser.Input.Pointer,
    _gos: Phaser.GameObjects.GameObject[],
    _dx: number,
    dy: number,
  ): void {
    if (this._blocked) return;

    const ptr = this.scene.input.activePointer;

    // If pointer is over a UI zone (e.g. side upgrade panel), let the UI handle scroll.
    if (this._uiZoneTest && this._uiZoneTest(ptr.x, ptr.y)) return;

    const curZoom = this.cam.zoom;
    const newZoom = Phaser.Math.Clamp(curZoom - dy * ZOOM_SPEED, MIN_ZOOM, MAX_ZOOM);
    if (newZoom === curZoom) return;

    this._zoomToPoint(ptr.x, ptr.y, newZoom);
  }

  private _startPinch(pointers: Phaser.Input.Pointer[]): void {
    const active = pointers.filter(p => p.isDown);
    if (active.length < 2) return;

    const [a, b] = active;
    this._pinchStartDist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
    this._pinchStartZoom = this.cam.zoom;
    this._pinchActive = true;
  }

  private _updatePinch(pointers: Phaser.Input.Pointer[]): void {
    const active = pointers.filter(p => p.isDown);
    if (active.length < 2) return;

    const [a, b] = active;
    const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
    if (this._pinchStartDist === 0) return;

    const scale = dist / this._pinchStartDist;
    const newZoom = Phaser.Math.Clamp(this._pinchStartZoom * scale, MIN_ZOOM, MAX_ZOOM);

    // Zoom towards the midpoint of the two fingers
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    this._zoomToPoint(midX, midY, newZoom);
  }

  /**
   * Zoom towards a screen-space point so that the world position under
   * that point stays fixed (standard "zoom to cursor" behavior).
   */
  private _zoomToPoint(screenX: number, screenY: number, newZoom: number): void {
    const cam = this.cam;
    const oldZoom = cam.zoom;

    // Compute scroll correction mathematically. Phaser 3.90's getWorldPoint
    // uses a camera matrix that's only rebuilt in preRender, so calling it
    // after setZoom returns stale results.
    //
    // Phaser 3.90 world formula:
    //   wx = scrollX + originX + (sx - originX) / zoom
    // Keeping the same world point after zoom change, the +originX cancels:
    //   scrollX_new = scrollX_old + (sx - originX) * (1/oldZoom - 1/newZoom)
    const { width, height } = cam;
    const dx = (screenX - width * cam.originX) * (1 / oldZoom - 1 / newZoom);
    const dy = (screenY - height * cam.originY) * (1 / oldZoom - 1 / newZoom);

    cam.setZoom(newZoom);
    cam.scrollX += dx;
    cam.scrollY += dy;

    // If zoomed back to 1, snap to origin
    if (newZoom <= MIN_ZOOM + 0.01) {
      cam.setZoom(MIN_ZOOM);
      cam.setScroll(0, 0);
    } else {
      this._clampScroll();
    }
  }

  /** Prevent panning beyond the map edges. */
  private _clampScroll(): void {
    const cam = this.cam;
    // Phaser 3.90 camera formula: worldX = scrollX + originX + (screenX - originX) / zoom
    // Visible world range: [scrollX + ox - ox/z, scrollX + ox + (w-ox)/z]
    // where ox = cam.width * cam.originX (= width/2 by default)
    //
    // To keep visible area within [0, mapW]:
    //   left  ≥ 0:    scrollX ≥ ox/z - ox
    //   right ≤ mapW: scrollX ≤ mapW - ox - (w-ox)/z
    const ox = cam.width * cam.originX;
    const oy = cam.height * cam.originY;
    const z = cam.zoom;

    const minX = ox / z - ox;
    const maxX = this._mapW - ox - (cam.width - ox) / z;
    const minY = oy / z - oy;
    const maxY = this._mapH - oy - (cam.height - oy) / z;

    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, Math.min(minX, maxX), Math.max(minX, maxX));
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, Math.min(minY, maxY), Math.max(minY, maxY));
  }
}
