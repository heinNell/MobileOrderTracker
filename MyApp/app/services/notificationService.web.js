// notificationService.web.js
export const showNotification = (message) => {
  if ('Notification' in window && window.Notification.permission === 'granted') {
    new window.Notification(message);
  } else {
    console.log('Web notification:', message);
    // Fallback: you could show a toast or modal here
  }
};

export const requestPermission = async () => {
  if ('Notification' in window) {
    const permission = await window.Notification.requestPermission();
    return permission;
  }
  return 'granted';
};
