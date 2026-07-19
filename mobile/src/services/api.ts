/**
 * CryptoAI — API Service connecting to Node.js backend
 */
import axios from 'axios';
import {StockItem, MarketIndex, AISignal, Portfolio} from '../types';
import {portfolioData, stockList as mockStockList, marketIndices as mockIndices, aiSignals as mockSignals} from '../data/mockData';

// Point to the Node.js backend on port 8001 (local dev) or the Render URL
const API_BASE_URL = 'http://localhost:8001/api';

// Create an axios instance with timeout
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds timeout for Gemini API
});

export const api = {
  /**
   * Fetch market indices (mapped to Fear & Greed, BTC Dominance, Total Cap)
   */
  async getMarketOverview(): Promise<MarketIndex[]> {
    try {
      // In a real app, we could fetch Fear & Greed index from alternative.me or Binance stats
      // For now, we return mockIndices which are already Crypto-centric
      return mockIndices;
    } catch (error) {
      return mockIndices;
    }
  },

  /**
   * Fetch all ticker prices from Binance and map to Coin items
   */
  async getStockList(): Promise<StockItem[]> {
    try {
      const response = await apiClient.get('/binance/ticker');
      if (response.data?.success && Array.isArray(response.data?.data)) {
        // Filter tickers to USDT pairs only
        const usdtPairs = response.data.data.filter((t: any) => t.symbol.endsWith('USDT'));
        
        // Map top coins
        const majorSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'TRX', 'NEAR', 'ALLO', 'KITE'];
        const mapped = usdtPairs
          .filter((t: any) => {
            const sym = t.symbol.slice(0, -4);
            return majorSymbols.includes(sym);
          })
          .map((t: any) => {
            const sym = t.symbol.slice(0, -4);
            const price = parseFloat(t.price);
            return {
              symbol: sym,
              name: sym === 'ALLO' ? 'Allora' : sym === 'KITE' ? 'Kite' : sym,
              exchange: 'BINANCE',
              price: price,
              change: 0, // Calculated in real-time or WebSocket
              changePercent: 0,
              volume: 0,
              high: price,
              low: price,
              open: price,
              prevClose: price,
            };
          });
        if (mapped.length > 0) return mapped;
      }
      return mockStockList;
    } catch (error) {
      console.warn('Failed to fetch crypto list, using fallback', error);
      return mockStockList;
    }
  },

  async getStockDetail(symbol: string): Promise<StockItem | undefined> {
    const list = await this.getStockList();
    return list.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
  },

  /**
   * Run AI analysis via backend /api/ai/smart-alerts for current watchlist
   */
  async getAISignals(watchlistSymbols: string[] = ['ALLO', 'KITE', 'NEAR', 'TRX']): Promise<AISignal[]> {
    try {
      // Fetch 30-day historical klines from Binance API directly to construct candles
      const coinsData = [];
      for (const sym of watchlistSymbols) {
        try {
          const res = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${sym}USDT&interval=1d&limit=30`);
          if (Array.isArray(res.data) && res.data.length > 0) {
            const candles = res.data.map((k: any) => ({
              high: parseFloat(k[2]),
              low: parseFloat(k[3]),
              close: parseFloat(k[4]),
            }));
            const highs = candles.map((k: any) => k.high).sort((a, b) => b - a);
            const lows = candles.map((k: any) => k.low).sort((a, b) => a - b);
            const currentPrice = candles[candles.length - 1].close;
            
            // Hardcode some entry prices for analysis (or fetch from store)
            const mockEntries: Record<string, number> = { ALLO: 0.3857, KITE: 0.1138, NEAR: 1.93, TRX: 0.3223 };
            const entryPrice = mockEntries[sym] || currentPrice;
            const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;

            let sumVol = 0;
            res.data.forEach((k: any) => sumVol += parseFloat(k[5]));
            const avgVol = sumVol / res.data.length;

            coinsData.push({
              symbol: sym,
              price: currentPrice,
              entryPrice,
              pnlPct,
              resistance: highs[0],
              support: lows[0],
              candles,
              volume24h: parseFloat(res.data[res.data.length - 1][5]),
              avgVolume: avgVol,
            });
          }
        } catch (e) {
          console.warn(`Failed to build candles for ${sym}`, e);
        }
      }

      if (coinsData.length > 0) {
        const response = await apiClient.post('/ai/smart-alerts', { coinsData });
        if (response.data?.success && Array.isArray(response.data?.data)) {
          return response.data.data.map((s: any) => ({
            id: s.symbol + '_' + Date.now(),
            symbol: s.symbol,
            companyName: s.symbol === 'ALLO' ? 'Allora' : s.symbol === 'KITE' ? 'Kite' : s.symbol,
            signal: s.action, // DCA, SELL, BUY, HOLD, etc.
            confidence: 85,
            technicalScore: s.action === 'BUY' || s.action === 'DCA' ? 80 : s.action === 'SELL' ? 30 : 60,
            fundamentalScore: 75,
            price: s.price || 0,
            targetPrice: s.meta?.breakout?.level || 0,
            stopLoss: s.meta?.breakout?.level * 0.9 || 0,
            reasons: [s.text],
            timestamp: new Date().toISOString(),
          }));
        }
      }
      return mockSignals;
    } catch (error) {
      console.warn('Failed to fetch AI signals, using fallback', error);
      return mockSignals;
    }
  },

  async getStockAnalysis(symbol: string): Promise<AISignal | undefined> {
    const list = await this.getAISignals([symbol]);
    return list[0];
  },

  /**
   * Fetch portfolio balances from Binance API via Node.js backend
   */
  async getPortfolio(): Promise<Portfolio> {
    try {
      const response = await apiClient.get('/binance/portfolio');
      if (response.data?.success && response.data?.balances) {
        const balances = response.data.balances;
        const totalUSD = response.data.totalUSD;
        
        // Load custom entry prices for portfolio PNL calculation
        const customEntries: Record<string, number> = { ALLO: 0.3857, KITE: 0.1138, NEAR: 1.93, TRX: 0.3223 };
        
        let totalCost = 0;
        const holdings = balances
          .filter((b: any) => !['USDT', 'USDC', 'BUSD', 'FDUSD', 'DAI'].includes(b.asset) && b.usdValue > 1)
          .map((b: any) => {
            const entryPrice = customEntries[b.asset] || b.price;
            const cost = entryPrice * b.total;
            totalCost += cost;
            const pnl = b.usdValue - cost;
            const pnlPercent = entryPrice > 0 ? ((b.price - entryPrice) / entryPrice) * 100 : 0;
            return {
              symbol: b.asset,
              name: b.asset === 'ALLO' ? 'Allora' : b.asset === 'KITE' ? 'Kite' : b.asset,
              shares: b.total,
              avgCost: entryPrice,
              currentPrice: b.price,
              totalValue: b.usdValue,
              pnl,
              pnlPercent,
            };
          });

        const totalPnl = totalUSD - totalCost;
        const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

        return {
          totalValue: totalUSD,
          totalPnl,
          totalPnlPercent,
          holdings,
        };
      }
      return portfolioData;
    } catch (error) {
      console.warn('Failed to fetch Binance portfolio, using mock fallback', error);
      return portfolioData;
    }
  },
};
