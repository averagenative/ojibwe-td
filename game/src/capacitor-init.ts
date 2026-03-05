/**
 * Capacitor native API initialization — only runs when inside the native
 * iOS/Android shell, no-ops in browser.
 */

function isCapacitor(): boolean {
  return !!(window as unknown as Record<string, unknown>).Capacitor;
}

export async function initCapacitorNative(): Promise<void> {
  if (!isCapacitor()) return;

  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.hide();

  const { SplashScreen } = await import('@capacitor/splash-screen');
  await SplashScreen.hide();
}

/**
 * Trigger haptic feedback on tower placement / boss kill.
 */
export async function hapticLight(): Promise<void> {
  if (!isCapacitor()) return;
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  await Haptics.impact({ style: ImpactStyle.Light });
}

/**
 * Keep screen awake during gameplay.
 */
export async function keepScreenAwake(): Promise<void> {
  if (!isCapacitor()) return;
  const { KeepAwake } = await import('@capacitor-community/keep-awake');
  await KeepAwake.keepAwake();
}
