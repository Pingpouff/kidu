import { describe, it, expect, vi } from 'vitest';
import {
  currentInstallState,
  dismissInstallInvite,
  installInviteDismissed,
  INSTALL_REMINDER_DAYS,
  isIosSafari,
  promptInstall,
} from '../services/install';

const DAY = 24 * 60 * 60 * 1000;

describe('Installing the app', () => {
  it('recognises Safari on iPhone and iPad, not other iOS browsers or desktops', () => {
    expect(isIosSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Safari', 5)).toBe(true);
    expect(isIosSafari('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari', 5)).toBe(true); // iPadOS
    expect(isIosSafari('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari', 0)).toBe(false); // a Mac
    expect(isIosSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/130', 5)).toBe(false);
    expect(isIosSafari('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile', 5)).toBe(false);
  });

  it('keeps the browser event, shows its dialog once, and knows when it is installed', async () => {
    expect(currentInstallState().kind).toBe('unavailable');
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(() => Promise.resolve()),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true); // our own invitation replaces the browser's
    expect(currentInstallState().kind).toBe('available');

    expect(await promptInstall()).toBe(true);
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(currentInstallState().kind).toBe('installed');
    expect(await promptInstall()).toBe(false); // an event can only be used once
  });

  it('"Not now" hides the invitation for a while', () => {
    const now = 1000 * DAY;
    expect(installInviteDismissed(now)).toBe(false);
    dismissInstallInvite(now);
    expect(installInviteDismissed(now + DAY)).toBe(true);
    expect(installInviteDismissed(now + (INSTALL_REMINDER_DAYS + 1) * DAY)).toBe(false);
  });
});
