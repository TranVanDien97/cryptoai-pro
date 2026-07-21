import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

// Format helpers
export const fmt = {
  usd: (v: number) => {
    if (!v || isNaN(v)) return '$0.00';
    if (v >= 1) return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (v >= 0.01) return '$' + v.toFixed(4);
    if (v >= 0.0001) return '$' + v.toFixed(6);
    return '$' + v.toExponential(3);
  },
  pct: (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2) + '%',
  mcap: (v: number) => {
    if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    return '$' + v.toFixed(0);
  },
};

// Coin gecko IDs for known low-caps
const KNOWN_CG_IDS: Record<string, string> = {
  ALLO: 'allobase',
  KITE: 'kite-ai',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
};

function getCoinGeckoId(symbol: string): string {
  const s = symbol.toUpperCase();
  return KNOWN_CG_IDS[s] || s.toLowerCase();
}

export function useLivePrices(symbols: string[]) {
  const { setLivePrice, setWsConnected, updatePositionPrices } = useStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      try { wsRef.current.close(); } catch { /* */ }
    }

    // Only stream coins that are likely on Binance (major coins)
    const binanceSymbols = symbols
      .filter(s => !['ALLO', 'KITE'].includes(s.toUpperCase()))
      .slice(0, 50)
      .map(s => s.toLowerCase() + 'usdt@miniTicker');

    if (!binanceSymbols.length) {
      binanceSymbols.push('btcusdt@miniTicker', 'ethusdt@miniTicker', 'solusdt@miniTicker');
    }

    const url = `wss://stream.binance.com:9443/stream?streams=${binanceSymbols.join('/')}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const d = msg?.data;
        if (!d?.s || !d?.c) return;
        const sym = d.s.replace('USDT', '');
        const price = parseFloat(d.c);
        if (price > 0) {
          setLivePrice(sym, price);
          setLivePrice(sym + 'USDT', price);
        }
      } catch { /* */ }
    };
    ws.onerror = () => { try { ws.close(); } catch { /* */ } };
    ws.onclose = () => {
      setWsConnected(false);
      reconnectRef.current = setTimeout(connect, 5000);
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        try { wsRef.current.close(); } catch { /* */ }
      }
    };
  }, []); // eslint-disable-line

  // Poll CoinGecko every 15s for low-cap coins
  useEffect(() => {
    const lowCaps = symbols.filter(s => ['ALLO', 'KITE'].includes(s.toUpperCase()));
    if (!lowCaps.length) return;
    const poll = async () => {
      try {
        const ids = lowCaps.map(getCoinGeckoId).join(',');
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        const data = await r.json();
        const priceMap: Record<string, number> = {};
        lowCaps.forEach(sym => {
          const id = getCoinGeckoId(sym);
          const p = data[id]?.usd;
          if (p) {
            setLivePrice(sym, p);
            setLivePrice(sym + 'USDT', p);
            priceMap[sym] = p;
          }
        });
        if (Object.keys(priceMap).length) updatePositionPrices(priceMap);
      } catch { /* */ }
    };
    poll();
    const t = setInterval(poll, 15000);
    return () => clearInterval(t);
  }, [symbols.join(',')]); // eslint-disable-line
}
