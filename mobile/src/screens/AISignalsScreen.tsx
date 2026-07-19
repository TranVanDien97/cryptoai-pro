/**
 * AISignalsScreen — Full AI analysis signals with filtering
 */
import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../theme';
import {useMarketStore} from '../stores/marketStore';
import {SignalCard} from '../components/SignalCard';
import {AISignal, SignalType} from '../types';

type FilterKey = 'ALL' | 'BUY' | 'SELL' | 'HOLD';

const filterChips: {key: FilterKey; label: string; emoji: string}[] = [
  {key: 'ALL', label: 'Tất cả', emoji: '📊'},
  {key: 'BUY', label: 'Mua', emoji: '🟢'},
  {key: 'SELL', label: 'Bán', emoji: '🔴'},
  {key: 'HOLD', label: 'Giữ', emoji: '⚪'},
];

export function AISignalsScreen() {
  const {signals} = useMarketStore();
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const filteredSignals = useMemo(() => {
    if (filter === 'ALL') return signals;
    if (filter === 'BUY')
      return signals.filter(s => s.signal === 'STRONG_BUY' || s.signal === 'BUY');
    if (filter === 'SELL')
      return signals.filter(s => s.signal === 'STRONG_SELL' || s.signal === 'SELL');
    if (filter === 'HOLD')
      return signals.filter(s => s.signal === 'HOLD');
    return signals;
  }, [signals, filter]);

  // Stats
  const buyCount = signals.filter(s => s.signal === 'STRONG_BUY' || s.signal === 'BUY').length;
  const sellCount = signals.filter(s => s.signal === 'STRONG_SELL' || s.signal === 'SELL').length;
  const holdCount = signals.filter(s => s.signal === 'HOLD').length;
  const avgConfidence = Math.round(
    signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length,
  );

  const renderSignal = ({item}: {item: AISignal}) => (
    <SignalCard signal={item} />
  );

  const ListHeader = () => (
    <View>
      {/* Stats Overview */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, {borderColor: colors.gain + '40'}]}>
          <Text style={styles.statEmoji}>🟢</Text>
          <Text style={[styles.statValue, {color: colors.gain}]}>{buyCount}</Text>
          <Text style={styles.statLabel}>Mua</Text>
        </View>
        <View style={[styles.statCard, {borderColor: colors.loss + '40'}]}>
          <Text style={styles.statEmoji}>🔴</Text>
          <Text style={[styles.statValue, {color: colors.loss}]}>{sellCount}</Text>
          <Text style={styles.statLabel}>Bán</Text>
        </View>
        <View style={[styles.statCard, {borderColor: colors.hold + '40'}]}>
          <Text style={styles.statEmoji}>⚪</Text>
          <Text style={[styles.statValue, {color: colors.hold}]}>{holdCount}</Text>
          <Text style={styles.statLabel}>Giữ</Text>
        </View>
        <View style={[styles.statCard, {borderColor: colors.aiGold + '40'}]}>
          <Text style={styles.statEmoji}>⚡</Text>
          <Text style={[styles.statValue, {color: colors.aiGold}]}>{avgConfidence}%</Text>
          <Text style={styles.statLabel}>TB Tin cậy</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {filterChips.map(chip => (
          <TouchableOpacity
            key={chip.key}
            style={[
              styles.filterChip,
              filter === chip.key && styles.filterChipActive,
            ]}
            onPress={() => setFilter(chip.key)}>
            <Text style={styles.filterEmoji}>{chip.emoji}</Text>
            <Text
              style={[
                styles.filterText,
                filter === chip.key && styles.filterTextActive,
              ]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results info */}
      <Text style={styles.resultsInfo}>
        {filteredSignals.length} tín hiệuược tìm thấy
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤖 Tín hiệu AI</Text>
        <Text style={styles.headerSubtitle}>
          Phân tích tựộng bởi StockAI Engine
        </Text>
      </View>

      <FlatList
        data={filteredSignals}
        renderItem={renderSignal}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
      />
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
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  statEmoji: {
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.bodySemiBold,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterEmoji: {
    fontSize: 12,
  },
  filterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  resultsInfo: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
});
