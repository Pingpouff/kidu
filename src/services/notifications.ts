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
export interface NotificationAction {
  action: string;
  title: string;
}

export async function showSystemNotification(
  title: string,
  options: { body: string; tag?: string; data?: unknown; actions?: NotificationAction[] }
): Promise<boolean> {
  if (notificationStatus() !== 'granted') return false;
  // Android needs PNGs: a color icon, and a white monochrome badge for the status bar
  // `actions` (buttons under an Android notification) only exist for service worker notifications
  const fullOptions: NotificationOptions & { actions?: NotificationAction[]; renotify?: boolean } = {
    ...options,
    renotify: true,
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
    const plain = { ...fullOptions };
    delete plain.actions; // not allowed outside a service worker
    new Notification(title, plain);
    return true;
  } catch {
    // Android without an active service worker (e.g. dev server)
    return false;
  }
}

/** A button of a reminder notification, tapped while the app was in the background. */
export interface ReminderAction {
  action: 'snooze' | 'mute';
  childId: string;
}

const isReminderAction = (action: unknown): action is ReminderAction['action'] => action === 'snooze' || action === 'mute';

/**
 * Listens to notification buttons: from the service worker when the app is
 * open, or from the URL when the tap reopened it. Returns the unsubscribe.
 */
export function onReminderAction(handler: (action: ReminderAction) => void): () => void {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('reminderAction');
  const child = params.get('child');
  if (isReminderAction(fromUrl) && child) {
    window.history.replaceState(window.history.state, '', window.location.pathname);
    window.setTimeout(() => handler({ action: fromUrl, childId: child }), 0);
  }
  const onMessage = (e: MessageEvent) => {
    const data = e.data as { type?: string; action?: unknown; childId?: unknown } | null;
    if (data?.type === 'kidu-reminder-action' && isReminderAction(data.action) && typeof data.childId === 'string') {
      handler({ action: data.action, childId: data.childId });
    }
  };
  navigator.serviceWorker?.addEventListener('message', onMessage);
  return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
}
