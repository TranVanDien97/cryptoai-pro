/**
 * StockAI — AI-Powered Vietnamese Stock Investment App
 *
 * Phase 2: WebSocket real-time connection initialized at app level.
 */
import React, {useEffect} from 'react';
import {AppNavigator} from './src/navigation/AppNavigator';
import {wsService} from './src/services/websocket';
import {notificationApi} from './src/services/notifications';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize WebSocket connection on app start
    wsService.connect();

    // Register push notification permissions
    notificationApi.registerForPushNotificationsAsync();

    // Subscribe to default watchlist
    const defaultWatchlist = ['BTC', 'ETH', 'ALLO', 'KITE', 'NEAR', 'TRX'];
    wsService.subscribeWatchlist(defaultWatchlist);

    return () => {
      wsService.disconnect();
    };
  }, []);

  return <AppNavigator />;
}

export default App;
