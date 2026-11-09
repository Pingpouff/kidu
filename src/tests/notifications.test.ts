import { describe, it, expect, vi, afterEach } from 'vitest';
import { showSystemNotification, requestNotificationPermission, notificationStatus } from '../services/notifications';

type Ctor = { new (title: string, options?: NotificationOptions): unknown; permission: NotificationPermission; requestPermission: () => Promise<NotificationPermission> };

const installNotification = (permission: NotificationPermission, { constructorThrows = false } = {}) => {
  const created: string[] = [];
  const ctor = function (this: unknown, title: string) {
    if (constructorThrows) throw new TypeError('Illegal constructor');
    created.push(title);
  } as unknown as Ctor;
  ctor.permission = permission;
  ctor.requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
  vi.stubGlobal('Notification', ctor);
  return { created, ctor };
};

const installServiceWorker = (registration: unknown) => {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn(async () => registration) },
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined });
});

describe('System notifications', () => {
  it('goes through the service worker when available (required on Android)', async () => {
    const { created } = installNotification('granted', { constructorThrows: true });
    const showNotification = vi.fn(async () => {});
    installServiceWorker({ showNotification });

    expect(await showSystemNotification('⏰ Léo', { body: 'Devoirs', tag: 't' })).toBe(true);
    expect(showNotification).toHaveBeenCalledWith('⏰ Léo', expect.objectContaining({ body: 'Devoirs', tag: 't' }));
    expect(created).toEqual([]);
  });

  it('falls back on the Notification constructor without service worker (desktop)', async () => {
    const { created } = installNotification('granted');
    installServiceWorker(undefined);
    expect(await showSystemNotification('⏰ Léo', { body: 'Devoirs' })).toBe(true);
    expect(created).toEqual(['⏰ Léo']);
  });

  it('reports failure instead of throwing when nothing works (Android without service worker)', async () => {
    installNotification('granted', { constructorThrows: true });
    installServiceWorker(undefined);
    expect(await showSystemNotification('⏰', { body: 'x' })).toBe(false);
  });

  it('shows nothing without permission', async () => {
    installNotification('denied');
    const showNotification = vi.fn();
    installServiceWorker({ showNotification });
    expect(await showSystemNotification('⏰', { body: 'x' })).toBe(false);
    expect(showNotification).not.toHaveBeenCalled();
  });

  it('only prompts when the permission was never asked', async () => {
    const { ctor } = installNotification('default');
    expect(await requestNotificationPermission()).toBe('granted');
    expect(ctor.requestPermission).toHaveBeenCalledTimes(1);

    const denied = installNotification('denied');
    expect(await requestNotificationPermission()).toBe('denied');
    expect(denied.ctor.requestPermission).not.toHaveBeenCalled();
  });

  it('detects unsupported browsers', () => {
    vi.stubGlobal('Notification', undefined);
    // `'Notification' in window` is still true with an undefined stub; delete it instead
    delete (window as unknown as Record<string, unknown>).Notification;
    expect(notificationStatus()).toBe('unsupported');
  });
});
