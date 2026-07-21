import { create } from 'zustand';

interface Position {
  symbol: string;
  qty: number;
  buyPrice: number;
  currentPrice: number;
  entryTime: number;
}

interface TradeLog {
  time: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  qty: number;
  pnl: number;
  usdt: number;
}

interface Signal {
  id: string;
  symbol: string;
  name: string;
  image: string;
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  entry: number;
  sl: number;
  tp: number;
  tp2?: number;
  rr?: string;
  reasons: string[];
  source: string;
  rank?: number;
  ai?: {
    headline: string;
    explanation: string;
  } | null;
}

interface AppState {
  // Navigation
  activeTab: 'signals' | 'bot' | 'settings';
  setTab: (tab: 'signals' | 'bot' | 'settings') => void;

  // Live prices
  livePrices: Record<string, number>;
  setLivePrice: (sym: string, price: number) => void;

  // AI Signals
  signals: Signal[];
  setSignals: (signals: Signal[]) => void;
  isScanning: boolean;
  setScanning: (v: boolean) => void;
  lastScanTime: number;
  setLastScanTime: (t: number) => void;

  // Bot
  botBalance: number;
  positions: Position[];
  tradeLogs: TradeLog[];
  openPosition: (sym: string, price: number, usdt: number) => void;
  closePosition: (sym: string) => void;
  closeAllPositions: () => void;
  resetBot: () => void;
  updatePositionPrices: (prices: Record<string, number>) => void;

  // Settings
  backendUrl: string;
  geminiKey: string;
  setBackendUrl: (url: string) => void;
  setGeminiKey: (key: string) => void;

  // WS status
  wsConnected: boolean;
  setWsConnected: (v: boolean) => void;
}

const INITIAL_BOT_BALANCE = 10000;

const loadBotFromStorage = () => {
  try {
    const saved = localStorage.getItem('bot_state_v2');
    if (saved) return JSON.parse(saved);
  } catch { /* */ }
  return { balance: INITIAL_BOT_BALANCE, positions: [], logs: [] };
};

const savedBot = loadBotFromStorage();

export const useStore = create<AppState>((set, get) => ({
  activeTab: 'signals',
  setTab: (tab) => set({ activeTab: tab }),

  livePrices: {},
  setLivePrice: (sym, price) => set((s) => ({
    livePrices: { ...s.livePrices, [sym]: price }
  })),

  signals: [],
  setSignals: (signals) => set({ signals }),
  isScanning: false,
  setScanning: (v) => set({ isScanning: v }),
  lastScanTime: 0,
  setLastScanTime: (t) => set({ lastScanTime: t }),

  botBalance: savedBot.balance ?? INITIAL_BOT_BALANCE,
  positions: savedBot.positions ?? [],
  tradeLogs: savedBot.logs ?? [],

  openPosition: (sym, price, usdt) => {
    const { botBalance, positions } = get();
    const cleanSym = sym.toUpperCase().replace('USDT', '');
    if (usdt > botBalance || usdt <= 0 || price <= 0) return;
    const qty = usdt / price;
    const existing = positions.find(p => p.symbol === cleanSym);
    let newPositions: Position[];
    if (existing) {
      // DCA average
      const newQty = existing.qty + qty;
      const avgPrice = (existing.buyPrice * existing.qty + price * qty) / newQty;
      newPositions = positions.map(p =>
        p.symbol === cleanSym
          ? { ...p, qty: newQty, buyPrice: avgPrice, currentPrice: price }
          : p
      );
    } else {
      newPositions = [...positions, { symbol: cleanSym, qty, buyPrice: price, currentPrice: price, entryTime: Date.now() }];
    }
    const newBalance = botBalance - usdt;
    const logs = get().tradeLogs;
    const newLog: TradeLog = {
      time: new Date().toLocaleTimeString('vi-VN'),
      symbol: cleanSym,
      type: 'BUY',
      price,
      qty,
      pnl: 0,
      usdt,
    };
    const newState = { botBalance: newBalance, positions: newPositions, tradeLogs: [newLog, ...logs].slice(0, 100) };
    set(newState);
    localStorage.setItem('bot_state_v2', JSON.stringify({ balance: newBalance, positions: newPositions, logs: [newLog, ...logs].slice(0, 100) }));
  },

  closePosition: (sym) => {
    const { positions, botBalance, tradeLogs, livePrices } = get();
    const cleanSym = sym.toUpperCase().replace('USDT', '');
    const pos = positions.find(p => p.symbol === cleanSym);
    if (!pos) return;
    const liveP = livePrices[cleanSym] || livePrices[cleanSym + 'USDT'] || pos.currentPrice;
    const pnl = (liveP - pos.buyPrice) * pos.qty;
    const returnAmt = pos.qty * liveP;
    const newBalance = botBalance + returnAmt;
    const newPositions = positions.filter(p => p.symbol !== cleanSym);
    const newLog: TradeLog = {
      time: new Date().toLocaleTimeString('vi-VN'),
      symbol: cleanSym,
      type: 'SELL',
      price: liveP,
      qty: pos.qty,
      pnl,
      usdt: returnAmt,
    };
    const newLogs = [newLog, ...tradeLogs].slice(0, 100);
    set({ botBalance: newBalance, positions: newPositions, tradeLogs: newLogs });
    localStorage.setItem('bot_state_v2', JSON.stringify({ balance: newBalance, positions: newPositions, logs: newLogs }));
  },

  closeAllPositions: () => {
    const { positions, botBalance, tradeLogs, livePrices } = get();
    let totalReturn = 0;
    const newLogs: TradeLog[] = [];
    positions.forEach(pos => {
      const liveP = livePrices[pos.symbol] || livePrices[pos.symbol + 'USDT'] || pos.currentPrice;
      const pnl = (liveP - pos.buyPrice) * pos.qty;
      totalReturn += pos.qty * liveP;
      newLogs.push({ time: new Date().toLocaleTimeString('vi-VN'), symbol: pos.symbol, type: 'SELL', price: liveP, qty: pos.qty, pnl, usdt: pos.qty * liveP });
    });
    const newBalance = botBalance + totalReturn;
    const allLogs = [...newLogs, ...tradeLogs].slice(0, 100);
    set({ botBalance: newBalance, positions: [], tradeLogs: allLogs });
    localStorage.setItem('bot_state_v2', JSON.stringify({ balance: newBalance, positions: [], logs: allLogs }));
  },

  resetBot: () => {
    set({ botBalance: INITIAL_BOT_BALANCE, positions: [], tradeLogs: [] });
    localStorage.setItem('bot_state_v2', JSON.stringify({ balance: INITIAL_BOT_BALANCE, positions: [], logs: [] }));
  },

  updatePositionPrices: (prices) => {
    const { positions } = get();
    if (!positions.length) return;
    const updated = positions.map(p => {
      const lp = prices[p.symbol] || prices[p.symbol + 'USDT'];
      return lp ? { ...p, currentPrice: lp } : p;
    });
    set({ positions: updated });
    const { botBalance, tradeLogs } = get();
    localStorage.setItem('bot_state_v2', JSON.stringify({ balance: botBalance, positions: updated, logs: tradeLogs }));
  },

  backendUrl: localStorage.getItem('backend_url') || 'https://cryptoai-pro.onrender.com',
  geminiKey: localStorage.getItem('gemini_key') || '',
  setBackendUrl: (url) => { localStorage.setItem('backend_url', url); set({ backendUrl: url }); },
  setGeminiKey: (key) => { localStorage.setItem('gemini_key', key); set({ geminiKey: key }); },

  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),
}));
