/**
 * StockAI — API Service
 */
import axios from 'axios';
import {StockItem, MarketIndex, AISignal, Portfolio} from '../types';
import {portfolioData, stockList as mockStockList, marketIndices as mockIndices, aiSignals as mockSignals} from '../data/mockData';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Create an axios instance with timeout
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout due to vnstock scraping
});

export const api = {
  async getMarketOverview(): Promise<MarketIndex[]> {
    try {
      const response = await apiClient.get('/stocks/market-overview');
      if (response.data?.success && response.data?.data?.indices) {
        return response.data.data.indices;
      }
      return mockIndices; // fallback if data is malformed
    } catch (error) {
      console.warn('Failed to fetch market overview, using fallback', error);
      return mockIndices;
    }
  },

  async getStockList(): Promise<StockItem[]> {
    try {
      // The backend /stocks/market-overview returns top_gainers and top_losers with prices.
      // We will use that to populate the watchlist, since /stocks/list only returns symbols without prices.
      const response = await apiClient.get('/stocks/market-overview');
      if (response.data?.success && response.data?.data) {
        const { top_gainers, top_losers } = response.data.data;
        const movers = [...(top_gainers || []), ...(top_losers || [])];
        
        if (movers.length > 0) {
           return movers.map((m: any) => ({
             symbol: m.symbol,
             name: m.symbol, // Backend currently doesn't return full name in movers
             exchange: 'HOSE',
             price: m.price,
             change: m.change,
             changePercent: m.change_percent,
             volume: m.volume,
             high: m.price,
             low: m.price,
             open: m.price,
             prevClose: m.price - m.change,
           }));
        }
      }
      return mockStockList;
    } catch (error) {
      console.warn('Failed to fetch stock list, using fallback', error);
      return mockStockList;
    }
  },

  async getStockDetail(symbol: string): Promise<StockItem | undefined> {
    try {
      const infoRes = await apiClient.get(`/stocks/${symbol}/info`);
      // Since getting price requires start/end dates, for now we will just merge with mock if needed
      if (infoRes.data?.success) {
         // Create a synthetic StockItem
         return {
           symbol: symbol,
           name: infoRes.data.data?.company_name || symbol,
           exchange: infoRes.data.data?.exchange || 'HOSE',
           price: 0, change: 0, changePercent: 0, volume: 0, high: 0, low: 0, open: 0, prevClose: 0
         };
      }
      return mockStockList.find(s => s.symbol === symbol);
    } catch (error) {
      return mockStockList.find(s => s.symbol === symbol);
    }
  },

  async getAISignals(): Promise<AISignal[]> {
    try {
      const response = await apiClient.get('/stocks/signals');
      if (response.data?.success && response.data?.data) {
         return response.data.data.map((s: any) => ({
            id: s.symbol + '_' + Date.now(),
            symbol: s.symbol,
            companyName: s.symbol,
            signal: s.signal,
            confidence: Math.round(s.confidence),
            technicalScore: Math.round(s.technical_score),
            fundamentalScore: Math.round(s.fundamental_score),
            price: s.price,
            targetPrice: s.target_price,
            stopLoss: s.stop_loss,
            reasons: s.reasoning || [],
            timestamp: s.timestamp
         }));
      }
      return mockSignals;
    } catch (error) {
      console.warn('Failed to fetch AI signals, using fallback', error);
      return mockSignals;
    }
  },

  async getStockAnalysis(symbol: string): Promise<AISignal | undefined> {
    try {
      const response = await apiClient.get(`/stocks/${symbol}/analysis`);
      if (response.data?.success && response.data?.data) {
         const s = response.data.data;
         return {
            id: s.symbol + '_' + Date.now(),
            symbol: s.symbol,
            companyName: s.symbol,
            signal: s.signal,
            confidence: Math.round(s.confidence),
            technicalScore: Math.round(s.technical_score),
            fundamentalScore: Math.round(s.fundamental_score),
            price: s.price,
            targetPrice: s.target_price,
            stopLoss: s.stop_loss,
            reasons: s.reasoning || [],
            timestamp: s.timestamp
         };
      }
      return mockSignals.find(s => s.symbol === symbol);
    } catch (error) {
      return mockSignals.find(s => s.symbol === symbol);
    }
  },

  async getPortfolio(): Promise<Portfolio> {
    // Backend has no portfolio endpoint yet, return mock
    return new Promise(resolve => setTimeout(() => resolve(portfolioData), 300));
  },
};
