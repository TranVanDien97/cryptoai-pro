/**
 * StockAI — Notification Service Client
 *
 * REST API client for the notification service.
 */
import axios from 'axios';

const NOTIFICATION_URL = __DEV__
  ? 'http://10.0.2.2:3002'
  : 'http://localhost:3002';

const client = axios.create({
  baseURL: NOTIFICATION_URL,
  timeout: 10000,
});

export interface NotificationRecord {
  id: string;
  alert: {
    id: string;
    type: string;
    symbol: string;
    title: string;
    message: string;
    priority: string;
    data: Record<string, unknown>;
    timestamp: number;
  };
  sentAt: number;
  deliveredVia: string;
  read: boolean;
}

export const notificationApi = {
  /**
   * Register this device's FCM token with the notification service.
   */
  async registerDevice(userId: string, token: string, platform: 'ios' | 'android') {
    const res = await client.post('/api/v1/devices/register', { userId, token, platform });
    return res.data;
  },

  /**
   * Fetch notification history.
   */
  async getNotifications(limit = 50, offset = 0, type?: string): Promise<{
    data: NotificationRecord[];
    pagination: { total: number; limit: number; offset: number };
  }> {
    const params: Record<string, string | number> = { limit, offset };
    if (type) params.type = type;
    const res = await client.get('/api/v1/notifications', { params });
    return res.data;
  },

  /**
   * Get unread notification count.
   */
  async getUnreadCount(): Promise<number> {
    const res = await client.get('/api/v1/notifications/unread-count');
    return res.data.data.unreadCount;
  },

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId: string) {
    const res = await client.put(`/api/v1/notifications/${notificationId}/read`);
    return res.data;
  },

  /**
   * Mark all notifications as read.
   */
  async markAllAsRead() {
    const res = await client.put('/api/v1/notifications/read-all');
    return res.data;
  },

  /**
   * Get user notification preferences.
   */
  async getPreferences(userId: string) {
    const res = await client.get(`/api/v1/preferences/${userId}`);
    return res.data.data;
  },

  /**
   * Update user notification preferences.
   */
  async updatePreferences(userId: string, prefs: Record<string, boolean | string>) {
    const res = await client.put(`/api/v1/preferences/${userId}`, prefs);
    return res.data.data;
  },
};
