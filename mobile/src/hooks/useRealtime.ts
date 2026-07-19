/**
 * useRealtime — React hook for real-time WebSocket data
 */
import { useEffect, useRef, useState } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { wsService, TickerUpdate } from '../services/websocket';
import { api } from '../services/api';
import { notificationApi } from '../services/notifications';

/**
 * Hook to manage WebSocket connection lifecycle.
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
    };
  }, []);

  return { isConnected };
}

/**
 * Hook to receive real-time stock price updates and apply them to the store.
 */
export function useRealtimePrices() {
  const updateStockFromTick = useMarketStore(s => s.updateStockFromTick);

  useEffect(() => {
    const unsubTicker = wsService.onTickerUpdate((tick) => {
      updateStockFromTick(tick);
    });

    return () => {
      unsubTicker();
    };
  }, [updateStockFromTick]);
}

/**
 * Hook to subscribe to watchlist symbols for focused updates.
 */
export function useWatchlistSubscription(symbols: string[]) {
  const prevSymbols = useRef<string[]>([]);

  useEffect(() => {
    if (!wsService.isConnected) return;

    // Subscribe new symbols
    if (symbols.length > 0) {
      wsService.subscribeWatchlist(symbols);
    }

    prevSymbols.current = symbols;
  }, [symbols]);
}

/**
 * Hook to poll AI signals periodically and trigger push notifications.
 */
export function useRealtimeAlerts() {
  const addNotification = useMarketStore(s => s.addNotification);
  const watchlist = useMarketStore(s => s.watchlist);
  const lastAlertTimes = useRef<Record<string, number>>({});

  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const signals = await api.getAISignals(watchlist);
        const now = Date.now();
        
        signals.forEach(sig => {
          const lastTime = lastAlertTimes.current[sig.symbol] || 0;
          // Rate-limit notifications per coin to 2 minutes for testing/demo
          if (now - lastTime < 120000) return;

          const isActionable = sig.signal === 'BUY' || sig.signal === 'SELL' || sig.signal === 'DCA';
          if (isActionable) {
            lastAlertTimes.current[sig.symbol] = now;
            
            // Trigger OS Notification
            notificationApi.sendLocalNotification(
              `🤖 AI Cảnh báo: ${sig.symbol}`,
              `Hành động: ${sig.signal} • ${sig.reasons[0] || 'Phát hiện tín hiệu giao dịch mới.'}`,
              { symbol: sig.symbol }
            );

            // Add in-app notification to store
            addNotification({
              id: sig.id,
              type: 'AI_SIGNAL',
              symbol: sig.symbol,
              title: `Tín hiệu ${sig.symbol}`,
              message: sig.reasons[0] || 'Phát hiện tín hiệu giao dịch mới.',
              priority: 'HIGH',
              timestamp: now,
              read: false,
            });
          }
        });
      } catch (e) {
        console.warn('Failed to run background alert check', e);
      }
    };

    // Run first check after 5 seconds
    const initialTimer = setTimeout(checkAlerts, 5000);
    
    // Poll every 60 seconds for demo
    const interval = setInterval(checkAlerts, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [watchlist, addNotification]);
}
