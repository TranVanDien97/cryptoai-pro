const fs = require('fs');
const p = 'web/app.js';
let d = fs.readFileSync(p, 'utf8');

d = d.replace(/\r\n/g, '\n');

// 1. Replace buildWsStreams to filter only valid Binance tickers
const targetBuild = `function buildWsStreams(){
  const syms=new Set();
  S.crypto.forEach(c=>{
    const t=ID_TO_TICKER[c.id]||(c.symbol||'').toUpperCase();
    if(t&&/^[A-Z0-9]{2,15}$/.test(t))syms.add(t.toLowerCase()+'usdt');
  });
  S.holdings.forEach(h=>{
    const t=getTicker(h);
    if(t&&/^[A-Z0-9]{2,15}$/.test(t))syms.add(t.toLowerCase()+'usdt');
  });
  return[...syms].slice(0,120); // giới hạn hợp lý cho 1 kết nối combined-stream
}`;

const replacementBuild = `function buildWsStreams(){
  const syms=new Set();
  S.crypto.forEach(c=>{
    const t=ID_TO_TICKER[c.id]||(c.symbol||'').toUpperCase();
    const bSymbol = (t + 'USDT').toUpperCase();
    if(t && S.tickerMap && S.tickerMap[bSymbol]) {
      syms.add(bSymbol.toLowerCase());
    }
  });
  S.holdings.forEach(h=>{
    const t=getTicker(h);
    if (t) {
      const bSymbol = (t + 'USDT').toUpperCase();
      if (S.tickerMap && S.tickerMap[bSymbol]) {
        syms.add(bSymbol.toLowerCase());
      }
    }
  });
  
  if (syms.size === 0) {
    // Default fallback list to ensure WS opens
    return ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt'];
  }
  return[...syms].slice(0,120); // giới hạn hợp lý cho 1 kết nối combined-stream
}`;

if (d.includes(targetBuild)) {
  d = d.replace(targetBuild, () => replacementBuild);
  console.log('Successfully patched buildWsStreams to filter valid Binance tickers');
} else {
  console.log('Error: targetBuild not found!');
}

// 2. Add CoinGecko polling loop for low-cap coins at the end of app.js
const cgPollingCode = `
// CoinGecko fallback polling loop for low-cap coins not on Binance (e.g. ALLO, KITE)
setInterval(async () => {
  if (!S.holdings || S.holdings.length === 0) return;
  
  const nonBinanceHoldings = S.holdings.filter(h => {
    const t = getTicker(h);
    if (!t) return true;
    const bSymbol = (t + 'USDT').toUpperCase();
    return !(S.tickerMap && S.tickerMap[bSymbol]);
  });
  
  if (nonBinanceHoldings.length > 0) {
    const ids = nonBinanceHoldings.map(h => h.id).join(',');
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=usd');
      const prices = await r.json();
      let changed = false;
      nonBinanceHoldings.forEach(h => {
        const pVal = prices[h.id]?.usd;
        if(pVal) {
          livePrices[h.symbol.toUpperCase()] = { p: pVal, t: Date.now() };
          livePrices[h.symbol.toUpperCase()+'USDT'] = { p: pVal, t: Date.now() };
          changed = true;
        }
      });
      if (changed && typeof window.updateLiveUI === 'function') {
        window.updateLiveUI();
      }
    } catch(e) {
      console.warn('CoinGecko background polling failed:', e);
    }
  }
}, 10000);
`;

if (!d.includes('CoinGecko fallback polling loop')) {
  d += cgPollingCode;
}

fs.writeFileSync(p, d, 'utf8');
