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

export class CameraController {
  private scene: Phaser.Scene;
  private cam: Phaser.Cameras.Scene2D.Camera;

  // pinch state
  private _pinchActive = false;
  private _pinchStartDist = 0;
  private _pinchStartZoom = 1;

  // pan state
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

  constructor(scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene;
    this.cam = camera;

    const { width, height } = scene.scale;
    camera.setBounds(0, 0, width, height);

    scene.input.on('pointerdown', this._onPointerDown, this);
    scene.input.on('pointermove', this._onPointerMove, this);
    scene.input.on('pointerup', this._onPointerUp, this);

    // Mouse wheel zoom (desktop)
    scene.input.on('wheel', this._onWheel, this);
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

    // Only allow pan when zoomed in
    if (this.isZoomed) {
      this._panActive = true;
      this._panStartX = ptr.x;
      this._panStartY = ptr.y;
      this._camStartX = this.cam.scrollX;
      this._camStartY = this.cam.scrollY;
    }
  }

  private _onPointerMove(_ptr: Phaser.Input.Pointer): void {
    if (this._blocked) return;

    const pointers = this.scene.input.manager.pointers;
    const activeCount = pointers.filter(p => p.isDown).length;

    if (this._pinchActive && activeCount >= 2) {
      this._updatePinch(pointers);
      return;
    }

    if (this._panActive && activeCount === 1) {
      const ptr = pointers.find(p => p.isDown);
      if (!ptr) return;
      const dx = (ptr.x - this._panStartX) / this.cam.zoom;
      const dy = (ptr.y - this._panStartY) / this.cam.zoom;
      this.cam.setScroll(this._camStartX - dx, this._camStartY - dy);
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

    // World point under the screen position before zoom
    const worldBefore = cam.getWorldPoint(screenX, screenY);

    cam.setZoom(newZoom);

    // World point after zoom change (screen position stays the same)
    const worldAfter = cam.getWorldPoint(screenX, screenY);

    // Adjust scroll to keep the world point under the cursor
    cam.scrollX += worldBefore.x - worldAfter.x;
    cam.scrollY += worldBefore.y - worldAfter.y;

    // If zoomed back to 1, snap to origin
    if (newZoom <= MIN_ZOOM + 0.01) {
      cam.setZoom(MIN_ZOOM);
      cam.setScroll(0, 0);
    }
  }
}
