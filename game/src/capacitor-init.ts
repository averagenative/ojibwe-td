/**
 * Capacitor native API initialization — only runs when inside the native
 * iOS/Android shell, no-ops in browser.
 */

function isCapacitor(): boolean {
  return !!(window as unknown as Record<string, unknown>).Capacitor;
}

export async function initCapacitorNative(): Promise<void> {
  if (!isCapacitor()) return;

  // Status bar hidden via Info.plist (UIStatusBarHidden + UIViewControllerBasedStatusBarAppearance)
  // Splash screen handled by native LaunchScreen storyboard (auto-dismissed)
}

// Use variable imports so TypeScript doesn't resolve these at compile time.
// On machines without Capacitor packages (e.g. Linux server), the dynamic
// import fails at runtime but is caught — no-op in browser anyway.
const HAPTICS_PKG = '@capacitor/haptics';
const KEEPAWAKE_PKG = '@capacitor-community/keep-awake';

/**
 * Trigger haptic feedback on tower placement / boss kill.
 */
export async function hapticLight(): Promise<void> {
  if (!isCapacitor()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(/* @vite-ignore */ HAPTICS_PKG);
    await mod.Haptics.impact({ style: mod.ImpactStyle.Light });
  } catch { /* Capacitor plugin not installed — skip */ }
}

/**
 * Keep screen awake during gameplay.
 */
export async function keepScreenAwake(): Promise<void> {
  if (!isCapacitor()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(/* @vite-ignore */ KEEPAWAKE_PKG);
    await mod.KeepAwake.keepAwake();
  } catch { /* Capacitor plugin not installed — skip */ }
}
