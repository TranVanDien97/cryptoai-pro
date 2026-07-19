/**
 * StockAI — Formatting Utilities
 */

/**
 * Format a number as Vietnamese Dong currency.
 * e.g., 125800 → "125,800"
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('vi-VN');
}

/**
 * Format a large currency value with suffix.
 * e.g., 285430000 → "285.43 tr"
 */
export function formatLargeNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(2) + ' tỷ';
  }
  if (abs >= 1_000_000) {
    return (value / 1_000_000).toFixed(2) + ' tr';
  }
  if (abs >= 1_000) {
    return (value / 1_000).toFixed(1) + 'K';
  }
  return value.toString();
}

/**
 * Format a percentage value.
 * e.g., 2.61 → "+2.61%", -0.82 → "-0.82%"
 */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format a change value with sign.
 * e.g., 3200 → "+3,200", -800 → "-800"
 */
export function formatChange(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatPrice(value)}`;
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
  };
  return labels[signal] || signal;
}
