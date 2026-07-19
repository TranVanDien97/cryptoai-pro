/**
 * NewsCard — News item for the news feed
 */
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../theme';
import {NewsItem} from '../types';

interface Props {
  item: NewsItem;
  onPress?: () => void;
}

export function NewsCard({item, onPress}: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.source}>{item.source}</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.time}>{item.timeAgo}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryBadge: {
    backgroundColor: colors.primaryDark + '30',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  categoryText: {
    ...typography.overline,
    color: colors.primaryLight,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  title: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  source: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  dot: {
    color: colors.textTertiary,
    marginHorizontal: spacing.xs,
  },
  time: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
