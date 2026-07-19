/**
 * SignalBadge — Colored badge for AI signal type (BUY / SELL / HOLD)
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../theme';
import {SignalType} from '../types';
import {getSignalLabel} from '../utils/formatters';

interface Props {
  signal: SignalType;
  size?: 'small' | 'medium' | 'large';
}

const signalColors: Record<SignalType, {bg: string; text: string}> = {
  STRONG_BUY: {bg: 'rgba(0, 230, 118, 0.2)', text: colors.strongBuy},
  BUY: {bg: 'rgba(105, 240, 174, 0.15)', text: colors.buy},
  HOLD: {bg: 'rgba(143, 149, 165, 0.15)', text: colors.hold},
  SELL: {bg: 'rgba(255, 138, 128, 0.15)', text: colors.sell},
  STRONG_SELL: {bg: 'rgba(255, 82, 82, 0.2)', text: colors.strongSell},
  DCA: {bg: 'rgba(255, 215, 64, 0.15)', text: colors.aiGold},
};

export function SignalBadge({signal, size = 'medium'}: Props) {
  const {bg, text} = signalColors[signal];
  const sizeStyles = size === 'small' ? styles.small : size === 'large' ? styles.large : styles.medium;

  return (
    <View style={[styles.badge, sizeStyles, {backgroundColor: bg}]}>
      <Text style={[styles.text, {color: text}, size === 'small' && styles.smallText, size === 'large' && styles.largeText]}>
        {getSignalLabel(signal)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  medium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  large: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: {
    ...typography.captionMedium,
    fontWeight: '700',
  },
  smallText: {
    fontSize: 10,
  },
  largeText: {
    fontSize: 14,
  },
});
