/**
 * PortfolioScreen — Portfolio overview with holdings and P&L
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../theme';
import {useMarketStore} from '../stores/marketStore';
import {formatPrice, formatLargeNumber, formatPercent} from '../utils/formatters';

export function PortfolioScreen() {
  const {portfolio} = useMarketStore();
  const isGain = portfolio.totalPnl >= 0;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh mục</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Portfolio Value Card */}
        <View style={styles.valueCard}>
          <Text style={styles.valueLabel}>Tổng giá trị danh mục</Text>
          <Text style={styles.valueAmount}>
            {formatLargeNumber(portfolio.totalValue)}
          </Text>

          <View style={styles.pnlSection}>
            <View style={[styles.pnlBadge, {backgroundColor: isGain ? colors.gainBg : colors.lossBg}]}>
              <Text style={[styles.pnlText, {color: isGain ? colors.gain : colors.loss}]}>
                {isGain ? '▲' : '▼'} {formatLargeNumber(Math.abs(portfolio.totalPnl))}
              </Text>
            </View>
            <View style={[styles.pnlPercentBadge, {backgroundColor: isGain ? colors.gainBg : colors.lossBg}]}>
              <Text style={[styles.pnlPercentText, {color: isGain ? colors.gain : colors.loss}]}>
                {formatPercent(portfolio.totalPnlPercent)}
              </Text>
            </View>
          </View>

          {/* Simple allocation bar */}
          <View style={styles.allocationBar}>
            {portfolio.holdings.map((holding, idx) => {
              const weight = holding.totalValue / portfolio.totalValue;
              const barColors = [colors.primary, colors.gain, colors.aiGold, colors.loss, colors.primaryLight, '#9C27B0', '#FF9800', '#00BCD4'];
              return (
                <View
                  key={holding.symbol}
                  style={[styles.allocationSegment, {
                    flex: weight,
                    backgroundColor: barColors[idx % barColors.length],
                    borderTopLeftRadius: idx === 0 ? 4 : 0,
                    borderBottomLeftRadius: idx === 0 ? 4 : 0,
                    borderTopRightRadius: idx === portfolio.holdings.length - 1 ? 4 : 0,
                    borderBottomRightRadius: idx === portfolio.holdings.length - 1 ? 4 : 0,
                  }]}
                />
              );
            })}
          </View>
          <View style={styles.legendRow}>
            {portfolio.holdings.slice(0, 4).map((holding, idx) => {
              const barColors = [colors.primary, colors.gain, colors.aiGold, colors.loss];
              return (
                <View key={holding.symbol} style={styles.legendItem}>
                  <View style={[styles.legendDot, {backgroundColor: barColors[idx]}]} />
                  <Text style={styles.legendText}>{holding.symbol}</Text>
                </View>
              );
            })}
            {portfolio.holdings.length > 4 && (
              <Text style={styles.legendMore}>+{portfolio.holdings.length - 4}</Text>
            )}
          </View>
        </View>

        {/* Holdings Section */}
        <Text style={styles.sectionTitle}>Danh sách nắm giữ</Text>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, {flex: 1.2}]}>Mã CK</Text>
          <Text style={[styles.tableHeaderText, {flex: 1, textAlign: 'right'}]}>SL</Text>
          <Text style={[styles.tableHeaderText, {flex: 1.5, textAlign: 'right'}]}>Giá TB</Text>
          <Text style={[styles.tableHeaderText, {flex: 1.5, textAlign: 'right'}]}>Giá HT</Text>
          <Text style={[styles.tableHeaderText, {flex: 1.5, textAlign: 'right'}]}>Lãi/Lỗ</Text>
        </View>

        {/* Holdings */}
        {portfolio.holdings.map(holding => {
          const holdingGain = holding.pnl >= 0;
          return (
            <View key={holding.symbol} style={styles.holdingRow}>
              <View style={{flex: 1.2}}>
                <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                <Text style={styles.holdingName} numberOfLines={1}>{holding.name}</Text>
              </View>
              <Text style={[styles.holdingValue, {flex: 1, textAlign: 'right'}]}>
                {holding.shares.toLocaleString()}
              </Text>
              <Text style={[styles.holdingValue, {flex: 1.5, textAlign: 'right'}]}>
                {formatPrice(holding.avgCost)}
              </Text>
              <Text style={[styles.holdingValue, {flex: 1.5, textAlign: 'right', color: holdingGain ? colors.gain : colors.loss}]}>
                {formatPrice(holding.currentPrice)}
              </Text>
              <View style={{flex: 1.5, alignItems: 'flex-end'}}>
                <Text style={[styles.holdingPnl, {color: holdingGain ? colors.gain : colors.loss}]}>
                  {formatLargeNumber(holding.pnl)}
                </Text>
                <Text style={[styles.holdingPnlPercent, {color: holdingGain ? colors.gain : colors.loss}]}>
                  {formatPercent(holding.pnlPercent)}
                </Text>
              </View>
            </View>
          );
        })}

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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl + spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.heading1,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  valueCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  valueLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  valueAmount: {
    ...typography.hero,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  pnlSection: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pnlBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  pnlText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  pnlPercentBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  pnlPercentText: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  allocationBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 1,
    marginBottom: spacing.sm,
  },
  allocationSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  legendMore: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  sectionTitle: {
    ...typography.heading3,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  tableHeaderText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  holdingSymbol: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  holdingName: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
  holdingValue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  holdingPnl: {
    ...typography.caption,
    fontWeight: '600',
  },
  holdingPnlPercent: {
    ...typography.caption,
    marginTop: 1,
  },
  bottomSpacer: {
    height: spacing.xxxl,
  },
});
