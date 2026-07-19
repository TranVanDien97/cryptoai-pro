const fs = require('fs');
const p = 'web/app.js';
let d = fs.readFileSync(p, 'utf8');

// 1. Add interactive chart call to asset-card in renderPortfolio()
d = d.replace(/return `<div class="asset-card">/g, 'return `<div class="asset-card" onclick="showInteractiveChart(\'${sym}\')">');
// Make sure pencil editCost and other buttons stop propagation
d = d.replace(/onclick="editCost\('/g, 'onclick="event.stopPropagation();editCost(\'');

// 2. Add interactive chart call to mca-item in renderMyCoinsAlerts()
d = d.replace(/return`<div class="mca-item">/g, 'return`<div class="mca-item" onclick="showInteractiveChart(\'${sym}\')">');

// 3. Inject new window.showInteractiveChart and Whale WS functions at the end of app.js
const fnStr = `
// Whale Tracker Live Logic
let whaleWS = null;
let currentWhaleSymbol = 'BTCUSDT';

window.startWhaleTracker = function(symbol) {
  if (whaleWS) {
    try { whaleWS.close(); } catch(e){}
  }
  const symStr = symbol.toUpperCase().endsWith('USDT') ? symbol.toUpperCase() : symbol.toUpperCase() + 'USDT';
  currentWhaleSymbol = symStr;
  
  const feed = document.getElementById('whaleTradesFeed');
  if(feed) feed.innerHTML = \`<div style="color: var(--t4); text-align: center; padding-top: 20px;">Đang quét lệnh lớn \${currentWhaleSymbol}...</div>\`;
  
  const wsSymbol = symStr.toLowerCase();
  const url = \`wss://stream.binance.com:9443/ws/\${wsSymbol}@aggTrade\`;
  whaleWS = new WebSocket(url);
  
  whaleWS.onmessage = (e) => {
    try {
      const d = JSON.parse(e.data);
      const price = parseFloat(d.p);
      const qty = parseFloat(d.q);
      const val = price * qty;
      if (val >= 20000) { // $20,000 USDT
        const isBuyerMaker = d.m; // true = SELL, false = BUY
        const side = isBuyerMaker ? 'SELL' : 'BUY';
        const color = isBuyerMaker ? 'var(--red)' : 'var(--green)';
        const time = new Date(d.E).toLocaleTimeString();
        
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.padding = '2px 4px';
        row.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
        row.innerHTML = \`
          <span>\${time}</span>
          <span style="color:\${color}; font-weight:bold;">\${side}</span>
          <span>$\${F.usd(price)}</span>
          <span style="color:var(--yellow)">$\${Math.round(val/1000)}k</span>
        \`;
        
        if (feed) {
          if (feed.querySelector('.empty-msg') || feed.textContent.includes('Đang quét')) {
            feed.innerHTML = '';
          }
          feed.insertBefore(row, feed.firstChild);
          if (feed.children.length > 25) {
            feed.removeChild(feed.lastChild);
          }
        }
      }
    } catch(err) {
      console.error(err);
    }
  };
};

window.updateOrderbookImbalance = async function(symbol) {
  try {
    const symStr = symbol.toUpperCase().endsWith('USDT') ? symbol.toUpperCase() : symbol.toUpperCase() + 'USDT';
    const res = await fetchJ(BACKEND + \`/api/binance/depth?symbol=\${symStr}&limit=100\`);
    if(res && res.bids && res.asks) {
      let bidVol = 0;
      let askVol = 0;
      for(let i=0; i<Math.min(20, res.bids.length); i++) {
        bidVol += parseFloat(res.bids[i][1]);
        askVol += parseFloat(res.asks[i][1]);
      }
      const total = bidVol + askVol;
      const bidPct = total > 0 ? Math.round((bidVol / total) * 100) : 50;
      const askPct = 100 - bidPct;
      
      const elSym = document.getElementById('imbalanceSymbol');
      const elPct = document.getElementById('imbalancePct');
      const elBid = document.getElementById('bidGauge');
      const elAsk = document.getElementById('askGauge');
      
      if(elSym) elSym.textContent = symStr;
      if(elPct) elPct.textContent = \`\${bidPct}% / \${askPct}%\`;
      if(elBid) elBid.style.width = \`\${bidPct}%\`;
      if(elAsk) elAsk.style.width = \`\${askPct}%\`;
    }
  } catch(e) {
    console.error('Error fetching depth:', e);
  }
};

// Interactive Chart Logic
window.showInteractiveChart = async function(symbol) {
  const modal = document.getElementById('chartModal');
  if(!modal) return;
  modal.classList.add('on');
  
  const cleanSym = symbol.toUpperCase().replace('USDT', '');
  document.getElementById('chartModalTitle').textContent = \`Biểu đồ kỹ thuật: \${cleanSym}/USDT\`;
  
  const container = document.getElementById('chartContainer');
  container.innerHTML = \`<div style="color: var(--t4); text-align: center; padding-top: 150px;">Đang tải biểu đồ \${cleanSym}...</div>\`;
  
  // Calculate support and resistance from AI alert or defaults
  const aiAlert = aiSmartAlertsData[cleanSym] || aiSmartAlertsData[cleanSym+'USDT'];
  const support = aiAlert?.meta?.breakout?.support || 0;
  const resistance = aiAlert?.meta?.breakout?.resistance || 0;
  
  document.getElementById('chartSupportVal').textContent = support ? \`$\${F.usd(support)}\` : '--';
  document.getElementById('chartResistanceVal').textContent = resistance ? \`$\${F.usd(resistance)}\` : '--';

  // Start Whale tracking for this coin too!
  window.startWhaleTracker(cleanSym);

  // Fetch candles
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
  }

  container.innerHTML = '';
  
  const chart = LightweightCharts.createChart(container, {
    layout: {
      background: { color: '#181A20' },
      textColor: '#d1d4dc',
    },
    grid: {
      vertLines: { color: 'rgba(42, 46, 57, 0.15)' },
      horzLines: { color: 'rgba(42, 46, 57, 0.15)' },
    },
    rightPriceScale: {
      borderVisible: false,
    },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
    },
  });

  const candleSeries = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  });
  
  candleSeries.setData(klines);

  // EMA Lines
  const ema20 = calculateEMA(klines, 20);
  const ema50 = calculateEMA(klines, 50);

  const ema20Series = chart.addLineSeries({ color: '#2979FF', lineWidth: 1.5, title: 'EMA 20' });
  ema20Series.setData(ema20);
  
  const ema50Series = chart.addLineSeries({ color: '#FFD740', lineWidth: 1.5, title: 'EMA 50' });
  ema50Series.setData(ema50);

  // Support/Resistance lines
  if(support > 0) {
    candleSeries.createPriceLine({
      price: support,
      color: '#26a69a',
      lineWidth: 1.5,
      lineStyle: LightweightCharts.LineStyle.Dotted,
      axisLabelVisible: true,
      title: 'Hỗ trợ AI',
    });
  }
  if(resistance > 0) {
    candleSeries.createPriceLine({
      price: resistance,
      color: '#ef5350',
      lineWidth: 1.5,
      lineStyle: LightweightCharts.LineStyle.Dotted,
      axisLabelVisible: true,
      title: 'Kháng cự AI',
    });
  }
};

function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  let emaVal = data[0].close;
  const emaData = [{ time: data[0].time, value: emaVal }];
  for(let i=1; i<data.length; i++) {
    emaVal = data[i].close * k + emaVal * (1 - k);
    emaData.push({ time: data[i].time, value: emaVal });
  }
  return emaData;
}
`;

if (!d.includes('window.showInteractiveChart')) {
  d += fnStr;
}

// 4. Hook close chartModal and kick off feeds inside DOMContentLoaded init
// Let's find init() inside DOMContentLoaded or similar
// We will just append the event listener setup to app.js
const eventSetup = `
document.addEventListener('DOMContentLoaded', () => {
  // Close chart modal event
  const closeBtn = document.getElementById('chartModalClose');
  if(closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('chartModal').classList.remove('on');
    });
  }
  
  // Kick off Whale Tracker & Orderbook
  setTimeout(() => {
    window.startWhaleTracker('BTCUSDT');
    setInterval(() => {
      if(currentWhaleSymbol) {
        window.updateOrderbookImbalance(currentWhaleSymbol);
      }
    }, 4000);
  }, 3000);
});
`;

if (!d.includes('chartModalClose')) {
  d += eventSetup;
}

fs.writeFileSync(p, d);
console.log('Successfully patched app.js');
