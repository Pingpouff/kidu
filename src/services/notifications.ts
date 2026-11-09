/**
 * System notifications.
 *
 * Android Chrome (browser and installed PWA) does not allow `new Notification()`
 * ("Illegal constructor"): notifications must go through the service worker
 * (`registration.showNotification`). Desktop browsers accept both, so the
 * service worker is used whenever available and the constructor is a fallback.
 */

export type NotificationStatus = 'unsupported' | 'default' | 'granted' | 'denied';

export function notificationStatus(): NotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Asks the user for permission. Must be called from a user gesture (tap / click),
 * which is what Android requires to show its permission prompt.
 */
export async function requestNotificationPermission(): Promise<NotificationStatus> {
  const status = notificationStatus();
  if (status === 'unsupported' || status === 'granted' || status === 'denied') return status;
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationStatus();
  }
}

/**
 * Shows a system notification. Returns false when it couldn't be shown
 * (no permission, unsupported browser…).
 */
export async function showSystemNotification(
  title: string,
  options: { body: string; tag?: string }
): Promise<boolean> {
  if (notificationStatus() !== 'granted') return false;
  // Android needs PNGs: a color icon, and a white monochrome badge for the status bar
  const fullOptions: NotificationOptions = {
    ...options,
    icon: `${import.meta.env.BASE_URL}icon-192.png`,
    badge: `${import.meta.env.BASE_URL}badge-96.png`,
  };

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, fullOptions);
      return true;
    }
  } catch {
    /* fall back below */
  }

  try {
    new Notification(title, fullOptions);
    return true;
  } catch {
    // Android without an active service worker (e.g. dev server)
    return false;
  }
}
