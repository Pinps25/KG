const CACHE_NAME = 'pesagem-cache-v5';

const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.12.3/JsBarcode.all.min.js'
];

// Instala e guarda o "esqueleto" do app em cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Remove caches antigos quando uma nova versão é publicada
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Dados.csv: tenta a rede primeiro (pega dados novos), cai pro cache se estiver offline.
  // Usamos a URL sem query string como chave de cache, porque a página adiciona
  // parâmetros de cache-busting que mudam a cada carregamento.
  if (url.includes('Dados.csv')) {
    const cacheKey = new Request(url.split('?')[0]);
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, clone));
          return response;
        })
        .catch(() => caches.match(cacheKey))
    );
    return;
  }

  // Resto do app: cache primeiro, com atualização em segundo plano
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
