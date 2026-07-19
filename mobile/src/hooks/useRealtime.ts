/**
 * useRealtime — React hook for real-time WebSocket data
 *
 * Connects to WebSocket on mount, subscribes to watchlist updates,
 * and updates the Zustand store with live price data.
 */
import { useEffect, useRef, useState } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { wsService, TickerUpdate, MarketIndexUpdate, AlertPayload } from '../services/websocket';

/**
 * Hook to manage WebSocket connection lifecycle.
 * Call once in App or top-level component.
 */
export function useRealtimeConnection() {
  const [isConnected, setIsConnected] = useState(wsService.isConnected);

  useEffect(() => {
    wsService.connect();

    const unsub = wsService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsub();
      // Don't disconnect on unmount — keep alive across screens
    };
  }, []);

  return { isConnected };
}

/**
 * Hook to receive real-time stock price updates and apply them to the store.
 */
export function useRealtimePrices() {
  const updateStockFromTick = useMarketStore(s => s.updateStockFromTick);
  const updateIndexFromTick = useMarketStore(s => s.updateIndexFromTick);

  useEffect(() => {
    const unsubBatch = wsService.onBatchUpdate((ticks) => {
      for (const tick of ticks) {
        updateStockFromTick(tick);
      }
    });

    const unsubTicker = wsService.onTickerUpdate((tick) => {
      updateStockFromTick(tick);
    });

    const unsubIndex = wsService.onIndexUpdate((update) => {
      updateIndexFromTick(update);
    });

    return () => {
      unsubBatch();
      unsubTicker();
      unsubIndex();
    };
  }, [updateStockFromTick, updateIndexFromTick]);
}

/**
 * Hook to subscribe to watchlist symbols for focused updates.
 */
export function useWatchlistSubscription(symbols: string[]) {
  const prevSymbols = useRef<string[]>([]);

  useEffect(() => {
    if (!wsService.isConnected) return;

    // Unsubscribe old symbols
    if (prevSymbols.current.length > 0) {
      wsService.unsubscribeWatchlist(prevSymbols.current);
    }

    // Subscribe new symbols
    if (symbols.length > 0) {
      wsService.subscribeWatchlist(symbols);
    }

    prevSymbols.current = symbols;

    return () => {
      if (symbols.length > 0) {
        wsService.unsubscribeWatchlist(symbols);
      }
    };
  }, [symbols]);
}

/**
 * Hook to receive real-time alerts.
 */
export function useRealtimeAlerts(onAlert?: (alert: AlertPayload) => void) {
  const addNotification = useMarketStore(s => s.addNotification);

  useEffect(() => {
    const unsub = wsService.onAlert((alert) => {
      // Add to store
      addNotification({
        id: alert.id,
        type: alert.type,
        symbol: alert.symbol,
        title: alert.title,
        message: alert.message,
        priority: alert.priority,
        timestamp: alert.timestamp,
        read: false,
      });

      // Custom callback
      onAlert?.(alert);
    });

    return unsub;
  }, [addNotification, onAlert]);
}
