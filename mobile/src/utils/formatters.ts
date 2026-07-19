/**
 * StockAI — Formatting Utilities
 */

/**
 * Format a number as Vietnamese Dong currency.
 * e.g., 125800 → "125,800"
 */
export function formatPrice(price: number): string {
  if (price === 0) return '$0.00';
  if (price < 0.01) {
    return '$' + price.toFixed(4);
  }
  if (price < 1) {
    return '$' + price.toFixed(2);
  }
  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatLargeNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000_000) {
    return sign + '$' + (abs / 1_000_000_000_000).toFixed(2) + 'T';
  }
  if (abs >= 1_000_000_000) {
    return sign + '$' + (abs / 1_000_000_000).toFixed(2) + 'B';
  }
  if (abs >= 1_000_000) {
    return sign + '$' + (abs / 1_000_000).toFixed(2) + 'M';
  }
  if (abs >= 1_000) {
    return sign + '$' + (abs / 1_000).toFixed(1) + 'K';
  }
  return sign + '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatChange(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format volume.
 * e.g., 8542300 → "8.54M"
 */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return (volume / 1_000_000).toFixed(2) + 'M';
  }
  if (volume >= 1_000) {
    return (volume / 1_000).toFixed(1) + 'K';
  }
  return volume.toString();
}

/**
 * Get the display label for a signal type.
 */
export function getSignalLabel(signal: string): string {
  const labels: Record<string, string> = {
    STRONG_BUY: 'MUA MẠNH',
    BUY: 'MUA',
    HOLD: 'GIỮ',
    SELL: 'BÁN',
    STRONG_SELL: 'BÁN MẠNH',
    DCA: 'DCA (MUA THÊM)',
  };
  return labels[signal] || signal;
}
