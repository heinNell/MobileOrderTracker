self.addEventListener('push', (event) => {
  const data = event.data.json();
  const { title, body } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon.png', // Optional: Add an icon for the notification
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/')); // Redirect on click
});