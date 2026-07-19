/**
 * CryptoAI — Notification Service (using Expo Notifications)
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationApi = {
  /**
   * Request push notification permissions and register for token.
   */
  async registerForPushNotificationsAsync(): Promise<string | undefined> {
    if (Platform.OS === 'web') return;
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return;
    }
    
    // Get Expo Push Token
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      console.log('[Notification] Expo Token:', tokenData.data);
      return tokenData.data;
    } catch (e) {
      console.error('[Notification] Error getting token:', e);
    }
  },

  /**
   * Send a local push notification (instantly).
   */
  async sendLocalNotification(title: string, body: string, data: Record<string, any> = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // null trigger sends it immediately
    });
  },

  /**
   * Schedule a notification for a price target.
   */
  async schedulePriceAlert(symbol: string, targetPrice: number, currentPrice: number) {
    const isAbove = targetPrice > currentPrice;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚨 Cảnh báo giá ${symbol}`,
        body: `Giá ${symbol} đã ${isAbove ? 'vượt' : 'giảm xuống'} mục tiêu ${targetPrice}!`,
        data: { symbol, targetPrice },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
  },
};
