/**
 * SectionHeader — Reusable section header with optional "Xem tất cả" action
 */
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, spacing, typography} from '../theme';

interface Props {
  title: string;
  actionText?: string;
  onAction?: () => void;
}

export function SectionHeader({title, actionText, onAction}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {actionText && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.action}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },
  title: {
    ...typography.heading3,
    color: colors.textPrimary,
  },
  action: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
});
