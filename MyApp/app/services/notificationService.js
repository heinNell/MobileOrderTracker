// services/notificationService.js
// Fallback file - should not be imported directly
// Use notificationService.web.js or notificationService.native.js

// Export empty stub to prevent build errors when Metro scans files
// This file should never actually be used - platform-specific files are loaded instead
const notificationService = {
  requestPermissions: async () => {
    console.warn('notificationService.js: Use platform-specific file (.web.js or .native.js)');
    return { status: 'denied' };
  },
  scheduleNotification: async () => {
    console.warn('notificationService.js: Use platform-specific file (.web.js or .native.js)');
    return null;
  },
  addNotificationReceivedListener: () => {
    console.warn('notificationService.js: Use platform-specific file (.web.js or .native.js)');
    return { remove: () => {} };
  },
  addNotificationResponseReceivedListener: () => {
    console.warn('notificationService.js: Use platform-specific file (.web.js or .native.js)');
    return { remove: () => {} };
  },
};

export default notificationService;
