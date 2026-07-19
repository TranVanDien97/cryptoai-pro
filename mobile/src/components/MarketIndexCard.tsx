/**
 * MarketIndexCard — Displays VN-Index / HNX-Index / UPCOM
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../theme';
import {MarketIndex} from '../types';
import {formatPrice, formatChange, formatPercent} from '../utils/formatters';

interface Props {
  index: MarketIndex;
}

export function MarketIndexCard({index}: Props) {
  const isGain = index.change >= 0;
  const trendColor = isGain ? colors.gain : colors.loss;
  const trendBg = isGain ? colors.gainBg : colors.lossBg;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{index.name}</Text>
      <Text style={[styles.value, {color: trendColor}]}>
        {formatPrice(index.value)}
      </Text>
      <View style={[styles.changeBadge, {backgroundColor: trendBg}]}>
        <Text style={[styles.changeText, {color: trendColor}]}>
          {formatChange(index.change)} ({formatPercent(index.changePercent)})
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginRight: spacing.sm,
    minWidth: 165,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.numberLarge,
    marginBottom: spacing.sm,
  },
  changeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  changeText: {
    ...typography.caption,
    fontWeight: '600',
  },
});
