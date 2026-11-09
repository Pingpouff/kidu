import { useSyncExternalStore } from 'react';

/**
 * Installing the app on the device.
 *
 * Chrome / Edge / Android fire `beforeinstallprompt` when the app can be
 * installed. Their own invitation is easy to miss (an icon in the address bar
 * on desktop, a mini-bar shown once on Android, hidden for weeks after a
 * dismissal), so we keep the event and offer our own "Install" button.
 * Safari (iPhone / iPad) has no such event: installing goes through
 * Share → "Add to Home Screen", which we explain instead.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState =
  | { kind: 'installed' } // running as an installed app, or installed during this visit
  | { kind: 'available' } // the browser can install it: install() shows its dialog
  | { kind: 'ios' } // Safari on iPhone / iPad: Share → Add to Home Screen
  | { kind: 'unavailable' }; // nothing we can do from here (unsupported browser, criteria not met yet)

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Running as an installed app (home screen icon / app window). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Safari on iPhone / iPad (iPadOS presents itself as a Mac with a touch screen). */
export function isIosSafari(userAgent: string, maxTouchPoints: number): boolean {
  const ios = /iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && maxTouchPoints > 1);
  const otherBrowser = /crios|fxios|edgios/i.test(userAgent);
  return ios && !otherBrowser;
}

export function currentInstallState(): InstallState {
  if (installedNow || isStandalone()) return { kind: 'installed' };
  if (deferred) return { kind: 'available' };
  if (typeof navigator !== 'undefined' && isIosSafari(navigator.userAgent, navigator.maxTouchPoints ?? 0)) {
    return { kind: 'ios' };
  }
  return { kind: 'unavailable' };
}

// Registered when the module loads (imported from main.tsx), before React mounts:
// the event can fire very early.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own invitation
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedNow = true;
    notify();
  });
}

/** Shows the browser's install dialog. Resolves to true when the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null; // an event can only be used once
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') installedNow = true;
  notify();
  return outcome === 'accepted';
}

let snapshot: InstallState = { kind: 'unavailable' };
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => {
  const next = currentInstallState();
  if (next.kind !== snapshot.kind) snapshot = next;
  return snapshot;
};

/** Current install state, updated when the browser allows / completes an install. */
export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const DISMISS_KEY = 'kidu.installDismissedAt';
/** The home screen invitation comes back this long after "Not now". */
export const INSTALL_REMINDER_DAYS = 30;

export function installInviteDismissed(now: number = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && now - at < INSTALL_REMINDER_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function dismissInstallInvite(now: number = Date.now()): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(now));
  } catch {
    // Best effort: the invitation will just come back next time
  }
}
