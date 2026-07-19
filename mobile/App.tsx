/**
 * StockAI — AI-Powered Vietnamese Stock Investment App
 *
 * Phase 2: WebSocket real-time connection initialized at app level.
 */
import React, {useEffect} from 'react';
import {AppNavigator} from './src/navigation/AppNavigator';
import {wsService} from './src/services/websocket';

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize WebSocket connection on app start
    wsService.connect();

    // Subscribe to default watchlist
    const defaultWatchlist = ['FPT', 'VNM', 'VCB', 'HPG', 'MWG', 'SSI', 'ACB', 'TCB'];
    wsService.subscribeWatchlist(defaultWatchlist);

    return () => {
      wsService.disconnect();
    };
  }, []);

  return <AppNavigator />;
}

export default App;
