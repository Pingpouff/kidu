/* global self, clients */
// Imported by the generated service worker (vite-plugin-pwa / Workbox).
// Tapping a reminder notification brings the app back to the foreground.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const scope = self.registration.scope;
      const existing = windows.find((w) => w.url.startsWith(scope));
      if (existing) return existing.focus();
      return clients.openWindow(scope);
    })
  );
});
