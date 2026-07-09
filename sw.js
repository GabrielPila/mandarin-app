const CACHE = 'mandarin-v0.8.0';
const ASSETS = [
  '.', 'index.html', 'css/app.css',
  'js/main.js', 'js/router.js', 'js/dict.js', 'js/store.js', 'js/srs.js',
  'js/audio.js', 'js/i18n.js', 'js/ui.js', 'js/numbers.js', 'js/concordance.js',
  'js/views/study.js', 'js/views/cards.js', 'js/views/texts.js', 'js/views/vocab.js',
  'js/views/grammar.js', 'js/views/settings.js',
  'js/views/practice/corpus.js', 'js/views/practice/cloze.js', 'js/views/practice/builder.js',
  'js/views/practice/pairs.js', 'js/views/practice/tones.js', 'js/views/practice/numbers.js',
  'data/index.js', 'data/grammar.js',
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
