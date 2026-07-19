/**
 * SignalCard — Featured AI signal card with confidence bar
 */
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../theme';
import {AISignal} from '../types';
import {SignalBadge} from './SignalBadge';
import {formatPrice, formatPercent} from '../utils/formatters';

interface Props {
  signal: AISignal;
  compact?: boolean;
  onPress?: () => void;
}

export function SignalCard({signal, compact = false, onPress}: Props) {
  const isGain = signal.signal === 'STRONG_BUY' || signal.signal === 'BUY';

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactContainer} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactSymbol}>{signal.symbol}</Text>
          <SignalBadge signal={signal.signal} size="small" />
        </View>
        <Text style={styles.compactPrice}>{formatPrice(signal.price)}</Text>
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Độ tin cậy</Text>
          <Text style={[styles.confidenceValue, {color: colors.aiGold}]}>{signal.confidence}%</Text>
        </View>
        <View style={styles.confidenceBarBg}>
          <View style={[styles.confidenceBarFill, {width: `${signal.confidence}%`}]} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.symbol}>{signal.symbol}</Text>
          <Text style={styles.companyName}>{signal.companyName}</Text>
        </View>
        <SignalBadge signal={signal.signal} size="large" />
      </View>

      {/* Confidence Bar */}
      <View style={styles.confidenceSection}>
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Độ tin cậy</Text>
          <Text style={[styles.confidenceValue, {color: colors.aiGold}]}>{signal.confidence}%</Text>
        </View>
        <View style={styles.confidenceBarBg}>
          <View style={[styles.confidenceBarFill, {width: `${signal.confidence}%`}]} />
        </View>
      </View>

      {/* Scores */}
      <View style={styles.scoresRow}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Kỹ thuật</Text>
          <Text style={[styles.scoreValue, {color: signal.technicalScore >= 0 ? colors.gain : colors.loss}]}>
            {signal.technicalScore > 0 ? '+' : ''}{signal.technicalScore}
          </Text>
        </View>
        <View style={[styles.scoreItem, styles.scoreDivider]}>
          <Text style={styles.scoreLabel}>Cơ bản</Text>
          <Text style={[styles.scoreValue, {color: signal.fundamentalScore >= 0 ? colors.gain : colors.loss}]}>
            {signal.fundamentalScore > 0 ? '+' : ''}{signal.fundamentalScore}
          </Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreLabel}>Giá hiện tại</Text>
          <Text style={styles.priceValue}>{formatPrice(signal.price)}</Text>
        </View>
      </View>

      {/* Price Targets */}
      <View style={styles.targetsRow}>
        <View style={styles.targetItem}>
          <Text style={styles.targetLabel}>🎯 Mục tiêu</Text>
          <Text style={[styles.targetValue, {color: colors.gain}]}>{formatPrice(signal.targetPrice)}</Text>
        </View>
        <View style={styles.targetItem}>
          <Text style={styles.targetLabel}>🛡️ Cắt lỗ</Text>
          <Text style={[styles.targetValue, {color: colors.loss}]}>{formatPrice(signal.stopLoss)}</Text>
        </View>
      </View>

      {/* Reasons */}
      <View style={styles.reasonsSection}>
        <Text style={styles.reasonsTitle}>📋 Lý do phân tích:</Text>
        {signal.reasons.map((reason, idx) => (
          <View key={idx} style={styles.reasonRow}>
            <Text style={styles.reasonBullet}>•</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.sm,
    width: 155,
    borderWidth: 1,
    borderColor: colors.aiGoldBg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  symbol: {
    ...typography.heading2,
    color: colors.textPrimary,
  },
  companyName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  compactSymbol: {
    ...typography.bodySemiBold,
    color: colors.textPrimary,
  },
  compactPrice: {
    ...typography.number,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  confidenceSection: {
    marginBottom: spacing.md,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  confidenceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  confidenceValue: {
    ...typography.captionMedium,
    fontWeight: '700',
  },
  confidenceBarBg: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: colors.aiGold,
    borderRadius: 2,
  },
  scoresRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
  },
  scoreDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  scoreLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xxs,
  },
  scoreValue: {
    ...typography.bodySemiBold,
  },
  priceValue: {
    ...typography.number,
    color: colors.textPrimary,
  },
  targetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  targetItem: {
    alignItems: 'center',
  },
  targetLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  targetValue: {
    ...typography.number,
    fontWeight: '700',
  },
  reasonsSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reasonsTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  reasonRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    paddingRight: spacing.sm,
  },
  reasonBullet: {
    ...typography.bodySmall,
    color: colors.aiGold,
    marginRight: spacing.sm,
    lineHeight: 20,
  },
  reasonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
});
