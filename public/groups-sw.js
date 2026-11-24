self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function sanitizeRelativeUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return '/';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed, self.location.origin);
    if (parsed.origin === self.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
    }
  } catch {
    // Ignore invalid URL
  }
  return '/';
}

function sanitizeIconUrl(rawIcon) {
  if (typeof rawIcon === 'string') {
    const trimmed = rawIcon.trim();
    if (trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  }
  return '/icon.png';
}

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      const text = event.data.text();
      payload = { data: { body: text } };
    }
  }

  const data = (payload && payload.data) || {};
  const notif = (payload && payload.notification) || {};

  const title =
    data.title || notif.title || 'New Group Added in Groupsor! Join Fast';
  const body =
    data.body ||
    notif.body ||
    'A fresh WhatsApp group or channel just went live. Tap to join!';
  const targetUrl = sanitizeRelativeUrl(
    data.url || (payload.fcmOptions && payload.fcmOptions.link) || '/'
  );
  const icon = sanitizeIconUrl(data.icon || notif.icon);
  const tag =
    typeof data.tag === 'string' && data.tag
      ? data.tag
      : `groupsor-push-${Date.now()}`;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icon.png',
      tag,
      renotify: false,
      data: { url: targetUrl },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = sanitizeRelativeUrl(
    event.notification.data && event.notification.data.url
  );

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            if ('navigate' in client) {
              client.navigate(targetUrl).catch(() => {});
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
