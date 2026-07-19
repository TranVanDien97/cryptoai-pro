const fs = require('fs');
const p = 'web/app.js';
let d = fs.readFileSync(p, 'utf8');

// Normalize line endings to LF
d = d.replace(/\r\n/g, '\n');

const breakoutAlertCode = `
// Advanced Live Market Breakout Feed
window.addBreakoutAlert = function(symbol, type, message) {
  const feed = document.getElementById('breakoutAlertsFeed');
  if(!feed) return;
  
  if (feed.querySelector('.empty-msg') || feed.textContent.includes('Chua phat hien')) {
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

const targetStr = `    coinsData.push({
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

// Escape $ as $$ to prevent String.replace special token behaviors like $'
const replacementStr = `    coinsData.push({
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
        window.addBreakoutAlert(h.symbol, 'breakout', 'Gia tiem can/vuot dinh khang cu $$' + F.usd(resistanceVal));
      }
    } else if (cp <= supportVal * 1.01) {
      if (typeof window.addBreakoutAlert === 'function') {
        window.addBreakoutAlert(h.symbol, 'breakdown', 'Gia tiem can/thung day ho tro $$' + F.usd(supportVal));
      }
    }
    if (lastDayVol >= avgVolume * 2.5) {
      if (typeof window.addBreakoutAlert === 'function') {
        window.addBreakoutAlert(h.symbol, 'vol', 'Khong luong tang dot bien gap ' + (lastDayVol/avgVolume).toFixed(1) + ' lan 30d');
      }
    }`;

if (d.includes(targetStr)) {
  d = d.replace(targetStr, () => replacementStr); // Using a function for replacement bypasses special pattern parsing!
  console.log('Target replaced!');
} else {
  console.log('Error: Target still not found!');
}

fs.writeFileSync(p, d, 'utf8');
console.log('Patched');
