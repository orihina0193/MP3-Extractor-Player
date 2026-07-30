let wakeLockSentinel: any = null;

/**
 * 画面のスリープ（消灯・ロック）を防止する Wake Lock を要求する
 */
export async function requestWakeLock(): Promise<boolean> {
  if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
      return true;
    } catch (err) {
      console.warn("Wake Lock request failed:", err);
    }
  }
  return false;
}

/**
 * 画面スリープ防止を解除する
 */
export async function releaseWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
    } catch (err) {
      console.warn("Wake Lock release failed:", err);
    }
  }
}
