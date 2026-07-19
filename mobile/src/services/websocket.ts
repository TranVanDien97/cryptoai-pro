/**
 * StockAI — WebSocket Service
 *
 * Manages Socket.IO connection to the real-time backend.
 * Provides hooks for components to subscribe to live price updates and alerts.
 */
import { io, Socket } from 'socket.io-client';

const REALTIME_URL = __DEV__
  ? 'http://10.0.2.2:3001' // Android emulator → host machine
  : 'http://localhost:3001';

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

export interface MarketIndexUpdate {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

export interface AlertPayload {
  id: string;
  type: 'AI_SIGNAL' | 'PRICE_TARGET' | 'VOLUME_SPIKE' | 'NEWS';
  symbol: string;
  title: string;
  message: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  data: Record<string, unknown>;
  timestamp: number;
}

type TickerCallback = (data: TickerUpdate) => void;
type BatchCallback = (data: TickerUpdate[]) => void;
type IndexCallback = (data: MarketIndexUpdate) => void;
type AlertCallback = (data: AlertPayload) => void;
type ConnectionCallback = (connected: boolean) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private tickerListeners: TickerCallback[] = [];
  private batchListeners: BatchCallback[] = [];
  private indexListeners: IndexCallback[] = [];
  private alertListeners: AlertCallback[] = [];
  private connectionListeners: ConnectionCallback[] = [];
  private _isConnected = false;

  get isConnected() {
    return this._isConnected;
  }

  /**
   * Connect to the real-time WebSocket server.
   */
  connect() {
    if (this.socket?.connected) return;

    this.socket = io(REALTIME_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected to StockAI real-time server');
      this._isConnected = true;
      this.connectionListeners.forEach(cb => cb(true));
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[WS] Disconnected: ${reason}`);
      this._isConnected = false;
      this.connectionListeners.forEach(cb => cb(false));
    });

    this.socket.on('connect_error', (err) => {
      console.log(`[WS] Connection error: ${err.message}`);
    });

    // ── Market data events ───────────────────────────────────────

    this.socket.on('ticker:update', (data: TickerUpdate) => {
      this.tickerListeners.forEach(cb => cb(data));
    });

    this.socket.on('ticker:batch', (data: TickerUpdate[]) => {
      this.batchListeners.forEach(cb => cb(data));
    });

    this.socket.on('index:update', (data: MarketIndexUpdate) => {
      this.indexListeners.forEach(cb => cb(data));
    });

    // ── Alert events ─────────────────────────────────────────────

    this.socket.on('alert:new', (data: AlertPayload) => {
      this.alertListeners.forEach(cb => cb(data));
    });
  }

  /**
   * Disconnect from the server.
   */
  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this._isConnected = false;
  }

  /**
   * Subscribe to specific stock symbols for targeted updates.
   */
  subscribeWatchlist(symbols: string[]) {
    this.socket?.emit('subscribe:watchlist', symbols);
  }

  /**
   * Unsubscribe from symbols.
   */
  unsubscribeWatchlist(symbols: string[]) {
    this.socket?.emit('unsubscribe:watchlist', symbols);
  }

  // ── Listener registration ─────────────────────────────────────

  onTickerUpdate(callback: TickerCallback): () => void {
    this.tickerListeners.push(callback);
    return () => {
      this.tickerListeners = this.tickerListeners.filter(cb => cb !== callback);
    };
  }

  onBatchUpdate(callback: BatchCallback): () => void {
    this.batchListeners.push(callback);
    return () => {
      this.batchListeners = this.batchListeners.filter(cb => cb !== callback);
    };
  }

  onIndexUpdate(callback: IndexCallback): () => void {
    this.indexListeners.push(callback);
    return () => {
      this.indexListeners = this.indexListeners.filter(cb => cb !== callback);
    };
  }

  onAlert(callback: AlertCallback): () => void {
    this.alertListeners.push(callback);
    return () => {
      this.alertListeners = this.alertListeners.filter(cb => cb !== callback);
    };
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionListeners.push(callback);
    return () => {
      this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
    };
  }
}

// Singleton instance
export const wsService = new WebSocketService();
