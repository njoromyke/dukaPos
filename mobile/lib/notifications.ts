import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'DukaPoS',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID
      || Constants.easConfig?.projectId
      || Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      throw new Error('Expo project ID is missing. Run eas init or set EXPO_PUBLIC_PROJECT_ID.');
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

    await api.post('/api/notifications/push-token', { token: tokenData.data });

    return tokenData.data;
  } catch (error) {
    console.warn('Push notification registration failed:', error);
    return null;
  }
}
