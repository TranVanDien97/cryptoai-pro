/**
 * StockAI — Core Type Definitions
 */

export type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface StockItem {
  symbol: string;
  name: string;
  exchange: 'HOSE' | 'HNX' | 'UPCOM';
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface AISignal {
  id: string;
  symbol: string;
  companyName: string;
  signal: SignalType;
  confidence: number;
  technicalScore: number;
  fundamentalScore: number;
  price: number;
  targetPrice: number;
  stopLoss: number;
  reasons: string[];
  timestamp: string;
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  timeAgo: string;
  category: string;
  imageUrl?: string;
}

export interface Portfolio {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  holdings: PortfolioHolding[];
}
