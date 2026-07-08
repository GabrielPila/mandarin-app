const CACHE = 'mandarin-v0.6.4';
const ASSETS = [
  '.', 'index.html', 'css/app.css',
  'js/core.js', 'js/srs.js', 'js/app.js',
  'data/book1-vocab.js', 'data/book1-sup.js', 'data/book1-texts.js', 'data/book1-readings.js',
  'data/book2-vocab.js', 'data/book2-sup.js', 'data/book2-texts.js', 'data/book2-readings.js',
  'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request, {ignoreSearch:true}).then(hit =>
      hit || fetch(e.request).then(res => {
        if(e.request.method === 'GET' && res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
    )
  );
});
