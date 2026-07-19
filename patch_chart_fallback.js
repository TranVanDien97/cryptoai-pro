const fs = require('fs');
const p = 'web/app.js';
let d = fs.readFileSync(p, 'utf8');

d = d.replace(/\r\n/g, '\n');

// 1. Locate the candle fetching logic in showInteractiveChart
const candleFetchTarget = `  // Fetch candles
  let klines = [];
  try {
    const r = await fetch(\`https://api.binance.com/api/v3/klines?symbol=\${cleanSym}USDT&interval=1d&limit=150\`);
    const data = await r.json();
    if(Array.isArray(data)) {
      klines = data.map(k => ({
        time: k[0] / 1000,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        value: parseFloat(k[5])
      }));
    }
  } catch(e) {
    console.error(e);
    container.innerHTML = '<div style="color: var(--red); text-align: center; padding-top: 150px;">Không thể tải dữ liệu từ Binance.</div>';
    return;
  }
  
  if(!klines.length) {
    container.innerHTML = '<div style="color: var(--red); text-align: center; padding-top: 150px;">Cặp giao dịch không khả dụng trên Binance.</div>';
    return;
  }`;

const candleFetchReplacement = `  // Fetch candles with CoinGecko fallback for low-cap coins (e.g. ALLO, KITE)
  let klines = [];
  try {
    const r = await fetch(\`https://api.binance.com/api/v3/klines?symbol=\${cleanSym}USDT&interval=1d&limit=150\`);
    if (r.ok) {
      const data = await r.json();
      if(Array.isArray(data)) {
        klines = data.map(k => ({
          time: k[0] / 1000,
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          value: parseFloat(k[5])
        }));
      }
    }
  } catch(e) {
    console.warn('Binance chart failed, trying CoinGecko...');
  }
  
  // CoinGecko fallback
  if (!klines || !klines.length) {
    try {
      const coinObj = S.crypto.find(c => c.symbol.toLowerCase() === cleanSym.toLowerCase()) || 
                      S.holdings.find(h => h.symbol.toLowerCase() === cleanSym.toLowerCase());
      const cgId = coinObj ? coinObj.id : cleanSym.toLowerCase();
      
      const r = await fetch(\`https://api.coingecko.com/api/v3/coins/\${cgId}/ohlc?vs_currency=usd&days=30\`);
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data)) {
          klines = data.map(k => ({
            time: k[0] / 1000,
            open: k[1],
            high: k[2],
            low: k[3],
            close: k[4]
          }));
        }
      }
    } catch(e) {
      console.error('CoinGecko fallback chart failed:', e);
    }
  }
  
  if(!klines || !klines.length) {
    container.innerHTML = '<div style="color: var(--red); text-align: center; padding-top: 150px;">Biểu đồ của đồng coin này không khả dụng trên cả Binance & CoinGecko.</div>';
    return;
  }`;

if (d.includes(candleFetchTarget)) {
  d = d.replace(candleFetchTarget, () => candleFetchReplacement);
  console.log('Successfully injected CoinGecko chart fallback');
} else {
  console.log('Error: candleFetchTarget not found!');
}

fs.writeFileSync(p, d, 'utf8');
