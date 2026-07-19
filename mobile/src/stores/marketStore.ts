/**
 * StockAI — Market Data Store (Zustand)
 * Updated for Phase 2 with real-time WebSocket support and notifications.
 */
import {create} from 'zustand';
import {StockItem, MarketIndex, AISignal, NewsItem, Portfolio} from '../types';
import {stockList, marketIndices, aiSignals, newsItems, portfolioData} from '../data/mockData';

export interface AppNotification {
  id: string;
  type: string;
  symbol: string;
  title: string;
  message: string;
  priority: string;
  timestamp: number;
  read: boolean;
}

interface MarketState {
  // Data
  indices: MarketIndex[];
  stocks: StockItem[];
  signals: AISignal[];
  news: NewsItem[];
  portfolio: Portfolio;
  watchlist: string[];
  notifications: AppNotification[];
  isLoading: boolean;
  isConnected: boolean;

  // Actions
  refreshData: () => void;
  toggleWatchlist: (symbol: string) => void;
  setLoading: (loading: boolean) => void;
  setConnected: (connected: boolean) => void;

  // Real-time updates
  updateStockFromTick: (tick: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    high: number;
    low: number;
    open: number;
    prevClose: number;
  }) => void;
  updateIndexFromTick: (update: {
    name: string;
    value: number;
    change: number;
    changePercent: number;
    volume: number;
  }) => void;

  // Notifications
  addNotification: (notification: AppNotification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: () => number;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  indices: marketIndices,
  stocks: stockList,
  signals: aiSignals,
  news: newsItems,
  portfolio: portfolioData,
  watchlist: ['BTC', 'ETH', 'ALLO', 'KITE', 'NEAR', 'TRX'],
  notifications: [],
  isLoading: false,
  isConnected: false,

  refreshData: () => {
    set({isLoading: true});
    setTimeout(() => {
      const updatedStocks = get().stocks.map(stock => {
        const variation = (Math.random() - 0.5) * 0.02;
        const newPrice = Math.round(stock.price * (1 + variation));
        const newChange = newPrice - stock.prevClose;
        const newChangePercent = (newChange / stock.prevClose) * 100;
        return {...stock, price: newPrice, change: newChange, changePercent: Number(newChangePercent.toFixed(2))};
      });
      set({stocks: updatedStocks, isLoading: false});
    }, 800);
  },

  toggleWatchlist: (symbol: string) => {
    set(state => ({
      watchlist: state.watchlist.includes(symbol)
        ? state.watchlist.filter(s => s !== symbol)
        : [...state.watchlist, symbol],
    }));
  },

  setLoading: (loading: boolean) => set({isLoading: loading}),
  setConnected: (connected: boolean) => set({isConnected: connected}),

  // ── Real-time updates ──────────────────────────────────────────

  updateStockFromTick: (tick) => {
    set(state => ({
      stocks: state.stocks.map(stock =>
        stock.symbol === tick.symbol
          ? {
              ...stock,
              price: tick.price,
              change: tick.change,
              changePercent: tick.changePercent,
              volume: tick.volume,
              high: tick.high,
              low: tick.low,
            }
          : stock,
      ),
    }));
  },

  updateIndexFromTick: (update) => {
    set(state => ({
      indices: state.indices.map(idx =>
        idx.name === update.name
          ? {
              ...idx,
              value: update.value,
              change: update.change,
              changePercent: update.changePercent,
              volume: update.volume,
            }
          : idx,
      ),
    }));
  },

  // ── Notifications ──────────────────────────────────────────────

  addNotification: (notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications].slice(0, 100),
    }));
  },

  markNotificationRead: (id) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === id ? {...n, read: true} : n,
      ),
    }));
  },

  markAllNotificationsRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({...n, read: true})),
    }));
  },

  unreadCount: () => {
    return get().notifications.filter(n => !n.read).length;
  },
}));
