self.addEventListener('push', function(event) {
  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const isAdminOpen = clientList.some(client => client.url.includes('/admin'));
    if (isAdminOpen) return;

  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'شركة الوفاء', body: event.data.text() };
    }
  }

  const title = payload.title || 'إشعار جديد';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/logo.jpeg.jpeg',
    badge: '/logo.jpeg.jpeg',
    data: { url: payload.url || '/' }
  };

  await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
