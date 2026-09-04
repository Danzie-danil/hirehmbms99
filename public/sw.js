// Auto-generated BMS Service Worker - Version: v3.9.260 (Build: 1788517353067)
const APP_VERSION = 'v3.9.260';
const BUILD_TIMESTAMP = '1788517353067';
const CACHE_NAME = 'bmstz-pwa-v' + APP_VERSION + '-' + BUILD_TIMESTAMP;

const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/loading.gif?v=v3.9.260",
    "/manifest.json?v=v3.9.260",
    "/bmtzofficiallogo.png?v=v3.9.260",
    "/apple-touch-icon.png?v=v3.9.260",
    "/icon-192x192.png?v=v3.9.260",
    "/icon-512x512.png?v=v3.9.260",
    "/favicon-32x32.png?v=v3.9.260",
    "/favicon.ico?v=v3.9.260"
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            await Promise.allSettled(
                ASSETS_TO_CACHE.map(async (url) => {
                    try {
                        const res = await fetch(url, { cache: 'no-cache' });
                        if (res && res.ok) {
                            await cache.put(url, res);
                        }
                    } catch (e) {
                        console.warn('[PWA SW] Pre-caching asset notice:', url, e.message);
                    }
                })
            );
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
        self.skipWaiting();
    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((keyList) => {
                const appCaches = keyList
                    .filter((key) => key.startsWith('bmstz-pwa-v'))
                    .sort((a, b) => Number(b.split('-').pop()) - Number(a.split('-').pop()));
                const retainedCaches = new Set(appCaches.slice(0, 3));
                retainedCaches.add(CACHE_NAME);
                return Promise.all(
                    keyList.map((key) => {
                        if (key.startsWith('bmstz-pwa-v') && !retainedCaches.has(key)) return caches.delete(key);
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    const isSameOrigin = url.origin === self.location.origin;

    // Bypass localhost/127.0.0.1 development server, non-GET, Supabase API, and dynamic release notes
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    if (isLocalhost || request.method !== 'GET' || url.origin.includes('supabase.co') || url.pathname.includes('release_notes.json') || url.pathname.includes('@vite') || url.pathname.includes('/@fs/')) {
        return;
    }

    // Cross-origin assets (e.g. cdn.tailwindcss.com, unpkg, fonts, etc.)
    if (!isSameOrigin) {
        event.respondWith(
            (async () => {
                const cached = await caches.match(request);
                if (cached) return cached;

                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && networkResponse.status === 200) {
                        const contentType = networkResponse.headers.get('content-type') || '';
                        if (!contentType.includes('text/html')) {
                            const copy = networkResponse.clone();
                            const cache = await caches.open(CACHE_NAME);
                            await cache.put(request, copy);
                        }
                    }
                    return networkResponse;
                } catch (err) {
                    if (cached) return cached;
                    return Response.error();
                }
            })()
        );
        return;
    }

    // Navigation requests (HTML pages) - Network-First with instant, multi-tier Offline Fallback
    if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            (async () => {
                // 1. Try network first when online
                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        const cache = await caches.open(CACHE_NAME);
                        await cache.put(request, copy.clone());
                        if (url.pathname.startsWith('/app')) {
                            await cache.put('/app/index.html', copy.clone());
                            await cache.put('/app/', copy.clone());
                        } else {
                            await cache.put('/index.html', copy.clone());
                            await cache.put('/', copy.clone());
                        }
                        return networkResponse;
                    }
                } catch (err) {
                    // Network offline
                }

                // 2. Offline fallback: match requested URL, /app/index.html, /app/, /index.html, or /
                const cached = await caches.match(request) ||
                               await caches.match(url.pathname) ||
                               (url.pathname.startsWith('/app') ? (await caches.match('/app/index.html') || await caches.match('/app/')) : null) ||
                               await caches.match('/app/index.html') ||
                               await caches.match('/app/') ||
                               await caches.match('/index.html') ||
                               await caches.match('/');

                if (cached) {
                    return cached;
                }

                // 3. Check across all older cache versions if any
                const keys = await caches.keys();
                for (const key of keys) {
                    const oldCache = await caches.open(key);
                    const oldMatch = await oldCache.match('/app/index.html') ||
                                     await oldCache.match('/app/') ||
                                     await oldCache.match('/index.html') ||
                                     await oldCache.match(request);
                    if (oldMatch) return oldMatch;
                }

                // 4. Return offline splash fallback page
                return new Response(
                    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BMSTz Offline</title><style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;padding:20px;text-align:center}.card{background:#1e293b;padding:32px;border-radius:24px;border:1px solid #334155;max-width:420px}h1{font-size:20px;margin-bottom:8px;color:#fff}p{font-size:14px;color:#94a3b8;line-height:1.5;margin-bottom:24px}button{background:#4f46e5;color:#fff;border:none;padding:12px 24px;border-radius:12px;font-weight:700;cursor:pointer}</style></head><body><div class="card"><h1>Offline Mode</h1><p>You are currently offline. Connect to the internet once to cache the full workspace.</p><button onclick="location.reload()">Retry Connection</button></div></body></html>`,
                    { headers: { 'Content-Type': 'text/html' } }
                );
            })()
        );
        return;
    }

    // Static asset requests (Same-origin only)
    event.respondWith(
        (async () => {
            const cached = await caches.match(request) || await caches.match(url.pathname);

            const fetchPromise = fetch(request).then(async (networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const contentType = networkResponse.headers.get('content-type') || '';
                    if ((url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) && contentType.includes('text/html')) {
                        return networkResponse;
                    }
                    const copy = networkResponse.clone();
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(request, copy);
                }
                return networkResponse;
            }).catch(() => null);

            if (cached) {
                return cached;
            }

            const networkResponse = await fetchPromise;
            if (networkResponse) {
                return networkResponse;
            }

            const keys = await caches.keys();
            for (const key of keys) {
                const oldCache = await caches.open(key);
                const oldMatch = await oldCache.match(request) || await oldCache.match(url.pathname);
                if (oldMatch) return oldMatch;
            }

            return Response.error();
        })()
    );
});

// Push Notification Listener
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: 'BMS Notification', body: event.data ? event.data.text() : 'New update received' };
    }

    const title = data.title || 'BMS System Alert';
    const options = {
        body: data.body || 'You have a new update in BMS.',
        icon: data.icon || '/bmtzofficiallogo.png',
        badge: data.badge || '/bmtzofficiallogo.png',
        image: data.image_url || data.image || null,
        data: {
            url: data.target_url || data.url || '/app/'
        },
        vibrate: [100, 50, 100],
        tag: data.tag || 'bms-push-' + Date.now(),
        renotify: true
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || '/app/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    if (client.postMessage) {
                        client.postMessage({ type: 'NOTIFICATION_CTA_NAVIGATE', url: targetUrl, forceRefresh: true });
                    }
                    if ('navigate' in client && targetUrl !== '/app/') {
                        client.navigate(targetUrl);
                    }
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
