const CACHE = 'hanwha-fp-v1';
const CORE = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

// 설치 시 핵심 파일만 캐시
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

// 활성화 시 이전 캐시 전부 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 요청 처리: 캐시 우선 → 네트워크 fallback → 캐시 업데이트
self.addEventListener('fetch', e => {
  // GET 요청만 처리
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // 같은 오리진 요청만 캐시 처리
  if (url.origin !== location.origin) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        // 백그라운드에서 네트워크 요청 → 캐시 갱신 (stale-while-revalidate)
        const networkFetch = fetch(e.request).then(response => {
          if (response && response.status === 200) {
            cache.put(e.request, response.clone());
          }
          return response;
        }).catch(() => null);

        // 캐시 있으면 즉시 반환, 없으면 네트워크 대기
        return cached || networkFetch;
      })
    )
  );
});
