import * as Notifications from 'expo-notifications'; // Import Notifications
// Remove unused import if not needed
// import { showNotification } from '../services/notificationService.native';

const NotificationService = {
    setupPushTokenListener: () => {
        return Notifications.addPushTokenListener((token) => {
            console.log('Push token changed:', token);
            // Handle token change logic here
        });
    },
    
    getPushToken: async () => {
        try {
            const token = await Notifications.getExpoPushTokenAsync();
            return token;
        } catch (error) {
            console.error('Error getting push token:', error);
            return null;
        }
    }
};

export default NotificationService;
