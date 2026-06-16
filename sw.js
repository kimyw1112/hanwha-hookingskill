// Service Worker - 캐시 무결성 개선 버전
const CACHE = 'hanwha-fp-v3';
// 캐시할 핵심 파일만 명시적으로 지정
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192-v2.png',
  './icon-512-v2.png'
];

// 설치: 핵심 파일만 캐시
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // 캐시 실패해도 설치 계속
  );
});

// 활성화: 이전 버전 캐시 모두 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 요청 처리: GET만, 같은 오리진만 캐시
// Stale-While-Revalidate: 캐시 즉시 반환 + 백그라운드 갱신
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== location.origin) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        // 백그라운드 갱신 (무결성: 항상 최신 서버 버전으로 업데이트)
        const networkFetch = fetch(e.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
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
