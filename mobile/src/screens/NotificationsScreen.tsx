/**
 * NotificationsScreen — In-app notification center
 */
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../theme';
import {useMarketStore, AppNotification} from '../stores/marketStore';

const typeConfig: Record<string, {emoji: string; color: string}> = {
  AI_SIGNAL: {emoji: '🤖', color: colors.aiGold},
  PRICE_TARGET: {emoji: '🎯', color: colors.primary},
  VOLUME_SPIKE: {emoji: '📊', color: colors.gain},
  NEWS: {emoji: '📰', color: colors.primaryLight},
};

function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function NotificationItem({item, onPress}: {item: AppNotification; onPress: () => void}) {
  const config = typeConfig[item.type] || {emoji: '🔔', color: colors.textSecondary};

  return (
    <TouchableOpacity
      style={[styles.notifItem, !item.read && styles.notifUnread]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.notifIcon, {backgroundColor: config.color + '20'}]}>
        <Text style={styles.notifEmoji}>{config.emoji}</Text>
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifHeader}>
          <Text style={styles.notifTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notifMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <View style={styles.notifMeta}>
          <Text style={[styles.notifType, {color: config.color}]}>
            {item.type.replace('_', ' ')}
          </Text>
          <Text style={styles.notifTime}>{formatTimestamp(item.timestamp)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function NotificationsScreen() {
  const {notifications, markNotificationRead, markAllNotificationsRead} = useMarketStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  // Add some demo notifications if empty
  const displayNotifications = notifications.length > 0
    ? notifications
    : getDemoNotifications();

  const renderItem = ({item}: {item: AppNotification}) => (
    <NotificationItem
      item={item}
      onPress={() => markNotificationRead(item.id)}
    />
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSubtitle}>{unreadCount} thông báo chưaọc</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllNotificationsRead}>
            <Text style={styles.markAllText}>Đọc tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={displayNotifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
            <Text style={styles.emptyText}>
              Khi AI phát hiện cơ hộiầu tư hoặc coinạt mốc giá,
              bạn sẽ nhậnược thông báo tạiây.
            </Text>
          </View>
        }
      />
    </View>
  );
}

/** Demo notifications for when no real ones exist yet */
function getDemoNotifications(): AppNotification[] {
  const now = Date.now();
  return [
    {
      id: 'demo1',
      type: 'AI_SIGNAL',
      symbol: 'FPT',
      title: '🤖 FPT — MUA MẠNH',
      message: 'StockAI khuyến nghị MUA MẠNH cho FPT (ộ tin cậy 92%). RSI = 32 — gần vùng quá bán.',
      priority: 'HIGH',
      timestamp: now - 15 * 60_000,
      read: false,
    },
    {
      id: 'demo2',
      type: 'VOLUME_SPIKE',
      symbol: 'HPG',
      title: '📊 HPG — Khối lượngột biến',
      message: 'Khối lượng HPG gấp 2.5x trung bình phiên (18.9M CP). Theo dõi chặt chẽ.',
      priority: 'MEDIUM',
      timestamp: now - 45 * 60_000,
      read: false,
    },
    {
      id: 'demo3',
      type: 'PRICE_TARGET',
      symbol: 'VNM',
      title: '🎯 VNMạt mốc giá',
      message: 'VNMã vượt 72, (mục tiêu bạnãặt). Cân nhắc chốt lời.',
      priority: 'HIGH',
      timestamp: now - 2 * 3600_000,
      read: true,
    },
    {
      id: 'demo4',
      type: 'AI_SIGNAL',
      symbol: 'MWG',
      title: '🤖 MWG — MUA MẠNH',
      message: 'Golden Cross — SMA(50) cắt lên SMA(200). ROE = 28% — vượt trội ngành bán lẻ.',
      priority: 'HIGH',
      timestamp: now - 3 * 3600_000,
      read: true,
    },
    {
      id: 'demo5',
      type: 'NEWS',
      symbol: 'FPT',
      title: '📰 FPT ký hợpồng AI $200M',
      message: 'FPT Corporation ký hợpồng trị giá 200 triệu USD vớiối tác Nhật Bản trong lĩnh vực AI.',
      priority: 'MEDIUM',
      timestamp: now - 5 * 3600_000,
      read: true,
    },
  ];
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl + spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.heading1,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  markAllBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '20',
  },
  markAllText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  notifItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifUnread: {
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  notifEmoji: {
    fontSize: 20,
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  notifTitle: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  notifMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  notifMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notifType: {
    ...typography.overline,
    fontSize: 9,
  },
  notifTime: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
