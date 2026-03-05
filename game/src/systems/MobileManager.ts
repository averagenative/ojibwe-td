/**
 * MobileManager — detects mobile/touch devices and re-evaluates on resize /
 * orientation change.
 *
 * Detection heuristic (matches task spec):
 *   viewport width ≤ 768  OR  'ontouchstart' in window
 *
 * Side-effects on evaluation:
 *   - Sets `window.__OJIBWE_MOBILE` (boolean) — accessible from HTML/CSS layer
 *   - Toggles `document.body.classList` class 'mobile' for CSS media overrides
 */

declare global {
  interface Window {
    /** Set to `true` when a mobile/touch device is detected. */
    __OJIBWE_MOBILE?: boolean;
  }
}

export class MobileManager {
  private static _instance: MobileManager | null = null;
  private _isMobile = false;

  private constructor() {
    this._evaluate();
    window.addEventListener('resize', () => this._evaluate());
    window.addEventListener('orientationchange', () => this._evaluate());
  }

  static getInstance(): MobileManager {
    if (!MobileManager._instance) {
      MobileManager._instance = new MobileManager();
    }
    return MobileManager._instance;
  }

  /** Re-run detection.  Called automatically on resize / orientationchange. */
  private _evaluate(): void {
    this._isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
    window.__OJIBWE_MOBILE = this._isMobile;
    document.body.classList.toggle('mobile', this._isMobile);
  }

  /** True when a mobile/touch device is detected. */
  isMobile(): boolean {
    return this._isMobile;
  }

  /**
   * Physical scale factor: how many physical pixels correspond to one
   * Phaser logical pixel (assuming a fixed 1280×720 game canvas in FIT mode).
   */
  physicalScale(): number {
    const gw = 1280;
    const gh = 720;
    return Math.min(window.innerWidth / gw, window.innerHeight / gh);
  }

  /**
   * Smallest logical size (Phaser game coords, 1280×720 space) that renders
   * as at least 44 physical pixels — Apple HIG / WCAG tap-target standard.
   * Returns 36 on desktop (adequate for mouse interaction).
   */
  minTapTarget(): number {
    if (!this._isMobile) return 36;
    const scale = this.physicalScale();
    return Math.max(44, Math.ceil(44 / Math.max(scale, 0.1)));
  }

  /**
   * Particle budget scale: 0.5 on mobile, 1.0 on desktop.
   * Multiply particle counts by this value to reduce load on mobile GPUs.
   */
  particleScale(): number {
    return this._isMobile ? 0.5 : 1.0;
  }

  /**
   * Phaser pointer event name for button taps.
   * Mobile uses 'pointerdown' for instant feedback (no press-release delay).
   * Desktop uses 'pointerup' for standard click behavior.
   */
  tapEvent(): string {
    return this._isMobile ? 'pointerdown' : 'pointerup';
  }
}

/** Shorthand: the Phaser pointer event name for button taps. */
export const TAP_EVENT = MobileManager.getInstance().tapEvent();
