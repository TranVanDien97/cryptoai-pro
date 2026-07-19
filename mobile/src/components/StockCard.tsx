/**
 * StockCard — Row item for watchlist / stock list
 */
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../theme';
import {StockItem} from '../types';
import {formatPrice, formatPercent} from '../utils/formatters';

interface Props {
  stock: StockItem;
  onPress?: () => void;
}

export function StockCard({stock, onPress}: Props) {
  const isGain = stock.change >= 0;
  const trendColor = isGain ? colors.gain : colors.loss;
  const trendBg = isGain ? colors.gainBg : colors.lossBg;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}>
      {/* Left: Symbol + Name */}
      <View style={styles.left}>
        <View style={styles.symbolBadge}>
          <Text style={styles.symbolText}>{stock.symbol}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {stock.name}
        </Text>
      </View>

      {/* Right: Price + Change */}
      <View style={styles.right}>
        <Text style={[styles.price, {color: trendColor}]}>
          {formatPrice(stock.price)}
        </Text>
        <View style={[styles.changeBadge, {backgroundColor: trendBg}]}>
          <Text style={[styles.changeText, {color: trendColor}]}>
            {formatPercent(stock.changePercent)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  symbolBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    minWidth: 52,
    alignItems: 'center',
  },
  symbolText: {
    ...typography.captionMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  name: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  right: {
    alignItems: 'flex-end',
  },
  price: {
    ...typography.number,
    marginBottom: spacing.xxs,
  },
  changeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  changeText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
