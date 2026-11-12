/* global self, clients */
// Imported by the generated service worker (vite-plugin-pwa / Workbox).
// Tapping a reminder notification brings the app back to the foreground.
// Its action buttons ("In 10 min", "Stop tonight") are passed to the app,
// which snoozes the child's reminders or asks for the parent PIN.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action; // '' when the notification itself is tapped
  const childId = event.notification.data && event.notification.data.childId;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const scope = self.registration.scope;
      const existing = windows.find((w) => w.url.startsWith(scope));
      if (existing) {
        if (action && childId) existing.postMessage({ type: 'kidu-reminder-action', action, childId });
        return existing.focus();
      }
      const url = action && childId ? `${scope}?reminderAction=${encodeURIComponent(action)}&child=${encodeURIComponent(childId)}` : scope;
      return clients.openWindow(url);
    })
  );
});
