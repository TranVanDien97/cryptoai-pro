const fs = require('fs');
const p = 'web/app.js';
let d = fs.readFileSync(p, 'utf8');

d = d.replace(/\r\n/g, '\n');

// 1. Add sellAllVirtualPositions and resetBotState to the end of app.js
const extraCode = `
// Convenience functions for Bot Page
window.sellAllVirtualPositions = function() {
  if (botState.positions.length === 0) {
    alert('Khong co vi the mo nao de ban.');
    return;
  }
  if (!confirm('Ban muon thanh ly toan bo vi the dang mo sang USDT?')) {
    return;
  }
  
  botState.positions.forEach(pos => {
    const liveP = livePrices[pos.symbol+'USDT']?.p || S.tickerMap[pos.symbol+'USDT'] || pos.currentPrice;
    const pnl = (liveP - pos.buyPrice) * pos.qty;
    const totalReturn = pos.qty * liveP;
    
    botState.balanceUSDT += totalReturn;
    botState.logs.unshift({
      time: new Date().toLocaleTimeString(),
      symbol: pos.symbol,
      type: 'SELL',
      price: liveP,
      qty: pos.qty,
      pnl: pnl
    });
  });
  
  botState.positions = [];
  saveBotState();
  toast('🤖 Da ban thanh ly toan bo danh muc vi the ao.', 'success');
};

window.resetBotState = function() {
  if (!confirm('Ban thuc su muon dat lai so du bot ve $10,000 USDT va xoa sach lich su?')) {
    return;
  }
  botState = {
    enabled: botState.enabled,
    balanceUSDT: 10000,
    initialBalance: 10000,
    positions: [],
    logs: []
  };
  saveBotState();
  toast('🤖 Da khoi phuc so du ao ve $10,000 USDT.', 'info');
};
`;

if (!d.includes('window.sellAllVirtualPositions')) {
  d += extraCode;
}

// 2. Modify updateBotUI() to make the coin symbol clickable for chart viewing
const rowReplaceTarget = `        return '<tr>' +
          '<td><strong>' + p.symbol + '</strong></td>' +
          '<td>' + p.qty.toFixed(4) + '</td>' +
          '<td>$' + F.usd(p.buyPrice) + '</td>' +
          '<td class="live-price" data-live-sym="' + p.symbol + '">$' + F.usd(p.currentPrice) + '</td>' +
          '<td class="' + (pnl >= 0 ? 'gain' : 'loss') + '">' + (pnl >= 0 ? '+' : '') + '$' + F.usd(pnl) + ' (' + pnlPct.toFixed(1) + '%)</td>' +
          '<td><button class="btn btn-red btn-sm" style="padding:2px 6px; font-size:10px; font-weight:bold;" onclick="window.sellVirtualMarket(\\'' + p.symbol + '\\')">Bán</button></td>' +
        '</tr>';`;

const rowReplaceReplacement = `        return '<tr>' +
          '<td onclick="event.stopPropagation(); window.showInteractiveChart(\\'' + p.symbol + '\\')" style="cursor:pointer; color:var(--yellow); text-decoration:underline;"><strong>' + p.symbol + '</strong></td>' +
          '<td>' + p.qty.toFixed(4) + '</td>' +
          '<td>$' + F.usd(p.buyPrice) + '</td>' +
          '<td class="live-price" data-live-sym="' + p.symbol + '">$' + F.usd(p.currentPrice) + '</td>' +
          '<td class="' + (pnl >= 0 ? 'gain' : 'loss') + '">' + (pnl >= 0 ? '+' : '') + '$' + F.usd(pnl) + ' (' + pnlPct.toFixed(1) + '%)</td>' +
          '<td><button class="btn btn-red btn-sm" style="padding:2px 6px; font-size:10px; font-weight:bold;" onclick="event.stopPropagation(); window.sellVirtualMarket(\\'' + p.symbol + '\\')">Bán</button></td>' +
        '</tr>';`;

if (d.includes(posTableTarget => true)) {
  // Find index and replace directly since it might have CRLF issues or slight formatting differences
  const idx = d.indexOf("'<td><strong>' + p.symbol + '</strong></td>'");
  if (idx !== -1) {
    d = d.replace("'<td><strong>' + p.symbol + '</strong></td>'", "'<td onclick=\"event.stopPropagation(); window.showInteractiveChart(\\\'' + p.symbol + '\\\')\" style=\"cursor:pointer; color:var(--yellow); text-decoration:underline;\"><strong>' + p.symbol + '</strong></td>'");
  }
}

// 3. Inject event listeners inside the DOMContentLoaded block
const domHookTarget = `  if (typeof loadBotState === 'function') {
    loadBotState();
  }`;

const domHookReplacement = `  // Hook new Bot tab buttons
  const btnReset = document.getElementById('btnResetBot');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (typeof window.resetBotState === 'function') window.resetBotState();
    });
  }

  const btnSellAll = document.getElementById('btnBotSellAll');
  if (btnSellAll) {
    btnSellAll.addEventListener('click', () => {
      if (typeof window.sellAllVirtualPositions === 'function') window.sellAllVirtualPositions();
    });
  }

  // Hook Quick Buy form
  const btnQuickBuy = document.getElementById('btnQuickBuy');
  if (btnQuickBuy) {
    btnQuickBuy.addEventListener('click', () => {
      const symInput = document.getElementById('quickBuySymbol');
      const amtInput = document.getElementById('quickBuyAmount');
      if (!symInput || !amtInput) return;
      
      const symbol = symInput.value.trim().toUpperCase();
      const amt = parseFloat(amtInput.value);
      
      if (!symbol) {
        alert('Vui long nhap ma coin.');
        return;
      }
      if (isNaN(amt) || amt <= 0) {
        alert('Vui long nhap so tien hop le.');
        return;
      }
      
      if (typeof window.buyVirtualMarket === 'function') {
        window.buyVirtualMarket(symbol, 0); // triggers prompt with prefilled or handles natively
        symInput.value = '';
        amtInput.value = '';
      }
    });
  }

  if (typeof loadBotState === 'function') {
    loadBotState();
  }`;

if (d.includes(domHookTarget)) {
  d = d.replace(domHookTarget, () => domHookReplacement);
  console.log('Successfully hooked Reset, Sell All and Quick Buy button listeners');
} else {
  console.log('Error: domHookTarget not found!');
}

fs.writeFileSync(p, d, 'utf8');
