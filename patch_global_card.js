const fs = require('fs');
const p = 'web/app.js';
let d = fs.readFileSync(p, 'utf8');

d = d.replace(/\r\n/g, '\n');

const globalCardEndTarget = `    <div class="sig-entry">
      <div><div class="label">Giá Live</div><div class="val" style="color:var(--yellow)">\${F.usd(liveP)}</div></div>
      <div><div class="label">Vào lệnh</div><div class="val">\${F.usd(s.entry)}</div></div>
      <div><div class="label">Cắt lỗ</div><div class="val r">\${F.usd(s.sl)}</div></div>
      <div><div class="label">\${s.tp2?'Mục tiêu 1':'Chốt lời'}</div><div class="val g">\${F.usd(s.tp)}</div>\${s.tp2?\`<div class="val2">T2: \${F.usd(s.tp2)}</div>\`:''}</div>
    </div>
  </div>\`;`;

const globalCardEndReplacement = `    <div class="sig-entry">
      <div><div class="label">Giá Live</div><div class="val" style="color:var(--yellow)">\${F.usd(liveP)}</div></div>
      <div><div class="label">Vào lệnh</div><div class="val">\${F.usd(s.entry)}</div></div>
      <div><div class="label">Cắt lỗ</div><div class="val r">\${F.usd(s.sl)}</div></div>
      <div><div class="label">\${s.tp2?'Mục tiêu 1':'Chốt lời'}</div><div class="val g">\${F.usd(s.tp)}</div>\${s.tp2?\`<div class="val2">T2: \${F.usd(s.tp2)}</div>\`:''}</div>
    </div>
    <div style="margin-top:10px; border-top:1px solid var(--border); padding-top:8px; display:flex; justify-content:space-between; align-items:center;">
      <button class="btn btn-yellow btn-sm" style="padding: 4px 8px; font-size:10px; font-weight:bold;" onclick="event.stopPropagation(); window.buyVirtualMarket('\${s.symbol}', \${liveP})">🛒 Mua ảo</button>
      <span style="font-size:10px; color:var(--t4)">R/R: \${s.rr}</span>
    </div>
  </div>\`;`;

if (d.includes(globalCardEndTarget)) {
  d = d.replace(globalCardEndTarget, () => globalCardEndReplacement);
  console.log('Successfully patched global card with buy button');
} else {
  console.log('Error: Global card end target not found!');
}

fs.writeFileSync(p, d, 'utf8');
