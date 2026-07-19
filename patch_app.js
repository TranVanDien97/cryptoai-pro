const fs = require('fs');
const p = 'web/app.js';
let d = fs.readFileSync(p, 'utf8');

d = d.replace(/if\(rp\)rp\.innerHTML=F\.usd\(price\)\+' USD';\s+}\s+}/, match => match + '\n        if(!window.liveUIThrottle){window.liveUIThrottle=setTimeout(()=>{if(typeof window.updateLiveUI==="function")window.updateLiveUI();window.liveUIThrottle=null;},1000);}');

const fn = `
window.updateLiveUI = function() {
  document.querySelectorAll('.live-price').forEach(el => {
    const sym = el.getAttribute('data-live-sym');
    const lp = livePrices[sym+'USDT']?.p || S.tickerMap[sym+'USDT'];
    if(lp) el.innerHTML = F.usd(lp) + (el.innerHTML.includes('USD') ? ' USD' : '');
  });
  
  let totalUSD = 0;
  document.querySelectorAll('.live-val').forEach(el => {
    const sym = el.getAttribute('data-live-sym');
    const qty = parseFloat(el.getAttribute('data-live-qty')||0);
    const lp = livePrices[sym+'USDT']?.p || S.tickerMap[sym+'USDT'];
    if(lp) {
      const val = lp * qty;
      el.innerHTML = F.usd(val) + (el.innerHTML.includes('USD') ? ' USD' : '');
      totalUSD += val;
    }
  });

  document.querySelectorAll('.live-pnl').forEach(el => {
    const sym = el.getAttribute('data-live-sym');
    const cost = parseFloat(el.getAttribute('data-live-cost')||0);
    const lp = livePrices[sym+'USDT']?.p || S.tickerMap[sym+'USDT'];
    if(lp && cost > 0) {
      const pnlPct = ((lp - cost)/cost)*100;
      if(el.classList.contains('mca-pnl')) {
        el.className = 'mca-pnl live-pnl ' + (pnlPct>=0?'gain':'loss');
        el.innerHTML = (pnlPct>=0?'+':'') + pnlPct.toFixed(1) + '%';
      } else {
        const qtyStr = el.closest('.asset-card')?.querySelector('.live-qty')?.getAttribute('data-live-qty');
        if(qtyStr) {
          const qty = parseFloat(qtyStr);
          const val = lp * qty;
          const pnl = val - (cost * qty);
          el.className = 'ac-pnl live-pnl ' + F.cc(pnl);
          el.innerHTML = (pnl>=0?'+':'') + F.usd(Math.abs(pnl)) + ' USD (' + F.pct(pnlPct) + ')';
        }
      }
    }
  });
  
  // Update total portfolio values
  const tvNode = document.getElementById('pTotal');
  if(tvNode && totalUSD > 0) {
    const h = S.holdings;
    let tc = 0;
    h.forEach(hh=>tc+=(hh.cost*hh.qty));
    const tp = totalUSD - tc;
    const tpp = tc > 0 ? (tp/tc)*100 : 0;
    
    tvNode.innerHTML = totalUSD.toFixed(8) + ' <span class="bp-currency">USDT</span><i class="bp-dropdown"></i>';
    document.getElementById('pTotalFiat').textContent = '≈ ' + F.usd(totalUSD) + ' USD';
    document.getElementById('pPnl').innerHTML = 'Tổng PNL thả nổi <span class="'+(tp>=0?'gain':'loss')+'">'+(tp>=0?'+ ':'') + F.usd(Math.abs(tp)) + ' USD (' + F.pct(tpp) + ')</span>';
  }
};
`;

if (!d.includes('window.updateLiveUI')) {
  d += fn;
}

fs.writeFileSync(p, d);
console.log('Done patching app.js');
