// Минимальный service worker: даёт установить игру как приложение и
// открывать её офлайн (последней загруженной версией), если сети нет.
// Стратегия — network-first: онлайн всегда отдаём свежий index.html,
// офлайн — то, что успело закэшироваться при последнем успешном визите.
const CACHE = "pipeline-shell-v2";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // Новая версия игры (/next/, /play/) живёт рядом и сама отвечает за свои файлы:
  // кэш этого воркера отдавал бы устаревшую сборку на втором устройстве.
  const path = new URL(e.request.url).pathname;
  if (path.includes("/next/") || path.includes("/play/")) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match("./index.html")))
  );
});
