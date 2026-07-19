const fs = require('fs');
const p = 'web/app.js';
let d = fs.readFileSync(p, 'utf8');

// 1. Add addBreakoutAlert function to the end of app.js
const breakoutAlertCode = `
// Advanced Live Market Breakout Feed
window.addBreakoutAlert = function(symbol, type, message) {
  const feed = document.getElementById('breakoutAlertsFeed');
  if(!feed) return;
  
  if (feed.querySelector('.empty-msg') || feed.textContent.includes('Chưa phát hiện')) {
    feed.innerHTML = '';
  }
  
  const cleanSym = symbol.toUpperCase().replace('USDT', '');
  const key = cleanSym + '_' + type;
  const now = Date.now();
  if (!window.lastBreakoutAlerts) window.lastBreakoutAlerts = {};
  if (window.lastBreakoutAlerts[key] && now - window.lastBreakoutAlerts[key] < 300000) {
    return; // 5-minute spam protection
  }
  window.lastBreakoutAlerts[key] = now;
  
  const icon = type === 'breakout' ? '🚀' : type === 'breakdown' ? '📉' : type === 'vol' ? '💥' : '🔔';
  const color = type === 'breakout' ? 'var(--green)' : type === 'breakdown' ? 'var(--red)' : type === 'vol' ? 'var(--yellow)' : 'var(--blue)';
  
  const card = document.createElement('div');
  card.className = 'card';
  card.style.margin = '6px 0';
  card.style.padding = '8px 12px';
  card.style.display = 'flex';
  card.style.alignItems = 'center';
  card.style.gap = '10px';
  card.style.borderLeft = '3px solid ' + color;
  card.style.fontSize = '12px';
  
  const time = new Date().toLocaleTimeString();
  
  card.innerHTML = 
    '<div style="font-size: 18px;">' + icon + '</div>' +
    '<div style="flex:1;">' +
      '<div style="display:flex; justify-content:space-between; font-weight:bold;">' +
        '<span style="color:var(--yellow);">' + cleanSym + '/USDT</span>' +
        '<span style="color:var(--t4); font-size:9px;">' + time + '</span>' +
      '</div>' +
      '<div style="color:var(--t1); margin-top:2px; font-size:11px;">' + message + '</div>' +
    '</div>';
  
  feed.insertBefore(card, feed.firstChild);
  if(feed.children.length > 20) {
    feed.removeChild(feed.lastChild);
  }
  
  // Trigger system notification & audio alert
  addAlert(cleanSym + ' ' + message);
};
`;

if (!d.includes('window.addBreakoutAlert')) {
  d += breakoutAlertCode;
}

// 2. Inject breakout alerts check in fetchSmartAlertsData loop
const targetLoop = `    coinsData.push({
      symbol: h.symbol.toUpperCase(), 
      price: cp,
      entryPrice: h.cost,
      pnlPct: pnlPct,
      resistance: highs[0], 
      support: lows[0], 
      candles,
      volume24h: lastDayVol, 
      avgVolume: avgVolume 
    });`;

const replacementLoop = `    coinsData.push({
      symbol: h.symbol.toUpperCase(), 
      price: cp,
      entryPrice: h.cost,
      pnlPct: pnlPct,
      resistance: highs[0], 
      support: lows[0], 
      candles,
      volume24h: lastDayVol, 
      avgVolume: avgVolume 
    });
    
    // Auto-check breakout and volume spikes for live alerts feed
    const resistanceVal = highs[0];
    const supportVal = lows[0];
    if (cp >= resistanceVal * 0.99) {
      if (typeof window.addBreakoutAlert === 'function') {
        window.addBreakoutAlert(h.symbol, 'breakout', 'Giá tiệm cận hoặc bứt phá đỉnh kháng cự $' + F.usd(resistanceVal) + ' (Tín hiệu tăng mạnh!).');
      }
    } else if (cp <= supportVal * 1.01) {
      if (typeof window.addBreakoutAlert === 'function') {
        window.addBreakoutAlert(h.symbol, 'breakdown', 'Giá tiệm cận hoặc đục thủng đáy hỗ trợ $' + F.usd(supportVal) + ' (Rủi ro xả hàng!).');
      }
    }
    if (lastDayVol >= avgVolume * 2.5) {
      if (typeof window.addBreakoutAlert === 'function') {
        window.addBreakoutAlert(h.symbol, 'vol', 'Khối lượng giao dịch tăng đột biến gấp ' + (lastDayVol/avgVolume).toFixed(1) + ' lần trung bình 30 ngày.');
      }
    }`;

d = d.replace(targetLoop, replacementLoop);

fs.writeFileSync(p, d);
console.log('Successfully patched app.js alerts logic');
