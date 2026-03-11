// Push notification handler for service worker
self.addEventListener('push', (event) => {
    const defaultData = {
        title: 'EliteGold',
        body: 'New competition update',
        icon: '/pwa/icon-192.png',
        badge: '/pwa/icon-192.png',
        url: '/'
    };

    let data = defaultData;
    try {
        if (event.data) {
            data = { ...defaultData, ...event.data.json() };
        }
    } catch {
        if (event.data) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            data: { url: data.url },
            vibrate: [200, 100, 200],
            tag: data.tag || 'elitegold-notification',
            renotify: true
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});
