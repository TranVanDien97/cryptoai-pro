import {Platform} from 'react-native';

/**
 * StockAI Typography System
 * Uses system fonts for optimal rendering on each platform.
 */

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography = {
  hero: {
    fontFamily,
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  heading1: {
    fontFamily,
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  heading2: {
    fontFamily,
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  heading3: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily,
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  bodySemiBold: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionMedium: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  overline: {
    fontFamily,
    fontSize: 10,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  number: {
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace', default: 'monospace'}),
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  numberLarge: {
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace', default: 'monospace'}),
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
} as const;
