/**
 * CryptoAI — Binance WebSocket Service
 *
 * Connects directly to Binance public WebSocket stream for real-time prices.
 */
import {useMarketStore} from '../stores/marketStore';

export interface TickerUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  timestamp: number;
}

type TickerCallback = (data: TickerUpdate) => void;
type ConnectionCallback = (connected: boolean) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private tickerListeners: TickerCallback[] = [];
  private connectionListeners: ConnectionCallback[] = [];
  private _isConnected = false;
  private symbols: string[] = ['btc', 'eth', 'allo', 'kite', 'near', 'trx', 'sol'];

  get isConnected() {
    return this._isConnected;
  }

  /**
   * Connect to the Binance WebSocket server.
   */
  connect() {
    if (this.ws) return;

    const streams = this.symbols.map(s => `${s}usdt@miniTicker`).join('/');
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS] Connected directly to Binance WebSocket');
      this._isConnected = true;
      this.connectionListeners.forEach(cb => cb(true));
      useMarketStore.getState().setConnected(true);
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected from Binance WebSocket');
      this._isConnected = false;
      this.connectionListeners.forEach(cb => cb(false));
      useMarketStore.getState().setConnected(false);
      this.ws = null;
      // Auto-reconnect after 3 seconds
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => {
      console.error('[WS] WebSocket error:', err);
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const d = msg && msg.data;
        if (!d || !d.s || !d.s.endsWith('USDT')) return;

        const sym = d.s.slice(0, -4); // "BTCUSDT" -> "BTC"
        const price = parseFloat(d.c);
        const open = parseFloat(d.o);
        const high = parseFloat(d.h);
        const low = parseFloat(d.l);
        const volume = parseFloat(d.v);

        if (!price || isNaN(price)) return;

        const change = price - open;
        const changePercent = open > 0 ? (change / open) * 100 : 0;

        const tick: TickerUpdate = {
          symbol: sym,
          price,
          change,
          changePercent,
          volume,
          high,
          low,
          open,
          prevClose: open,
          timestamp: Date.now(),
        };

        // Notify store
        useMarketStore.getState().updateStockFromTick(tick);

        // Notify local listeners
        this.tickerListeners.forEach(cb => cb(tick));
      } catch (e) {
        console.error('[WS] Error parsing WebSocket message', e);
      }
    };
  }

  /**
   * Disconnect from the server.
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._isConnected = false;
    useMarketStore.getState().setConnected(false);
  }

  subscribeWatchlist(symbols: string[]) {
    // Dynamic subscription could be implemented, but since we connect to major symbols, it's pre-subscribed
    this.symbols = symbols.map(s => s.toLowerCase());
    this.disconnect();
    this.connect();
  }

  unsubscribeWatchlist(symbols: string[]) {
    // No-op for public streams, just reconnecting is enough
  }

  // ── Listener registration ─────────────────────────────────────

  onTickerUpdate(callback: TickerCallback): () => void {
    this.tickerListeners.push(callback);
    return () => {
      this.tickerListeners = this.tickerListeners.filter(cb => cb !== callback);
    };
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionListeners.push(callback);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
    };
  }
}

export const wsService = new WebSocketService();
