const fs = require('fs');
const p = 'web/app.js';
let d = fs.readFileSync(p, 'utf8');

d = d.replace(/\r\n/g, '\n');

// 1. Target the dead nested sigCardHTML inside connectLiveWS
// We look for:
//   function connectLiveWS(){
//     if(typeof WebSocket==='undefined')return;
//     const streams=buildWsStreams();
//     if(!streams.length)return;
//     function sigCardHTML(s){ ... }
const deadNestedTarget = `function connectLiveWS(){
  if(typeof WebSocket==='undefined')return; // môi trường không hỗ trợ WS (hiếm)
  const streams=buildWsStreams();
  if(!streams.length)return;
  function sigCardHTML(s){
  let cls=s.signal.includes('BUY')?'buy-card':s.signal.includes('SELL')?'sell-card':'';
  const src = s.source === 'Binance' ? '💎 Binance' : '🤖 API';
  let checks='';
  if(s.checks&&s.checks.length){
    checks=s.checks.slice(0,6).map(c=>\`<span class="sig-check \${c.good?'good':c.neutral?'neutral':'bad'}">\${c.good?'✓':c.neutral?'~':'✗'} \${c.label}</span>\`).join('');
  }
  return\`<div class="sig-card \${cls}" onclick="openCoinModal('\${s.id}')">
    <div class="sig-top">
      <img class="sig-img" src="\${s.image}" alt="">
      <div class="sig-name"><div class="sym">\${s.symbol} <small style="color:var(--t4);font-weight:400">#\${s.rank||''}</small></div><div class="name">\${src} • \${s.confidence}%</div></div>
      <span class="sig-badge \${s.signal}">\${F.sig(s.signal)}</span>
    </div>
    \${checks?'<div class="sig-checks">'+checks+'</div>':''}
    <ul class="sig-reasons">\${s.reasons.slice(0,2).map(r=>'<li>'+simplifyReason(r)+'</li>').join('')}</ul>
    <div class="sig-entry">
      <div><div class="label">Mua</div><div class="val">\${F.usd(s.entry)}</div></div>
      <div><div class="label">Cắt lỗ</div><div class="val r">\${F.usd(s.sl)}</div></div>
      <div><div class="label">\${s.tp2?'Mục tiêu 1':'Chốt lời'}</div><div class="val g">\${F.usd(s.tp)}</div>\${s.tp2?\`<div class="val2">T2: \${F.usd(s.tp2)}</div>\`:''}</div>
    </div>
  </div>\`;
}
  try{`;

const deadNestedReplacement = `function connectLiveWS(){
  if(typeof WebSocket==='undefined')return; // môi trường không hỗ trợ WS (hiếm)
  const streams=buildWsStreams();
  if(!streams.length)return;
  try{`;

if (d.includes(deadNestedTarget)) {
  d = d.replace(deadNestedTarget, () => deadNestedReplacement);
  console.log('Successfully removed dead nested sigCardHTML');
} else {
  // Let's try matching with single quotes or slightly different structure
  console.log('Error: dead nested target not found!');
}

fs.writeFileSync(p, d, 'utf8');
