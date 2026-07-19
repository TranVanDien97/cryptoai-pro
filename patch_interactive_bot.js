const fs = require('fs');
const p = 'web/app.js';
let d = fs.readFileSync(p, 'utf8');

// Normalize line endings to LF
d = d.replace(/\r\n/g, '\n');

// 1. Inject Manual Buy/Sell functions at the end of app.js
const manualTradesCode = `
// Manual Virtual Buy/Sell functions
window.buyVirtualMarket = function(symbol, price) {
  const cleanSym = symbol.toUpperCase().replace('USDT', '');
  const amtStr = prompt('Nhap so USDT muon dau tu vao ' + cleanSym + ' (Vốn ảo hien co: $' + Math.round(botState.balanceUSDT) + '):', '2000');
  if(!amtStr) return;
  
  const amt = parseFloat(amtStr);
  if (isNaN(amt) || amt <= 0) {
    alert('So tien khong hop le.');
    return;
  }
  
  if (amt > botState.balanceUSDT) {
    alert('Khong du so du USDT ao.');
    return;
  }
  
  // Check if position already exists
  const existing = botState.positions.find(p => p.symbol === cleanSym);
  const liveP = price || livePrices[cleanSym+'USDT']?.p || S.tickerMap[cleanSym+'USDT'] || 0;
  
  if (liveP <= 0) {
    alert('Khong co gia live cho coin nay.');
    return;
  }
  
  const qty = amt / liveP;
  botState.balanceUSDT -= amt;
  
  if (existing) {
    // DCA: Recalculate average buy price
    const newQty = existing.qty + qty;
    const newBuyPrice = (existing.buyPrice * existing.qty + liveP * qty) / newQty;
    existing.qty = newQty;
    existing.buyPrice = newBuyPrice;
    existing.currentPrice = liveP;
  } else {
    botState.positions.push({
      symbol: cleanSym,
      qty: qty,
      buyPrice: liveP,
      currentPrice: liveP
    });
  }
  
  botState.logs.unshift({
    time: new Date().toLocaleTimeString(),
    symbol: cleanSym,
    type: 'BUY',
    price: liveP,
    qty: qty,
    pnl: 0
  });
  
  saveBotState();
  toast('🤖 Da mua ao ' + cleanSym + ' voi $' + Math.round(amt) + ' USDT.', 'success');
};

window.sellVirtualMarket = function(symbol) {
  const cleanSym = symbol.toUpperCase().replace('USDT', '');
  const posIndex = botState.positions.findIndex(p => p.symbol === cleanSym);
  if (posIndex === -1) {
    alert('Khong tim thay vi the mo cho ' + cleanSym);
    return;
  }
  
  const pos = botState.positions[posIndex];
  const liveP = livePrices[cleanSym+'USDT']?.p || S.tickerMap[cleanSym+'USDT'] || pos.currentPrice;
  const pnl = (liveP - pos.buyPrice) * pos.qty;
  const totalReturn = pos.qty * liveP;
  
  botState.balanceUSDT += totalReturn;
  botState.logs.unshift({
    time: new Date().toLocaleTimeString(),
    symbol: cleanSym,
    type: 'SELL',
    price: liveP,
    qty: pos.qty,
    pnl: pnl
  });
  
  botState.positions.splice(posIndex, 1);
  saveBotState();
  toast('🤖 Da ban ao ' + cleanSym + ' chot lai/lo: ' + (pnl >= 0 ? '+' : '') + '$' + F.usd(pnl), pnl >= 0 ? 'success' : 'warn');
};
`;

if (!d.includes('window.buyVirtualMarket')) {
  d += manualTradesCode;
}

// 2. Modify sigCardHTML() at line 1296 (end of card) to append the "Mua ảo" button
const cardEndTarget = `      <div><div class="label">\${s.tp2?'Mục tiêu 1':'Chốt lời'}</div><div class="val g">\${F.usd(s.tp)}</div>\${s.tp2?\`<div class="val2">T2: \${F.usd(s.tp2)}</div>\`:''}</div>
    </div>
  </div>\`;`;

const cardEndReplacement = `      <div><div class="label">\${s.tp2?'Mục tiêu 1':'Chốt lời'}</div><div class="val g">\${F.usd(s.tp)}</div>\${s.tp2?\`<div class="val2">T2: \${F.usd(s.tp2)}</div>\`:''}</div>
    </div>
    <div style="margin-top:10px; border-top:1px solid var(--border); padding-top:8px; display:flex; justify-content:space-between; align-items:center;">
      <button class="btn btn-yellow btn-sm" style="padding: 4px 8px; font-size:10px; font-weight:bold;" onclick="event.stopPropagation(); window.buyVirtualMarket('\${s.symbol}', \${liveP})">🛒 Mua ảo</button>
      <span style="font-size:10px; color:var(--t4)">R/R: \${s.rr}</span>
    </div>
  </div>\`;`;

if (d.includes(cardEndTarget)) {
  d = d.replace(cardEndTarget, () => cardEndReplacement);
} else {
  console.log('Error: Card target not found!');
}

// 3. Modify updateBotUI() positions table rendering (add Sell button)
const posTableTarget = `        return '<tr>' +
          '<td><strong>' + p.symbol + '</strong></td>' +
          '<td>' + p.qty.toFixed(4) + '</td>' +
          '<td>$' + F.usd(p.buyPrice) + '</td>' +
          '<td class="live-price" data-live-sym="' + p.symbol + '">$' + F.usd(p.currentPrice) + '</td>' +
          '<td class="' + (pnl >= 0 ? 'gain' : 'loss') + '">' + (pnl >= 0 ? '+' : '') + '$' + F.usd(pnl) + ' (' + pnlPct.toFixed(1) + '%)</td>' +
        '</tr>';`;

const posTableReplacement = `        return '<tr>' +
          '<td><strong>' + p.symbol + '</strong></td>' +
          '<td>' + p.qty.toFixed(4) + '</td>' +
          '<td>$' + F.usd(p.buyPrice) + '</td>' +
          '<td class="live-price" data-live-sym="' + p.symbol + '">$' + F.usd(p.currentPrice) + '</td>' +
          '<td class="' + (pnl >= 0 ? 'gain' : 'loss') + '">' + (pnl >= 0 ? '+' : '') + '$' + F.usd(pnl) + ' (' + pnlPct.toFixed(1) + '%)</td>' +
          '<td><button class="btn btn-red btn-sm" style="padding:2px 6px; font-size:10px; font-weight:bold;" onclick="window.sellVirtualMarket(\\'' + p.symbol + '\\')">Bán</button></td>' +
        '</tr>';`;

if (d.includes(posTableTarget)) {
  d = d.replace(posTableTarget, () => posTableReplacement);
} else {
  console.log('Error: Pos table target not found!');
}

// 4. Update empty message colspan in positions table too
d = d.replace('colspan="5" class="ld" style="text-align:center;padding:20px;color:var(--t4)"', 'colspan="6" class="ld" style="text-align:center;padding:20px;color:var(--t4)"');

fs.writeFileSync(p, d, 'utf8');
console.log('Successfully patched app.js for interactive bot manual trades');
