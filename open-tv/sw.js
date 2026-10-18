// Retirement worker: clear the prototype's broad cache, then release control.
// The app uses HTTP caching for immutable build assets. Never persist viewing requests.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) {
    if (key.startsWith('opentv-')) await caches.delete(key);
  }
  await self.clients.claim();
  await self.registration.unregister();
})()));
