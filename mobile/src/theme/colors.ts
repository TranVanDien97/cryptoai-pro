/**
 * StockAI Color Palette
 * Premium dark theme optimized for financial data display.
 */

export const colors = {
  // Backgrounds
  background: '#0A0E17',
  card: '#1A1F2E',
  surface: '#252A3A',
  elevated: '#2D3348',

  // Brand
  primary: '#2979FF',
  primaryLight: '#448AFF',
  primaryDark: '#2962FF',

  // Semantic — Gain / Loss
  gain: '#00E676',
  gainLight: '#69F0AE',
  gainBg: 'rgba(0, 230, 118, 0.12)',
  loss: '#FF5252',
  lossLight: '#FF8A80',
  lossBg: 'rgba(255, 82, 82, 0.12)',

  // AI
  aiGold: '#FFD740',
  aiGoldLight: '#FFE57F',
  aiGoldBg: 'rgba(255, 215, 64, 0.12)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8F95A5',
  textTertiary: '#5A6078',

  // Borders
  border: '#2A2F3F',
  borderLight: '#353B4F',

  // Others
  overlay: 'rgba(0, 0, 0, 0.6)',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Signal colors
  strongBuy: '#00E676',
  buy: '#69F0AE',
  hold: '#8F95A5',
  sell: '#FF8A80',
  strongSell: '#FF5252',
} as const;

export type ColorKey = keyof typeof colors;
