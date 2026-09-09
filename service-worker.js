// ============================================================
// Service Worker - منصة Mrs Sally التعليمية
// ============================================================
const CACHE_NAME = 'sally-platform-v1';
const APP_SHELL = [
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// عند التثبيت: تخزين هيكل التطبيق الأساسي (App Shell) في الكاش
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

// عند التفعيل: حذف أي نسخ كاش قديمة
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
});

// استراتيجية الجلب: الشبكة أولاً (لأحدث نسخة)، ولو النت ضعيف/مقطوع نرجع للكاش
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // لا نتدخل في طلبات Firestore/الـ APIs الخارجية، فقط ملفات الموقع نفسه
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
});

// ============================================================
// استقبال إشعارات Push حقيقية (حتى لو الموقع مقفول تمامًا)
// ============================================================
self.addEventListener('push', (event) => {
    let data = { title: 'إشعار جديد', body: '' };
    try {
        if (event.data) data = event.data.json();
    } catch (e) {
        data.body = event.data ? event.data.text() : '';
    }

    const options = {
        body: data.body || '',
        icon: './icon-192.png',
        badge: './icon-192.png',
        dir: 'rtl',
        lang: 'ar',
        tag: 'sally-push-' + Date.now(),
        vibrate: [200, 100, 200]
    };

    event.waitUntil(self.registration.showNotification(data.title || 'إشعار جديد', options));
});

// عند الضغط على الإشعار: فتح/تركيز نافذة الموقع
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
            for (const client of clientsList) {
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('./index.html');
        })
    );
});
