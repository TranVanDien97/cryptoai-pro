/**
 * HomeScreen — Dashboard overview with market indices, AI signals, watchlist, news
 */
import React, {useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {colors, spacing, typography} from '../theme';
import {useMarketStore} from '../stores/marketStore';
import {MarketIndexCard} from '../components/MarketIndexCard';
import {StockCard} from '../components/StockCard';
import {SignalCard} from '../components/SignalCard';
import {NewsCard} from '../components/NewsCard';
import {SectionHeader} from '../components/SectionHeader';
import {formatLargeNumber, formatPercent} from '../utils/formatters';
import {wsService} from '../services/websocket';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const {indices, stocks, signals, news, watchlist, portfolio, isLoading, refreshData, notifications} =
    useMarketStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  const watchlistStocks = stocks.filter(s => watchlist.includes(s.symbol));
  const featuredSignals = signals.filter(
    s => s.signal === 'STRONG_BUY' || s.signal === 'BUY' || s.signal === 'STRONG_SELL',
  ).slice(0, 4);

  const onRefresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Xin chào 👋</Text>
          <Text style={styles.appName}>StockAI</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Connection status */}
          <View style={[styles.connectionDot, {backgroundColor: wsService.isConnected ? colors.gain : colors.textTertiary}]} />
          <Text style={styles.connectionText}>{wsService.isConnected ? 'LIVE' : 'OFFLINE'}</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn} onPress={() => navigation.navigate('Notifications')}>
          <Text style={styles.notificationIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        {/* Portfolio Summary */}
        <View style={styles.portfolioCard}>
          <Text style={styles.portfolioLabel}>Tổng danh mục</Text>
          <Text style={styles.portfolioValue}>{formatLargeNumber(portfolio.totalValue)}</Text>
          <View style={styles.pnlRow}>
            <Text
              style={[
                styles.pnlValue,
                {color: portfolio.totalPnl >= 0 ? colors.gain : colors.loss},
              ]}>
              {portfolio.totalPnl >= 0 ? '▲' : '▼'} {formatLargeNumber(Math.abs(portfolio.totalPnl))}
            </Text>
            <Text
              style={[
                styles.pnlPercent,
                {
                  color: portfolio.totalPnlPercent >= 0 ? colors.gain : colors.loss,
                  backgroundColor:
                    portfolio.totalPnlPercent >= 0 ? colors.gainBg : colors.lossBg,
                },
              ]}>
              {formatPercent(portfolio.totalPnlPercent)}
            </Text>
          </View>
        </View>

        {/* Market Indices */}
        <SectionHeader title="Chỉ số thị trường" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.indicesRow}>
          {indices.map(index => (
            <MarketIndexCard key={index.name} index={index} />
          ))}
        </ScrollView>

        {/* Featured AI Signals */}
        <SectionHeader
          title="✨ Tín hiệu AI nổi bật"
          actionText="Xem tất cả"
          onAction={() => {}}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.signalsRow}>
          {featuredSignals.map(signal => (
            <SignalCard key={signal.id} signal={signal} compact />
          ))}
        </ScrollView>

        {/* Watchlist */}
        <SectionHeader
          title="📋 Coin theo dõi"
          actionText={`${watchlistStocks.length} mã`}
        />
        {watchlistStocks.slice(0, 6).map(stock => (
          <StockCard key={stock.symbol} stock={stock} />
        ))}

        {/* Latest News */}
        <SectionHeader title="📰 Tin tức mới nhất" actionText="Xem tất cả" onAction={() => {}} />
        {news.slice(0, 4).map(item => (
          <NewsCard key={item.id} item={item} />
        ))}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
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
    backgroundColor: colors.background,
  },
  greeting: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  appName: {
    ...typography.heading1,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationIcon: {
    fontSize: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xxs,
  },
  connectionText: {
    ...typography.overline,
    color: colors.textTertiary,
    fontSize: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.loss,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.card,
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  portfolioCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginTop: spacing.sm,
  },
  portfolioLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  portfolioValue: {
    ...typography.hero,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pnlValue: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  pnlPercent: {
    ...typography.caption,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  indicesRow: {
    paddingRight: spacing.lg,
  },
  signalsRow: {
    paddingRight: spacing.lg,
  },
  bottomSpacer: {
    height: spacing.xxxl,
  },
});
