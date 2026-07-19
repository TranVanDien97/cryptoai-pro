/**
 * MarketScreen — Stock list with search, filter by exchange, and sort
 */
import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../theme';
import {useMarketStore} from '../stores/marketStore';
import {StockCard} from '../components/StockCard';
import {StockItem} from '../types';
import {formatPrice, formatPercent, formatVolume} from '../utils/formatters';

type Exchange = 'ALL' | 'HOSE' | 'HNX' | 'UPCOM';
type SortKey = 'symbol' | 'price' | 'changePercent' | 'volume';

const exchangeTabs: {key: Exchange; label: string}[] = [
  {key: 'ALL', label: 'Tất cả'},
  {key: 'HOSE', label: 'HOSE'},
  {key: 'HNX', label: 'HNX'},
  {key: 'UPCOM', label: 'UPCOM'},
];

const sortOptions: {key: SortKey; label: string}[] = [
  {key: 'symbol', label: 'Tên'},
  {key: 'price', label: 'Giá'},
  {key: 'changePercent', label: '% Thayổi'},
  {key: 'volume', label: 'KL'},
];

export function MarketScreen() {
  const {stocks} = useMarketStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExchange, setSelectedExchange] = useState<Exchange>('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('changePercent');
  const [sortDesc, setSortDesc] = useState(true);

  const filteredStocks = useMemo(() => {
    let result = [...stocks];

    // Filter by exchange
    if (selectedExchange !== 'ALL') {
      result = result.filter(s => s.exchange === selectedExchange);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        s =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q),
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'symbol') cmp = a.symbol.localeCompare(b.symbol);
      else if (sortBy === 'price') cmp = a.price - b.price;
      else if (sortBy === 'changePercent') cmp = a.changePercent - b.changePercent;
      else if (sortBy === 'volume') cmp = a.volume - b.volume;
      return sortDesc ? -cmp : cmp;
    });

    return result;
  }, [stocks, selectedExchange, searchQuery, sortBy, sortDesc]);

  // Top gainers and losers
  const topGainers = [...stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3);
  const topLosers = [...stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 3);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(key);
      setSortDesc(true);
    }
  };

  const renderStockItem = ({item}: {item: StockItem}) => (
    <StockCard stock={item} />
  );

  const ListHeader = () => (
    <View>
      {/* Top Movers Section */}
      <View style={styles.moversSection}>
        <View style={styles.moversColumn}>
          <Text style={styles.moversTitle}>🔥 Tăng mạnh</Text>
          {topGainers.map(stock => (
            <View key={stock.symbol} style={styles.moverRow}>
              <Text style={styles.moverSymbol}>{stock.symbol}</Text>
              <Text style={[styles.moverChange, {color: colors.gain}]}>
                {formatPercent(stock.changePercent)}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.moversDivider} />
        <View style={styles.moversColumn}>
          <Text style={styles.moversTitle}>📉 Giảm mạnh</Text>
          {topLosers.map(stock => (
            <View key={stock.symbol} style={styles.moverRow}>
              <Text style={styles.moverSymbol}>{stock.symbol}</Text>
              <Text style={[styles.moverChange, {color: colors.loss}]}>
                {formatPercent(stock.changePercent)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Sort Options */}
      <View style={styles.sortRow}>
        {sortOptions.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.sortBtn, sortBy === opt.key && styles.sortBtnActive]}
            onPress={() => handleSort(opt.key)}>
            <Text
              style={[
                styles.sortBtnText,
                sortBy === opt.key && styles.sortBtnTextActive,
              ]}>
              {opt.label} {sortBy === opt.key ? (sortDesc ? '↓' : '↑') : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results count */}
      <Text style={styles.resultsCount}>
        {filteredStocks.length} coin
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thị trường</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm mã CK hoặc tên công ty..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="characters"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Exchange Tabs */}
      <View style={styles.tabsContainer}>
        {exchangeTabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              selectedExchange === tab.key && styles.tabActive,
            ]}
            onPress={() => setSelectedExchange(tab.key)}>
            <Text
              style={[
                styles.tabText,
                selectedExchange === tab.key && styles.tabTextActive,
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stock List */}
      <FlatList
        data={filteredStocks}
        renderItem={renderStockItem}
        keyExtractor={item => item.symbol}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
  },
  clearBtn: {
    color: colors.textSecondary,
    fontSize: 16,
    padding: spacing.xs,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  moversSection: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moversColumn: {
    flex: 1,
  },
  moversDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  moversTitle: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  moverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  moverSymbol: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  moverChange: {
    ...typography.captionMedium,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sortBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  sortBtnActive: {
    backgroundColor: colors.primary + '25',
  },
  sortBtnText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sortBtnTextActive: {
    color: colors.primaryLight,
    fontWeight: '600',
  },
  resultsCount: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
});
