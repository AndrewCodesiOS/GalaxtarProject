self.addEventListener("fetch", (event) => {
  // Basic pass-through service worker to satisfy PWA install criteria
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
