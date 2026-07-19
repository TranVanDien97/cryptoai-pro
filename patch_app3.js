const fs = require('fs');
const p = 'web/app.js';
let d = fs.readFileSync(p, 'utf8');

const botCode = `
// ===================================================================
// VIRTUAL BOT & STRATEGY BACKTESTER SYSTEM
// ===================================================================

let botState = {
  enabled: false,
  balanceUSDT: 10000,
  initialBalance: 10000,
  positions: [], // { symbol, qty, buyPrice, currentPrice }
  logs: [] // { time, symbol, type, price, qty, pnl }
};

// Load bot state
function loadBotState() {
  const saved = localStorage.getItem('virtual_bot_state');
  if(saved) {
    try {
      botState = JSON.parse(saved);
    } catch(e) {
      console.error(e);
    }
  }
  updateBotUI();
}

function saveBotState() {
  localStorage.setItem('virtual_bot_state', JSON.stringify(botState));
  updateBotUI();
}

function updateBotUI() {
  const elStatus = document.getElementById('botStatusText');
  const elBalance = document.getElementById('botBalanceText');
  const elGrowth = document.getElementById('botGrowthText');
  const elWinRate = document.getElementById('botWinRateText');
  const elWinCount = document.getElementById('botWinCountText');
  const elActive = document.getElementById('botActiveTradesText');
  
  if(elStatus) {
    elStatus.textContent = botState.enabled ? 'BOT ĐANG CHẠY' : 'BOT TẮT';
    elStatus.style.color = botState.enabled ? 'var(--green)' : 'var(--t4)';
  }
  
  // Calculate total asset value
  let positionsValue = 0;
  botState.positions.forEach(p => {
    const liveP = livePrices[p.symbol+'USDT']?.p || S.tickerMap[p.symbol+'USDT'] || p.currentPrice;
    p.currentPrice = liveP;
    positionsValue += p.qty * liveP;
  });
  
  const totalValue = botState.balanceUSDT + positionsValue;
  const growth = ((totalValue - botState.initialBalance) / botState.initialBalance) * 100;
  
  if(elBalance) elBalance.textContent = '$' + totalValue.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  if(elGrowth) {
    elGrowth.textContent = (growth >= 0 ? '+' : '') + growth.toFixed(2) + '%';
    elGrowth.className = growth >= 0 ? 'gain' : 'loss';
  }
  
  if(elActive) elActive.textContent = botState.positions.length;
  
  // Win rate
  const closedTrades = botState.logs.filter(l => l.type === 'SELL');
  const winningTrades = closedTrades.filter(l => l.pnl > 0);
  const winRate = closedTrades.length > 0 ? Math.round((winningTrades.length / closedTrades.length) * 100) : 0;
  
  if(elWinRate) elWinRate.textContent = winRate + '%';
  if(elWinCount) elWinCount.textContent = winningTrades.length + '/' + closedTrades.length + ' lệnh';
  
  // Render positions table
  const tbodyPos = document.getElementById('botPositionsTbody');
  if(tbodyPos) {
    if(botState.positions.length === 0) {
      tbodyPos.innerHTML = '<tr><td colspan="5" class="ld" style="text-align:center;padding:20px;color:var(--t4)">Không có vị thế mở</td></tr>';
    } else {
      tbodyPos.innerHTML = botState.positions.map(p => {
        const pnl = (p.currentPrice - p.buyPrice) * p.qty;
        const pnlPct = ((p.currentPrice - p.buyPrice) / p.buyPrice) * 100;
        return '<tr>' +
          '<td><strong>' + p.symbol + '</strong></td>' +
          '<td>' + p.qty.toFixed(4) + '</td>' +
          '<td>$' + F.usd(p.buyPrice) + '</td>' +
          '<td class="live-price" data-live-sym="' + p.symbol + '">$' + F.usd(p.currentPrice) + '</td>' +
          '<td class="' + (pnl >= 0 ? 'gain' : 'loss') + '">' + (pnl >= 0 ? '+' : '') + '$' + F.usd(pnl) + ' (' + pnlPct.toFixed(1) + '%)</td>' +
        '</tr>';
      }).join('');
    }
  }
  
  // Render logs table
  const tbodyLogs = document.getElementById('botLogsTbody');
  if(tbodyLogs) {
    if(botState.logs.length === 0) {
      tbodyLogs.innerHTML = '<tr><td colspan="6" class="ld" style="text-align:center;padding:20px;color:var(--t4)">Chưa có giao dịch nào</td></tr>';
    } else {
      tbodyLogs.innerHTML = botState.logs.map(l => {
        const pnlText = l.type === 'SELL' ? '<span class="' + (l.pnl >= 0 ? 'gain' : 'loss') + '">' + (l.pnl >= 0 ? '+' : '') + '$' + F.usd(l.pnl) + '</span>' : '--';
        return '<tr>' +
          '<td style="font-size: 9px; color: var(--t4);">' + l.time + '</td>' +
          '<td><strong>' + l.symbol + '</strong></td>' +
          '<td style="color:' + (l.type==='BUY'?'var(--green)':'var(--red)') + ';font-weight:bold">' + l.type + '</td>' +
          '<td>$' + F.usd(l.price) + '</td>' +
          '<td>' + l.qty.toFixed(2) + '</td>' +
          '<td>' + pnlText + '</td>' +
        '</tr>';
      }).join('');
    }
  }
}

// Bot core loop - triggered when new S.signals are processed
window.processVirtualBot = function() {
  if(!botState.enabled) return;
  
  let changed = false;
  
  // 1. Process active positions (Check exit)
  for(let i = botState.positions.length - 1; i >= 0; i--) {
    const pos = botState.positions[i];
    const liveP = livePrices[pos.symbol+'USDT']?.p || S.tickerMap[pos.symbol+'USDT'] || pos.currentPrice;
    pos.currentPrice = liveP;
    
    // Check signals
    const sig = S.signals.find(s => s.symbol === pos.symbol);
    const pnlPct = ((liveP - pos.buyPrice) / pos.buyPrice) * 100;
    
    let shouldExit = false;
    let exitReason = '';
    
    if(sig) {
      if(sig.signal === 'SELL' || sig.signal === 'STRONG_SELL') {
        shouldExit = true;
        exitReason = 'Tín hiệu AI báo bán';
      }
    }
    // Hard Take Profit / Stop Loss based on AI calculated levels
    if(sig && sig.sl && liveP <= sig.sl) {
      shouldExit = true;
      exitReason = 'Chạm Stop Loss AI';
    }
    if(sig && sig.tp && liveP >= sig.tp) {
      shouldExit = true;
      exitReason = 'Chạm Take Profit AI';
    }
    
    if(shouldExit) {
      // Execute virtual sell
      const pnl = (liveP - pos.buyPrice) * pos.qty;
      botState.balanceUSDT += pos.qty * liveP;
      
      botState.logs.unshift({
        time: new Date().toLocaleTimeString(),
        symbol: pos.symbol,
        type: 'SELL',
        price: liveP,
        qty: pos.qty,
        pnl: pnl
      });
      
      botState.positions.splice(i, 1);
      changed = true;
      toast('🤖 Bot bán ' + pos.symbol + ': ' + exitReason + ' (' + (pnl >= 0 ? '+' : '') + '$' + F.usd(pnl) + ')', pnl >= 0 ? 'success' : 'warn');
    }
  }
  
  // 2. Scan for entries
  S.signals.forEach(sig => {
    if(sig.signal === 'STRONG_BUY' || sig.signal === 'BUY') {
      // Check if we already hold it
      const holds = botState.positions.some(p => p.symbol === sig.symbol);
      if(!holds && botState.balanceUSDT >= 100) {
        // Buy allocation: 20% of current free balance
        const buyAmount = botState.balanceUSDT * 0.2;
        const liveP = livePrices[sig.symbol+'USDT']?.p || S.tickerMap[sig.symbol+'USDT'] || sig.entry;
        const qty = buyAmount / liveP;
        
        botState.balanceUSDT -= buyAmount;
        botState.positions.push({
          symbol: sig.symbol,
          qty: qty,
          buyPrice: liveP,
          currentPrice: liveP
        });
        
        botState.logs.unshift({
          time: new Date().toLocaleTimeString(),
          symbol: sig.symbol,
          type: 'BUY',
          price: liveP,
          qty: qty,
          pnl: 0
        });
        
        changed = true;
        toast('🤖 Bot mua ' + sig.symbol + ' giá $' + F.usd(liveP) + ' (Đầu tư $' + Math.round(buyAmount) + ' USDT)', 'info');
      }
    }
  });
  
  if(changed) {
    saveBotState();
  }
};

window.clearBotHistory = function() {
  if(confirm('Xóa lịch sử giao dịch mô phỏng?')) {
    botState.logs = [];
    saveBotState();
  }
};

// Backtest Algorithm - 30 days daily candles
window.runStrategyBacktest = async function(symbol) {
  const cleanSym = symbol.toUpperCase().replace('USDT', '');
  toast('📊 Đang chạy kiểm thử 30 ngày cho ' + cleanSym + '...', 'info');
  
  try {
    const r = await fetch('https://api.binance.com/api/v3/klines?symbol=' + cleanSym + 'USDT&interval=1d&limit=35');
    const klines = await r.json();
    if(!Array.isArray(klines) || klines.length < 15) {
      alert('Không đủ dữ liệu lịch sử để backtest.');
      return;
    }
    
    // Convert to readable candles
    const candles = klines.map(k => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
    }));
    
    // Simulate Strategy
    let balance = 1000;
    let initialBalance = 1000;
    let pos = null; // { buyPrice, qty }
    let tradesCount = 0;
    let winCount = 0;
    let maxDrawdown = 0;
    let peak = initialBalance;
    
    // Calculate simple EMAs for strategy simulation
    const ema20 = calculateEMA(candles, 20);
    const ema10 = calculateEMA(candles, 10);
    
    // We simulate from index 20 onwards (so we have EMA ready)
    for (let i = 20; i < candles.length; i++) {
      const cur = candles[i];
      const prev = candles[i-1];
      const emaFast = ema10[i].value;
      const emaSlow = ema20[i].value;
      
      const prevEmaFast = ema10[i-1].value;
      const prevEmaSlow = ema20[i-1].value;
      
      // Update Peak for Drawdown
      const curValue = pos ? pos.qty * cur.close : balance;
      if(curValue > peak) peak = curValue;
      const dd = ((peak - curValue) / peak) * 100;
      if(dd > maxDrawdown) maxDrawdown = dd;
      
      // Strategy rules:
      // Buy Setup: fast EMA crosses slow EMA upwards
      if(!pos) {
        if(prevEmaFast <= prevEmaSlow && emaFast > emaSlow) {
          // BUY
          pos = {
            buyPrice: cur.close,
            qty: balance / cur.close
          };
          balance = 0;
        }
      } else {
        // Sell Setup: fast EMA crosses slow EMA downwards OR +15% profit OR -5% Stop Loss
        const profitPct = ((cur.close - pos.buyPrice) / pos.buyPrice) * 100;
        
        if((prevEmaFast >= prevEmaSlow && emaFast < emaSlow) || profitPct >= 15 || profitPct <= -5) {
          // SELL
          balance = pos.qty * cur.close;
          const pnl = balance - (pos.qty * pos.buyPrice);
          tradesCount++;
          if(pnl > 0) winCount++;
          pos = null;
        }
      }
    }
    
    // If holding at the end, liquidate
    if(pos) {
      balance = pos.qty * candles[candles.length-1].close;
      const pnl = balance - (pos.qty * pos.buyPrice);
      tradesCount++;
      if(pnl > 0) winCount++;
    }
    
    const profit = ((balance - initialBalance) / initialBalance) * 100;
    const winRate = tradesCount > 0 ? Math.round((winCount / tradesCount) * 100) : 0;
    
    // Render result inside modal
    alert('📊 KẾT QUẢ BACKTEST 30 NGÀY (' + cleanSym + '/USDT)\\n--------------------------------------\\nTỷ suất sinh lời: ' + (profit >= 0 ? '+' : '') + profit.toFixed(2) + '%\\nWin Rate: ' + winRate + '% (' + winCount + '/' + tradesCount + ' lệnh thắng)\\nVốn ban đầu: $1,000 USDT → Vốn hiện tại: $' + Math.round(balance) + ' USDT\\nĐộ sụt giảm tài sản lớn nhất (Max DD): -' + maxDrawdown.toFixed(1) + '%\\n\\n*Chiến thuật: Giao cắt EMA(10/20) + Chốt lời 15% + Cắt lỗ 5%*');
    
  } catch(e) {
    console.error(e);
    alert('Lỗi khi chạy backtest: ' + e.message);
  }
};
`;

if (!d.includes('window.runStrategyBacktest')) {
  d += botCode;
}

// Hook initialization and handlers
const initHook = `
  // Setup Virtual Bot switch
  const togBot = document.getElementById('togVirtualBot');
  if(togBot) {
    // Load setting
    const savedBotEnabled = localStorage.getItem('virtual_bot_enabled') === 'true';
    togBot.checked = savedBotEnabled;
    botState.enabled = savedBotEnabled;
    
    togBot.addEventListener('change', (e) => {
      botState.enabled = e.target.checked;
      localStorage.setItem('virtual_bot_enabled', botState.enabled ? 'true' : 'false');
      saveBotState();
      toast(botState.enabled ? '🤖 Đã bật Bot Giao Dịch AI!' : '🤖 Đã tắt Bot.', botState.enabled ? 'success' : 'info');
    });
  }

  // Clear bot history
  const btnClearHistory = document.getElementById('btnClearBotHistory');
  if(btnClearHistory) {
    btnClearHistory.addEventListener('click', clearBotHistory);
  }

  // Hook run backtest button
  const btnBacktest = document.getElementById('btnRunBacktest');
  if(btnBacktest) {
    btnBacktest.addEventListener('click', () => {
      const title = document.getElementById('chartModalTitle').textContent;
      const symbol = title.replace('Biểu đồ kỹ thuật: ', '').split('/')[0];
      window.runStrategyBacktest(symbol);
    });
  }
  
  loadBotState();
`;

// Inject initHook right inside the DOMContentLoaded block
d = d.replace(/loadBotState\(\);\s+}\s+}\);\s+$/, match => initHook + '\n});');

// Hook processVirtualBot() into the renderSignals function so it acts when we scan market
d = d.replace(/updateBadges\(\);\s+}\s+async function manualScan\(\)/, match => 'processVirtualBot();\n  ' + match);

// Hook updateBotUI into updateLiveUI so asset balance and positions values tick live
d = d.replace(/window\.updateLiveUI = function\(\) {/, match => match + '\n  if(typeof updateBotUI === "function") updateBotUI();');

fs.writeFileSync(p, d);
console.log('Successfully injected Bot & Backtester logic');
