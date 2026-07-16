/**
 * CryptoAI v5.0 — AI Trading Assistant + Binance + PWA Android
 * Core: AlertEngine, AIScanner, PortfolioManager, BinanceAPI, Gemini AI
 */
// Backend URL — auto-detect: same origin on cloud (Render/Glitch), :8001 on local
let BACKEND=localStorage.getItem('cai4_backend')||(location.port==='8001'||location.hostname.includes('render')||location.hostname.includes('onrender')||location.hostname.includes('glitch')?location.origin:'http://'+location.hostname+':8001');
const CG='https://api.coingecko.com/api/v3';
const FNG_URL='https://api.alternative.me/fng/?limit=1';

// Register PWA Service Worker
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}
const USD_VND=25450;
const COLORS=['#3B82F6','#8B5CF6','#F59E0B','#10B981','#EF4444','#EC4899','#06B6D4','#F97316','#14B8A6','#A855F7'];
const $=id=>document.getElementById(id);
const $$=s=>document.querySelectorAll(s);

// Simplify verbose reasons to short Vietnamese
function simplifyReason(r){
  if(!r)return'';
  return r.replace(/Relative Strength Index/gi,'RSI')
    .replace(/Moving Average Convergence Divergence/gi,'MACD')
    .replace(/Bollinger Band/gi,'BB')
    .replace(/Exponential Moving Average/gi,'EMA')
    .replace(/Simple Moving Average/gi,'SMA')
    .replace(/percentage/gi,'%')
    .replace(/bullish/gi,'tăng').replace(/bearish/gi,'giảm')
    .replace(/overbought/gi,'quá mua').replace(/oversold/gi,'quá bán')
    .slice(0,120);
}

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
const S={
  tab:'portfolio',crypto:[],signals:[],alerts:[],holdings:[],
  favs:[],fng:null,cglobal:null,trending:[],
  mktSearch:'',sigFilter:'ALL',
  cgOn:false,backendOn:false,binanceOn:false,scanTimer:null,
  binance:{balances:[],orders:[],trades:[],canTrade:false,totalUSDT:0},
  tickerMap:{},
  customPriceAlerts:[],trailHighs:{},
  settings:{sound:true,autoScan:true,highConf:true,volatility:true,fngAlert:true,stoploss:true,takeprofit:true,trailingSL:true,trailPct:5}
};

// ═══════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════
const F={
  usd:n=>{if(n==null||isNaN(n))return'--';return n>=1?'$'+n.toLocaleString('en-US',{maximumFractionDigits:2}):'$'+n.toLocaleString('en-US',{maximumFractionDigits:6})},
  vnd:n=>{if(n==null||isNaN(n))return'--';return n.toLocaleString('vi-VN',{maximumFractionDigits:0})+' ₫'},
  pct:n=>{if(n==null||isNaN(n))return'--';return(n>=0?'+':'')+n.toFixed(2)+'%'},
  mcap:n=>{if(n==null)return'--';if(n>=1e12)return'$'+(n/1e12).toFixed(2)+'T';if(n>=1e9)return'$'+(n/1e9).toFixed(1)+'B';if(n>=1e6)return'$'+(n/1e6).toFixed(1)+'M';return'$'+n.toLocaleString()},
  cc:n=>n>=0?'gain':'loss',
  time:()=>new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
  date:()=>new Date().toLocaleDateString('vi-VN',{weekday:'short',day:'numeric',month:'numeric',year:'numeric'}),
  ago:t=>{const d=Date.now()-t;if(d<60000)return'Vừa xong';if(d<3600000)return Math.floor(d/60000)+'p trước';if(d<86400000)return Math.floor(d/3600000)+'h trước';return Math.floor(d/86400000)+'d trước'},
  sig:s=>({STRONG_BUY:'MUA MẠNH',BUY:'MUA',HOLD:'GIỮ',SELL:'BÁN',STRONG_SELL:'BÁN MẠNH'}[s]||s),
  dt:t=>new Date(t).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}),
  num:n=>{if(n==null||isNaN(n))return'--';if(n>=1)return n.toLocaleString('en-US',{maximumFractionDigits:4});return n.toLocaleString('en-US',{maximumFractionDigits:8})},
};

// ═══════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════
async function fetchJ(url){try{const r=await fetch(url);if(!r.ok)throw Error(r.status);return await r.json()}catch{return null}}
async function postJ(url,body){try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return await r.json()}catch{return null}}
async function delJ(url){try{const r=await fetch(url,{method:'DELETE'});return await r.json()}catch{return null}}
function toast(msg,type='info'){const c=$('toasts');const t=document.createElement('div');t.className='toast '+type;t.textContent=msg;c.appendChild(t);setTimeout(()=>t.remove(),4000)}
function playSound(type){if(!S.settings.sound)return;try{const a=new AudioContext();const o=a.createOscillator();const g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=type==='buy'?800:type==='sell'?400:600;o.type='sine';g.gain.value=0.15;o.start();o.stop(a.currentTime+0.15);if(type==='buy'){setTimeout(()=>{const o2=a.createOscillator();const g2=a.createGain();o2.connect(g2);g2.connect(a.destination);o2.frequency.value=1000;o2.type='sine';g2.gain.value=0.15;o2.start();o2.stop(a.currentTime+0.15)},180)}}catch{}}

// ═══════════════════════════════════════════════════════
// TECHNICAL INDICATORS
// ═══════════════════════════════════════════════════════
function calcEMA(data,period){
  if(!data||data.length<period)return[];
  const k=2/(period+1);
  const ema=[data.slice(0,period).reduce((a,b)=>a+b,0)/period];
  for(let i=period;i<data.length;i++)ema.push(data[i]*k+ema[ema.length-1]*(1-k));
  return ema;
}
function calcRSI(data,period=14){
  if(!data||data.length<period+1)return null;
  let gains=0,losses=0;
  for(let i=1;i<=period;i++){const d=data[i]-data[i-1];if(d>=0)gains+=d;else losses-=d}
  let avgG=gains/period,avgL=losses/period;
  for(let i=period+1;i<data.length;i++){const d=data[i]-data[i-1];avgG=(avgG*(period-1)+(d>0?d:0))/period;avgL=(avgL*(period-1)+(d<0?-d:0))/period}
  if(avgL===0)return 100;
  return 100-(100/(1+avgG/avgL));
}
function calcMACD(data,fast=12,slow=26,sig=9){
  if(!data||data.length<slow+sig)return null;
  const emaF=calcEMA(data,fast),emaS=calcEMA(data,slow),off=slow-fast,ml=[];
  for(let i=0;i<emaS.length;i++)ml.push(emaF[i+off]-emaS[i]);
  if(ml.length<sig)return null;
  const sl=calcEMA(ml,sig);
  const lm=ml[ml.length-1],ls=sl[sl.length-1],pm=ml[ml.length-2],ps=sl.length>=2?sl[sl.length-2]:ls;
  return{macd:lm,signal:ls,histogram:lm-ls,crossUp:pm<=ps&&lm>ls,crossDown:pm>=ps&&lm<ls};
}
function calcBollinger(data,period=20,mult=2){
  if(!data||data.length<period)return null;
  const r=data.slice(-period),sma=r.reduce((a,b)=>a+b,0)/period;
  const std=Math.sqrt(r.reduce((a,b)=>a+Math.pow(b-sma,2),0)/period);
  const upper=sma+mult*std,lower=sma-mult*std,cur=data[data.length-1];
  return{upper,lower,sma,std,pctB:(cur-lower)/(upper-lower||1)};
}

// ═══════════════════════════════════════════════════════
// LOCALSTORAGE
// ═══════════════════════════════════════════════════════
function loadLS(){
  try{
    S.holdings=JSON.parse(localStorage.getItem('cai4_h')||'[]');
    // DON'T modify symbols — they may be CoinGecko IDs like 'bitcoin'
  }catch{S.holdings=[]}
  try{S.alerts=JSON.parse(localStorage.getItem('cai4_a')||'[]')}catch{S.alerts=[]}
  try{S.favs=JSON.parse(localStorage.getItem('cai4_f')||'[]')}catch{S.favs=[]}
  try{S.settings={...S.settings,...JSON.parse(localStorage.getItem('cai4_s')||'{}')}}catch{}
  try{S.customPriceAlerts=JSON.parse(localStorage.getItem('cai4_pa')||'[]')}catch{S.customPriceAlerts=[]}
  try{S.trailHighs=JSON.parse(localStorage.getItem('cai4_th')||'{}')}catch{S.trailHighs={}}
}
function saveH(){localStorage.setItem('cai4_h',JSON.stringify(S.holdings))}
function saveA(){localStorage.setItem('cai4_a',JSON.stringify(S.alerts.slice(0,100)))}
function savePA(){localStorage.setItem('cai4_pa',JSON.stringify(S.customPriceAlerts))}
function saveTH(){localStorage.setItem('cai4_th',JSON.stringify(S.trailHighs))}
function saveF(){localStorage.setItem('cai4_f',JSON.stringify(S.favs))}
function saveS(){localStorage.setItem('cai4_s',JSON.stringify(S.settings))}

// ═══════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════
let notifGranted=false;
function initNotif(){
  if('Notification' in window){notifGranted=Notification.permission==='granted';updateNotifUI()}
}
function requestNotif(){
  if(!('Notification' in window)){toast('Trình duyệt không hỗ trợ thông báo','error');return}
  Notification.requestPermission().then(p=>{notifGranted=p==='granted';updateNotifUI();if(notifGranted)toast('✅ Đã bật thông báo!','success');else toast('❌ Bạn đã từ chối thông báo','error')});
}
function updateNotifUI(){
  const b=$('btnNotif');const d=$('notifDot');
  if(notifGranted){b.textContent='🔔 Đã bật';b.classList.add('granted');if(d)d.className='status-dot on'}
  else{b.textContent='🔔 Bật thông báo';b.classList.remove('granted');if(d)d.className='status-dot off'}
}
function sendNotif(title,body){
  if(!notifGranted)return;
  try{new Notification(title,{body,icon:'/favicon.ico',tag:Date.now().toString()})}catch{}
}

// ═══════════════════════════════════════════════════════
// ALERT ENGINE
// ═══════════════════════════════════════════════════════
function addAlert(type,icon,title,desc){
  const alert={id:Date.now(),type,icon,title,desc,time:Date.now()};
  S.alerts.unshift(alert);saveA();
  sendNotif(title,desc);
  playSound(type==='buy'?'buy':type==='sell'?'sell':'alert');
  toast(icon+' '+title,type==='buy'?'success':type==='sell'?'error':'warn');
  updateBadges();
}

function checkStopLossTP(){
  if(!S.settings.stoploss&&!S.settings.takeprofit)return;
  S.holdings.forEach(h=>{
    const cp=getCurPrice(h);
    if(!cp||cp===h.cost||!h.cost)return; // skip if no live price
    const pnlPct=((cp-h.cost)/h.cost)*100;
    if(Date.now()-(h._lastAlert||0)<300000)return;
    if(S.settings.stoploss&&h.sl&&pnlPct<=-h.sl){
      addAlert('sell','⚠️',`STOP-LOSS: ${h.name}`,`Đã giảm ${pnlPct.toFixed(1)}% từ giá mua — vượt ngưỡng cắt lỗ ${h.sl}%. Cân nhắc BÁN ngay!`);
      h._lastAlert=Date.now();saveH();
    }
    if(S.settings.takeprofit&&h.tp&&pnlPct>=h.tp){
      addAlert('buy','🎯',`TAKE-PROFIT: ${h.name}`,`Đã tăng +${pnlPct.toFixed(1)}% từ giá mua — đạt mục tiêu ${h.tp}%. Cân nhắc CHỐT LỜI!`);
      h._lastAlert=Date.now();saveH();
    }
  });
}

// Trailing Stop-Loss
function checkTrailingSL(){
  if(!S.settings.trailingSL)return;
  S.holdings.forEach(h=>{
    const cp=getCurPrice(h);
    if(!cp||cp===h.cost)return; // skip if no live price
    const key=h.id;
    const prev=S.trailHighs[key]||cp;
    if(cp>prev){S.trailHighs[key]=cp;saveTH();return}
    S.trailHighs[key]=Math.max(prev,cp);
    const high=S.trailHighs[key];
    const dropPct=((high-cp)/high)*100;
    const trailPct=S.settings.trailPct||5;
    if(dropPct>=trailPct&&cp>h.cost){
      if(Date.now()-(h._lastTrailAlert||0)<600000)return;
      const profit=((cp-h.cost)/h.cost*100).toFixed(1);
      addAlert('sell','📉',`TRAILING SL: ${h.name}`,`Giảm ${dropPct.toFixed(1)}% từ đỉnh ${F.usd(high)}. Giá hiện tại ${F.usd(cp)} (lãi +${profit}%). Chốt lời để bảo vệ lợi nhuận!`);
      h._lastTrailAlert=Date.now();saveH();
    }
  });
}

// Custom Price Alerts
function checkCustomPriceAlerts(){
  const priceMap={};
  S.crypto.forEach(c=>{priceMap[c.id]=c.current_price;priceMap[c.symbol.toLowerCase()]=c.current_price;priceMap[c.name.toLowerCase()]=c.current_price});
  S.customPriceAlerts.forEach(pa=>{
    if(pa.triggered)return;
    const cp=priceMap[pa.coinId]||priceMap[pa.coinId.toLowerCase()];
    if(!cp)return;
    let hit=false;
    if(pa.direction==='above'&&cp>=pa.price)hit=true;
    if(pa.direction==='below'&&cp<=pa.price)hit=true;
    if(hit){
      pa.triggered=true;savePA();
      const dir=pa.direction==='above'?'vượt lên':'giảm xuống';
      addAlert(pa.direction==='above'?'buy':'sell','🔔',`GIÁ ${pa.coinId.toUpperCase()} ${dir} ${F.usd(pa.price)}`,`${pa.coinId.toUpperCase()} hiện tại ${F.usd(cp)} — đã ${dir} mức ${F.usd(pa.price)} bạn đặt.`);
    }
  });
}

function checkVolatility(){
  if(!S.settings.volatility)return;
  S.crypto.forEach(c=>{
    const ch=Math.abs(c.price_change_percentage_24h||0);
    if(ch>8){
      if(S.alerts.find(a=>a.title.includes(c.symbol.toUpperCase())&&F.ago(a.time).includes('Vừa')))return;
      const dir=c.price_change_percentage_24h>0?'tăng':'giảm';
      addAlert(dir==='tăng'?'buy':'sell','📊',`${c.symbol.toUpperCase()} ${dir} mạnh`,`${c.name} ${dir} ${ch.toFixed(1)}% trong 24h. Giá: ${F.usd(c.current_price)}`);
    }
  });
}

function checkFNG(){
  if(!S.settings.fngAlert||!S.fng)return;
  const v=parseInt(S.fng.value);
  const lastFng=S.alerts.find(a=>a.title.includes('Fear & Greed'));
  if(lastFng&&Date.now()-lastFng.time<3600000)return;
  if(v<=20){addAlert('buy','😰','Fear & Greed = '+v+' (Extreme Fear)','Thị trường cực kỳ sợ hãi — lịch sử cho thấy đây thường là vùng MUA tốt cho BTC/ETH. Cân nhắc DCA.')}
  else if(v>=80){addAlert('sell','🤑','Fear & Greed = '+v+' (Extreme Greed)','Thị trường tham lam — cẩn thận bẫy giá. Cân nhắc chốt lời một phần.')}
}

// Risk Management Calculator
function calcPositionSize(capital,riskPct,entryPrice,slPrice){
  if(!capital||!riskPct||!entryPrice||!slPrice)return null;
  const riskAmount=capital*(riskPct/100);
  const slDist=Math.abs(entryPrice-slPrice);
  if(slDist<=0)return null;
  const qty=riskAmount/slDist;
  const positionValue=qty*entryPrice;
  return{qty:Math.round(qty*100000)/100000,riskAmount,positionValue,positionPct:(positionValue/capital*100).toFixed(1),slDistPct:((slDist/entryPrice)*100).toFixed(2)};
}

// ═══════════════════════════════════════════════════════
// AI SCANNER PRO — Multi-timeframe Real Data Analysis
// ═══════════════════════════════════════════════════════

// Analyze a single timeframe's candle data
function analyzeTF(candles){
  if(!candles||candles.length<30)return null;
  const closes=candles.map(c=>c.c);
  const volumes=candles.map(c=>c.v);
  const highs=candles.map(c=>c.h);
  const lows=candles.map(c=>c.l);

  const rsi=calcRSI(closes,14);
  const macd=calcMACD(closes,12,26,9);
  const bb=calcBollinger(closes,20,2);
  const ema12=calcEMA(closes,12);
  const ema26=calcEMA(closes,26);

  // Volume trend: avg of last 5 vs avg of prev 20
  const recentVol=volumes.slice(-5).reduce((a,b)=>a+b,0)/5;
  const avgVol=volumes.slice(-25,-5).reduce((a,b)=>a+b,0)/20;
  const volRatio=avgVol>0?recentVol/avgVol:1;

  // Price position in range
  const last20H=Math.max(...highs.slice(-20));
  const last20L=Math.min(...lows.slice(-20));
  const pricePos=(closes[closes.length-1]-last20L)/(last20H-last20L||1);

  // Trend: price vs EMA
  const curPrice=closes[closes.length-1];
  const emaUp=ema12.length>=2&&ema26.length>=2?ema12[ema12.length-1]>ema26[ema26.length-1]:null;
  const emaCrossUp=ema12.length>=2&&ema26.length>=2?ema12[ema12.length-2]<=ema26[ema26.length-2]&&ema12[ema12.length-1]>ema26[ema26.length-1]:false;
  const emaCrossDown=ema12.length>=2&&ema26.length>=2?ema12[ema12.length-2]>=ema26[ema26.length-2]&&ema12[ema12.length-1]<ema26[ema26.length-1]:false;

  // Support/Resistance from recent pivots
  const pivotHighs=[],pivotLows=[];
  for(let i=2;i<candles.length-2;i++){
    if(highs[i]>highs[i-1]&&highs[i]>highs[i-2]&&highs[i]>highs[i+1]&&highs[i]>highs[i+2])pivotHighs.push(highs[i]);
    if(lows[i]<lows[i-1]&&lows[i]<lows[i-2]&&lows[i]<lows[i+1]&&lows[i]<lows[i+2])pivotLows.push(lows[i]);
  }
  const nearSupport=pivotLows.length?Math.max(...pivotLows.filter(l=>l<curPrice).slice(-3)):null;
  const nearResist=pivotHighs.length?Math.min(...pivotHighs.filter(h=>h>curPrice).slice(-3)):null;

  return{rsi,macd,bb,emaUp,emaCrossUp,emaCrossDown,volRatio,pricePos,nearSupport,nearResist,curPrice};
}

// Score a single timeframe
function scoreTF(tf,weight=1){
  if(!tf)return{score:0,reasons:[],checks:[]};
  let score=0;const reasons=[];const checks=[];

  // RSI
  if(tf.rsi!==null){
    if(tf.rsi<=25){score+=20;reasons.push('Giá đang RẤT RẺ (bị bán quá mức)');checks.push({label:'Giá rẻ',good:true})}
    else if(tf.rsi<=35){score+=10;reasons.push('Giá đang khá rẻ');checks.push({label:'Giá hợp lý',good:true})}
    else if(tf.rsi>=75){score-=20;reasons.push('Giá đang RẤT ĐẮT (bị mua quá mức)');checks.push({label:'Giá đắt',good:false})}
    else if(tf.rsi>=65){score-=8;reasons.push('Giá đang cao');checks.push({label:'Giá cao',good:false})}
    else checks.push({label:'Giá bình thường',neutral:true});
  }

  // MACD
  if(tf.macd){
    if(tf.macd.crossUp){score+=18;reasons.push('Xu hướng vừa CHUYỂN SANG TĂNG');checks.push({label:'Xu hướng tăng ↑',good:true})}
    else if(tf.macd.crossDown){score-=18;reasons.push('Xu hướng vừa CHUYỂN SANG GIẢM');checks.push({label:'Xu hướng giảm ↓',good:false})}
    else if(tf.macd.histogram>0){score+=5;checks.push({label:'Đang tăng',good:true})}
    else{score-=5;checks.push({label:'Đang giảm',good:false})}
  }

  // Bollinger Bands
  if(tf.bb){
    if(tf.bb.pctB<=0.05){score+=15;reasons.push('Giá chạm mức thấp bất thường — rất có thể bật tăng')}
    else if(tf.bb.pctB>=0.95){score-=12;reasons.push('Giá chạm mức cao bất thường — coi chừng giảm')}
  }

  // EMA Cross
  if(tf.emaCrossUp){score+=15;reasons.push('Tín hiệu "Golden Cross" — xu hướng tăng mạnh');checks.push({label:'Golden Cross ✨',good:true})}
  else if(tf.emaCrossDown){score-=15;reasons.push('Tín hiệu "Death Cross" — xu hướng giảm mạnh');checks.push({label:'Death Cross 💀',good:false})}

  // Volume confirmation
  if(tf.volRatio>1.5&&score>0){score+=8;reasons.push('Khối lượng giao dịch tăng mạnh — xác nhận xu hướng');checks.push({label:'Volume cao',good:true})}
  else if(tf.volRatio>1.5&&score<0){score-=5;reasons.push('Khối lượng bán tăng — áp lực bán mạnh')}
  else if(tf.volRatio<0.5){reasons.push('Khối lượng thấp — tín hiệu yếu');checks.push({label:'Volume thấp',neutral:true})}

  // Support/Resistance
  if(tf.nearSupport&&tf.curPrice){
    const distSup=((tf.curPrice-tf.nearSupport)/tf.curPrice)*100;
    if(distSup<2){score+=8;reasons.push('Giá đang ở gần vùng hỗ trợ — có thể bật tăng')}
  }

  return{score:Math.round(score*weight),reasons,checks};
}

// Main scanner — uses real Binance data
async function aiScanPro(){
  S.signals=[];
  if(!S.crypto.length)return;
  const fngVal=S.fng?parseInt(S.fng.value):50;
  const grid=$('signalGrid');

  // Only scan top 10 for speed (3 API calls each = 30 total)
  const topCoins=S.crypto.slice(0,10);
  let done=0;

  // Show progress
  const showProgress=()=>{
    if(grid)grid.innerHTML=`<div class="scan-progress">
      <div class="scan-bar"><div class="scan-fill" style="width:${(done/topCoins.length)*100}%"></div></div>
      <div class="scan-text">🔍 Đang phân tích ${done}/${topCoins.length} coin... (dữ liệu nến thật Binance)</div>
    </div>${S.signals.slice(0,3).map(s=>sigCardHTML(s)).join('')}`;
  };
  showProgress();

  // Fetch with timeout
  const fetchWithTimeout=async(url,ms=8000)=>{
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),ms);
    try{const r=await fetch(url,{signal:ctrl.signal});clearTimeout(timer);return await r.json()}
    catch{clearTimeout(timer);return null}
  };

  // Process coins one by one (show results immediately)
  for(const c of topCoins){
    const sym=c.symbol.toUpperCase()+'USDT';
    try{
      const j=await fetchWithTimeout(BACKEND+'/api/market/analyze?symbol='+sym,8000);
      done++;
      if(!j||!j.success){showProgress();continue}

      const tf1h=analyzeTF(j.data['1h']);
      const tf4h=analyzeTF(j.data['4h']);
      const tf1d=analyzeTF(j.data['1d']);

      const s1h=scoreTF(tf1h,0.25);
      const s4h=scoreTF(tf4h,0.35);
      const s1d=scoreTF(tf1d,0.40);
      let score=s1h.score+s4h.score+s1d.score;
      let reasons=[...new Set([...s1d.reasons,...s4h.reasons,...s1h.reasons])].slice(0,5);
      let checks=[...s1d.checks,...s4h.checks,...s1h.checks];

      if(fngVal<=25){score+=10;reasons.unshift('Thị trường đang sợ hãi — cơ hội mua')}
      else if(fngVal>=75){score-=10;reasons.unshift('Thị trường tham lam — cẩn thận')}

      const allBull=s1h.score>0&&s4h.score>0&&s1d.score>0;
      const allBear=s1h.score<0&&s4h.score<0&&s1d.score<0;
      if(allBull){score+=10;reasons.push('⭐ 3/3 khung thời gian đều TĂNG — tín hiệu mạnh!')}
      if(allBear){score-=10;reasons.push('⚠️ 3/3 khung thời gian đều GIẢM — nên tránh!')}

      if(reasons.length<2){showProgress();continue}

      let signal,conf;
      if(score>=25){signal='STRONG_BUY';conf=Math.min(95,70+Math.round(score*0.5))}
      else if(score>=12){signal='BUY';conf=Math.min(88,60+Math.round(score*0.6))}
      else if(score>=-10){signal='HOLD';conf=50}
      else if(score>=-25){signal='SELL';conf=Math.min(85,60+Math.round(Math.abs(score)*0.5))}
      else{signal='STRONG_SELL';conf=Math.min(93,65+Math.round(Math.abs(score)*0.4))}

      if(signal==='HOLD'){showProgress();continue}
      if(S.settings.highConf&&conf<70){showProgress();continue}

      const entry=c.current_price;
      const atrPct=tf4h&&tf4h.bb?((tf4h.bb.upper-tf4h.bb.lower)/tf4h.bb.sma)*100:7;
      const slPct=Math.max(3,Math.min(10,atrPct*0.7));
      const tpPct=Math.max(slPct*2,Math.min(30,atrPct*2));
      const sl=signal.includes('BUY')?entry*(1-slPct/100):entry*(1+slPct/100);
      const tp=signal.includes('BUY')?entry*(1+tpPct/100):entry*(1-tpPct/100);
      const rr=Math.abs(tp-entry)/Math.abs(entry-sl);

      const indicators={};
      if(tf4h){
        indicators.rsi=tf4h.rsi!==null?Math.round(tf4h.rsi):null;
        indicators.macd=tf4h.macd?tf4h.macd.histogram>0?'BULL':'BEAR':null;
        indicators.bbPctB=tf4h.bb?Math.round(tf4h.bb.pctB*100):null;
        indicators.emaUp=tf4h.emaUp;
      }

      const tfScores={
        '1h':{score:s1h.score,dir:s1h.score>3?'↑':s1h.score<-3?'↓':'→'},
        '4h':{score:s4h.score,dir:s4h.score>3?'↑':s4h.score<-3?'↓':'→'},
        '1d':{score:s1d.score,dir:s1d.score>3?'↑':s1d.score<-3?'↓':'→'}
      };

      S.signals.push({
        id:c.id,name:c.name,symbol:c.symbol.toUpperCase(),image:c.image,
        signal,confidence:Math.round(conf),score,indicators,
        reasons,checks:checks.slice(0,6),tfScores,
        entry,sl:Math.round(sl*100)/100,tp:Math.round(tp*100)/100,rr:rr.toFixed(1),
        slPct:slPct.toFixed(1),tpPct:tpPct.toFixed(1),
        c24:c.price_change_percentage_24h||0,
        c7d:c.price_change_percentage_7d_in_currency||0,
        mcap:c.market_cap,rank:c.market_cap_rank,
        dataSource:'binance',time:Date.now()
      });
      showProgress(); // Update UI immediately
    }catch{done++;showProgress()}
  }

  // Fallback: scan remaining coins with CoinGecko sparkline (fast, no API call)
  const scannedIds=new Set(S.signals.map(s=>s.id));
  S.crypto.filter(c=>!scannedIds.has(c.id)).forEach(c=>{
    const sparkData=c.sparkline_in_7d?.price||[];
    if(sparkData.length<30)return;
    const tf=analyzeTF(sparkData.map((p,i)=>({c:p,h:p*1.001,l:p*0.999,o:sparkData[i>0?i-1:0],v:1})));
    if(!tf)return;
    const s=scoreTF(tf,1);
    if(s.reasons.length<2||Math.abs(s.score)<12)return;
    const signal=s.score>=20?'STRONG_BUY':s.score>=10?'BUY':s.score<=-20?'STRONG_SELL':s.score<=-10?'SELL':'HOLD';
    if(signal==='HOLD')return;
    const conf=Math.min(75,55+Math.abs(s.score));
    if(S.settings.highConf&&conf<70)return;
    const entry=c.current_price;
    const sl=signal.includes('BUY')?entry*0.93:entry*1.07;
    const tp=signal.includes('BUY')?entry*1.20:entry*0.85;
    S.signals.push({
      id:c.id,name:c.name,symbol:c.symbol.toUpperCase(),image:c.image,
      signal,confidence:Math.round(conf),score:s.score,indicators:{},
      reasons:s.reasons.slice(0,3),checks:s.checks.slice(0,4),tfScores:null,
      entry,sl,tp,rr:((Math.abs(tp-entry)/Math.abs(entry-sl))).toFixed(1),
      slPct:'7.0',tpPct:'20.0',
      c24:c.price_change_percentage_24h||0,c7d:c.price_change_percentage_7d_in_currency||0,
      mcap:c.market_cap,rank:c.market_cap_rank,
      dataSource:'coingecko',time:Date.now()
    });
  });

  S.signals.sort((a,b)=>b.confidence-a.confidence);
  updateBadges();
}

// ═══════════════════════════════════════════════════════
// GEMINI AI INTEGRATION
// ═══════════════════════════════════════════════════════
let geminiConnected=false;

async function connectGemini(){
  const key=$('geminiApiKey')?.value?.trim();
  if(!key){toast('Nhập Gemini API Key','error');return}
  try{
    const r=await fetch(BACKEND+'/api/ai/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:key})});
    const j=await r.json();
    if(j.success){geminiConnected=true;toast('✅ Đã kết nối Gemini AI','success');updateGeminiStatus()}
    else toast(j.error||'Lỗi kết nối','error');
  }catch{toast('Backend không chạy','error')}
}

function updateGeminiStatus(){
  const dot=$('sGeminiDot');if(dot)dot.className='status-dot '+(geminiConnected?'on':'');
  const badge=$('geminiStatus');
  if(badge){badge.textContent=geminiConnected?'✅ Đã kết nối':'Chưa kết nối';badge.style.color=geminiConnected?'var(--green2)':'var(--t3)'}
}

async function askGeminiAI(){
  const resultEl=$('geminiResult');const btn=$('btnAskAI');
  if(!geminiConnected){toast('Vào ⚙️ Cài đặt → nhập Gemini API Key (miễn phí)','error');return}

  btn.disabled=true;btn.textContent='⏳ Đang hỏi AI...';
  resultEl.innerHTML='<div class="gemini-loading">🧠 Gemini đang phân tích dữ liệu thị trường thật...<br><span style="font-size:11px;color:var(--t3)">Thường mất 3-8 giây</span></div>';

  // Build market data summary from real data
  const btc=S.crypto.find(c=>c.id==='bitcoin');
  const top5=S.crypto.slice(0,5).map(c=>`${c.symbol.toUpperCase()}: $${c.current_price} (24h: ${(c.price_change_percentage_24h||0).toFixed(1)}%, 7d: ${(c.price_change_percentage_7d_in_currency||0).toFixed(1)}%)`).join('\n');
  const fng=S.fng?`Fear & Greed Index: ${S.fng.value} (${S.fng.value_classification})`:'Không có dữ liệu F&G';
  const sigSummary=S.signals.slice(0,5).map(s=>`${s.symbol}: ${s.signal} (${s.confidence}%) — RSI:${s.indicators?.rsi||'?'}, 1H:${s.tfScores?.['1h']?.dir||'?'} 4H:${s.tfScores?.['4h']?.dir||'?'} 1D:${s.tfScores?.['1d']?.dir||'?'}`).join('\n');
  const holdings=S.holdings.map(h=>{const cp=getCurPrice(h);const pnl=((cp-h.cost)/h.cost*100);return`${h.name}: mua $${h.cost}, hiện $${cp.toFixed(2)} (${pnl>=0?'+':''}${pnl.toFixed(1)}%)`}).join('\n');

  const marketData=`THỜI GIAN: ${new Date().toLocaleString('vi-VN')}
BTC: $${btc?.current_price||'?'} (24h: ${(btc?.price_change_percentage_24h||0).toFixed(2)}%)
${fng}

TOP 5 COIN THEO VỐHÓA:
${top5}

TÍN HIỆU KỸ THUẬT (dữ liệu nến Binance, phân tích RSI/MACD/BB/EMA đa khung 1H/4H/1D):
${sigSummary||'Chưa có tín hiệu'}

DANH MỤC ĐANG GIỮ:
${holdings||'Chưa có coin nào'}`;

  try{
    const r=await fetch(BACKEND+'/api/ai/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({marketData})});
    const j=await r.json();
    if(j.success){
      // Format the AI response
      const html=j.analysis
        .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
        .replace(/\n/g,'<br>')
        .replace(/(NÊN MUA|STRONG_BUY|MUA)/gi,'<span class="ai-buy">$1</span>')
        .replace(/(NÊN BÁN|STRONG_SELL|BÁN|TRÁNH)/gi,'<span class="ai-sell">$1</span>');
      resultEl.innerHTML=`<div class="gemini-answer">${html}<div class="gemini-meta">Nguồn: ${j.model} • ${new Date(j.timestamp).toLocaleTimeString('vi-VN')}</div></div>`;
    }else{
      resultEl.innerHTML=`<div class="gemini-error">❌ ${j.error}</div>`;
    }
  }catch(e){
    resultEl.innerHTML=`<div class="gemini-error">❌ Lỗi kết nối: ${e.message}</div>`;
  }
  btn.disabled=false;btn.textContent='🧠 Hỏi AI phân tích ngay';
}

// ═══════════════════════════════════════════════════════
// AI ADVISOR (Rule-based)
// ═══════════════════════════════════════════════════════
function generateAdvice(){
  const parts=[];
  const fngVal=S.fng?parseInt(S.fng.value):null;
  const buys=S.signals.filter(s=>s.signal==='BUY'||s.signal==='STRONG_BUY');
  const sells=S.signals.filter(s=>s.signal==='SELL'||s.signal==='STRONG_SELL');

  // Market health card
  updateMarketHealth(fngVal,buys,sells);

  if(fngVal!==null){
    if(fngVal<=25)parts.push(`<strong>Đa số người chơi đang SỢ HÃI (${fngVal}/100)</strong> → Khi mọi người sợ, đó thường là lúc <span class="buy">NÊN MUA</span> vì giá đang rẻ.`);
    else if(fngVal<=40)parts.push(`Thị trường đang <strong>lo lắng (${fngVal}/100)</strong>. Bạn có thể bắt đầu <span class="buy">mua từ từ</span> các coin lớn như BTC, ETH.`);
    else if(fngVal<=60)parts.push(`Thị trường đang <strong>bình thường (${fngVal}/100)</strong>. Chỉ nên mua khi thấy tín hiệu rõ ràng bên dưới.`);
    else if(fngVal<=75)parts.push(`Mọi người đang <strong>THAM LAM (${fngVal}/100)</strong> → Cẩn thận! Khi ai cũng muốn mua, giá thường sắp giảm. Nên <span class="sell">bán bớt để chốt lời</span>.`);
    else parts.push(`<strong>⚠️ CỰC KỲ THAM LAM (${fngVal}/100)</strong> → RẤT NGUY HIỂM! Nên <span class="sell">BÁN BỚT ngay</span> và giữ tiền mặt chờ giá giảm.`);
  }

  if(buys.length){
    const top=buys.slice(0,3);
    parts.push(`<br>🟢 <strong>Có ${buys.length} coin nên MUA:</strong> ${top.map(s=>`<span class="buy">${s.symbol}</span>`).join(', ')}${buys.length>3?' và '+(buys.length-3)+' coin khác':''}.`);
    const best=buys[0];
    parts.push(`→ <strong>Ưu tiên mua ${best.symbol}:</strong> ${simplifyReason(best.reasons[0])}. Mua ở giá <strong>${F.usd(best.entry)}</strong>, nếu giảm xuống ${F.usd(best.sl)} thì bán cắt lỗ, mục tiêu bán chốt lời ở ${F.usd(best.tp)}.`);
  }

  if(sells.length){
    parts.push(`<br>🔴 <strong>Có ${sells.length} coin nên BÁN:</strong> ${sells.map(s=>`<span class="sell">${s.symbol}</span>`).join(', ')} → Nếu bạn đang giữ, hãy cân nhắc bán bớt.`);
  }

  if(!buys.length&&!sells.length&&S.signals.length){
    parts.push(`<br>⏸️ <strong>Không có coin nào rõ ràng nên mua hay bán.</strong> Hôm nay nên chờ đợi, không nên giao dịch.`);
  }

  if(S.binanceOn&&S.binance.totalUSDT>0){
    parts.push(`<br>💎 <strong>Ví Binance:</strong> Bạn đang có ~<strong>${F.usd(S.binance.totalUSDT)}</strong> | ${S.binance.balances.length} loại coin`);
  }

  if(S.holdings.length){
    let tv=0,tc=0;
    S.holdings.forEach(h=>{const cp=getCurPrice(h);tv+=cp*h.qty;tc+=h.cost*h.qty});
    const pp=tc>0?((tv-tc)/tc)*100:0;
    if(pp<-10)parts.push(`<br>⚠️ Tài sản đang <span class="sell">LỖ ${pp.toFixed(1)}%</span>. Nên xem lại — bán coin yếu, giữ coin tốt.`);
    else if(pp>20)parts.push(`<br>🎯 Tài sản đang <span class="buy">LỜI +${pp.toFixed(1)}%</span>! Nên bán 30-50% để chốt lời an toàn.`);
  }else if(!S.binanceOn){
    parts.push(`<br>💡 Bạn chưa có tài sản nào → Vào tab <strong>💎 Binance</strong> kết nối ví hoặc tab <strong>💰 Danh mục</strong> thêm coin.`);
  }

  if(!parts.length)parts.push('Đang phân tích thị trường...');
  $('advisorBody').innerHTML=parts.join(' ');
  $('advisorTime').textContent=F.time();
}

// ═══════════════════════════════════════════════════════
// SPARKLINE & CHARTS
// ═══════════════════════════════════════════════════════
function drawSparkline(cv,data,up){
  if(!cv||!data||data.length<2)return;
  const ctx=cv.getContext('2d'),w=cv.width,h=cv.height;
  ctx.clearRect(0,0,w,h);
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1,step=w/(data.length-1);
  ctx.beginPath();ctx.strokeStyle=up?'#10B981':'#EF4444';ctx.lineWidth=1.5;
  data.forEach((v,i)=>{const x=i*step,y=h-((v-mn)/rng)*h*0.8-h*0.1;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});
  ctx.stroke();ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,up?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)');g.addColorStop(1,'transparent');
  ctx.fillStyle=g;ctx.fill();
}

function drawFNG(cv,val){
  if(!cv)return;
  const ctx=cv.getContext('2d'),w=cv.width,h=cv.height,cx=w/2,cy=h-1,r=Math.min(w,h)-6;
  ctx.clearRect(0,0,w,h);
  const g=ctx.createLinearGradient(0,0,w,0);
  g.addColorStop(0,'#EF4444');g.addColorStop(0.25,'#F97316');g.addColorStop(0.5,'#EAB308');g.addColorStop(0.75,'#84CC16');g.addColorStop(1,'#10B981');
  ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,0);ctx.lineWidth=5;ctx.strokeStyle=g;ctx.stroke();
  const ang=Math.PI+(val/100)*Math.PI;
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(ang)*(r-3),cy+Math.sin(ang)*(r-3));ctx.strokeStyle='#F1F5F9';ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,2.5,0,Math.PI*2);ctx.fillStyle='#F1F5F9';ctx.fill();
  ctx.fillStyle='#F1F5F9';ctx.font='bold 11px JetBrains Mono';ctx.textAlign='center';ctx.fillText(val,cx,cy-6);
}

function drawDonut(cv,data){
  if(!cv)return;
  const ctx=cv.getContext('2d'),w=cv.width,h=cv.height,cx=w/2,cy=h/2,r=Math.min(w,h)/2-6,inner=r*0.6;
  ctx.clearRect(0,0,w,h);
  if(!data.length){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(51,65,85,0.3)';ctx.lineWidth=r-inner;ctx.stroke();ctx.fillStyle='#64748B';ctx.font='12px Inter';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Trống',cx,cy);return}
  const tot=data.reduce((a,d)=>a+d.v,0);let ang=-Math.PI/2;
  data.forEach(d=>{const sl=(d.v/tot)*Math.PI*2;ctx.beginPath();ctx.arc(cx,cy,r,ang,ang+sl);ctx.arc(cx,cy,inner,ang+sl,ang,true);ctx.closePath();ctx.fillStyle=d.c;ctx.fill();ang+=sl});
}

// ═══════════════════════════════════════════════════════
// API FETCHERS
// ═══════════════════════════════════════════════════════
async function fetchCrypto(){
  const j=await fetchJ(CG+'/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h,7d');
  if(j&&Array.isArray(j)){S.crypto=j;S.cgOn=true}else S.cgOn=false;
  updConn();
}
async function fetchGlobal(){const j=await fetchJ(CG+'/global');if(j&&j.data)S.cglobal=j.data}
async function fetchTrending(){const j=await fetchJ(CG+'/search/trending');if(j&&j.coins)S.trending=j.coins.slice(0,8)}
async function fetchFNG(){const j=await fetchJ(FNG_URL);if(j&&j.data&&j.data[0])S.fng=j.data[0]}

// ═══════════════════════════════════════════════════════
// BINANCE API (via backend proxy)
// ═══════════════════════════════════════════════════════
async function checkBackend(){
  try{const r=await fetch(BACKEND+'/api/binance/status');const j=await r.json();S.backendOn=true;S.binanceOn=j.connected;return j}catch{S.backendOn=false;S.binanceOn=false;return null}
}

async function connectBinance(apiKey,apiSecret){
  const j=await postJ(BACKEND+'/api/binance/connect',{apiKey,apiSecret});
  if(j&&j.success){
    S.binanceOn=true;
    S.binance.balances=j.data.balances;
    S.binance.canTrade=j.data.canTrade;
    toast('✅ Kết nối Binance thành công! '+j.data.totalAssets+' coins','success');
    await fetchBinancePrices();
    renderBinanceTab();
  }else{
    S.binanceOn=false;
    toast('❌ Lỗi: '+(j?.error||'Không kết nối được'),'error');
  }
  updConn();
  return j;
}

async function disconnectBinance(){
  await postJ(BACKEND+'/api/binance/disconnect',{});
  S.binanceOn=false;S.binance={balances:[],orders:[],trades:[],canTrade:false,totalUSDT:0};
  updConn();renderBinanceTab();
  toast('🔌 Đã ngắt kết nối Binance','info');
}

async function fetchBinanceAccount(){
  if(!S.binanceOn)return;
  const j=await fetchJ(BACKEND+'/api/binance/account');
  if(j&&j.success){S.binance.balances=j.data.balances;S.binance.canTrade=j.data.canTrade}
}

async function fetchBinanceOrders(){
  if(!S.binanceOn)return;
  const j=await fetchJ(BACKEND+'/api/binance/orders');
  if(j&&j.success)S.binance.orders=j.data;
}

async function fetchBinanceTrades(symbol){
  if(!S.binanceOn)return;
  const j=await fetchJ(BACKEND+'/api/binance/trades?symbol='+encodeURIComponent(symbol)+'&limit=50');
  if(j&&j.success)S.binance.trades=j.data;
}

async function fetchBinancePrices(){
  const j=await fetchJ(BACKEND+'/api/binance/ticker');
  if(j&&j.success){
    S.tickerMap={};
    j.data.forEach(t=>{S.tickerMap[t.symbol]=t.price});
    // Calculate total USDT value
    let total=0;
    S.binance.balances.forEach(b=>{
      if(b.asset==='USDT'||b.asset==='BUSD'||b.asset==='USDC'){total+=b.total}
      else{const p=S.tickerMap[b.asset+'USDT'];if(p)total+=b.total*p}
    });
    S.binance.totalUSDT=total;
  }
}

async function placeBinanceOrder(symbol,side,type,opts={}){
  const body={symbol,side,type,...opts};
  const j=await postJ(BACKEND+'/api/binance/order',body);
  if(j&&j.success){
    toast(`✅ Lệnh ${side} ${symbol} thành công!`,'success');
    playSound(side==='BUY'?'buy':'sell');
    addAlert(side.toLowerCase(),side==='BUY'?'🟢':'🔴',`${side} ${symbol}`,`Đã đặt lệnh ${type} ${side} ${opts.quantity||opts.quoteOrderQty} ${symbol}`);
    // Refresh data
    setTimeout(()=>{fetchBinanceAccount();fetchBinanceOrders();fetchBinancePrices()},2000);
  }else{
    toast('❌ Lỗi: '+(j?.error||'Không đặt lệnh được'),'error');
  }
  return j;
}

async function cancelBinanceOrder(symbol,orderId){
  const j=await delJ(BACKEND+'/api/binance/order?symbol='+symbol+'&orderId='+orderId);
  if(j&&j.success){toast('✅ Đã huỷ lệnh #'+orderId,'success');fetchBinanceOrders()}
  else toast('❌ Lỗi: '+(j?.error||'Không huỷ được'),'error');
  return j;
}

function updConn(){
  const d1=$('apiDot'),d3=$('sCgDot'),d4=$('sFngDot');
  const bd=$('binanceDot'),bl=$('binanceLabel');
  const sbd=$('sBackendDot'),sbn=$('sBinanceDot');
  if(d1){d1.className=S.cgOn?'status-dot on':'status-dot off';$('apiLabel').textContent=S.cgOn?'CoinGecko OK':'Kết nối...'}
  if(bd){bd.className=S.binanceOn?'status-dot on':'status-dot off';bl.textContent=S.binanceOn?'Binance: Đã kết nối':'Binance: Chưa kết nối'}
  if(d3)d3.className=S.cgOn?'status-dot on':'status-dot off';
  if(d4)d4.className=S.fng?'status-dot on':'status-dot off';
  if(sbd)sbd.className=S.backendOn?'status-dot on':'status-dot off';
  if(sbn)sbn.className=S.binanceOn?'status-dot on':'status-dot off';
}

// Live price cache — fetched from Binance via backend
const livePrices={};

// CoinGecko ID → Binance ticker mapping
const ID_TO_TICKER={
  bitcoin:'BTC',ethereum:'ETH',binancecoin:'BNB',solana:'SOL',
  ripple:'XRP',cardano:'ADA',dogecoin:'DOGE',tron:'TRX',
  'shiba-inu':'SHIB',avalanche:'AVAX',chainlink:'LINK',polkadot:'DOT',
  litecoin:'LTC',uniswap:'UNI','matic-network':'MATIC',polygon:'POL',
  stellar:'XLM',cosmos:'ATOM',monero:'XMR',filecoin:'FIL',
  'internet-computer':'ICP',vechain:'VET',arbitrum:'ARB',optimism:'OP',
  render:'RENDER',celestia:'TIA',injective:'INJ',sei:'SEI',
  'the-graph':'GRT',aptos:'APT',sui:'SUI','near':'NEAR',
  'terra-luna-2':'LUNA',ondo:'ONDO',pepe:'PEPE',bonk:'BONK',
  floki:'FLOKI',kaspa:'KAS',maker:'MKR',aave:'AAVE',
};

// Get Binance trading ticker from any holding format
function getTicker(h){
  // 1. Check mapping (CoinGecko ID)
  const sym=h.symbol||'';
  const lo=sym.toLowerCase();
  if(ID_TO_TICKER[lo])return ID_TO_TICKER[lo];
  // 2. Use symbolLower if it looks like a short ticker (<=6 chars, no spaces)
  const sl=(h.symbolLower||'').toUpperCase();
  if(sl&&sl.length<=10&&!/\s/.test(sl))return sl;
  // 3. Clean up symbol directly
  return sym.toUpperCase().replace(/[^A-Z0-9]/g,'');
}

async function fetchHoldingPrices(){
  if(!S.holdings.length)return;
  const tickers=[...new Set(S.holdings.map(h=>getTicker(h)).filter(Boolean))];
  try{
    const r=await fetch(BACKEND+'/api/market/prices?symbols='+tickers.join(','));
    const j=await r.json();
    if(j.success&&j.prices){
      Object.entries(j.prices).forEach(([sym,price])=>{
        livePrices[sym]={p:price,t:Date.now()};
      });
      console.log('💰 Live prices:',Object.entries(j.prices).map(([s,p])=>s+':$'+p).join(', '));
    }
  }catch(e){console.error('fetchHoldingPrices error:',e)}
}

function getCurPrice(h){
  const ticker=getTicker(h);
  // 1. Live Binance price (most accurate)
  if(livePrices[ticker])return livePrices[ticker].p;
  // 2. CoinGecko match
  const lo=(h.symbolLower||h.symbol||'').toLowerCase();
  const c=S.crypto.find(x=>x.id===lo||x.symbol===lo||x.id===h.symbol);
  if(c)return c.current_price;
  // 3. Binance balance prices
  if(S.binance.prices&&S.binance.prices[ticker+'USDT'])return parseFloat(S.binance.prices[ticker+'USDT']);
  // 4. Fallback
  return h.cost;
}


// ═══════════════════════════════════════════════════════
// RENDERERS
// ═══════════════════════════════════════════════════════
function renderDash(){
  let totalVal=0,totalCost=0;
  S.holdings.forEach(h=>{const cp=getCurPrice(h);totalVal+=cp*h.qty;totalCost+=h.cost*h.qty});
  const pnl=totalVal-totalCost,pnlPct=totalCost>0?((totalVal-totalCost)/totalCost)*100:0;
  const da=$('dTotalAsset');if(da)da.textContent=totalVal>0?F.usd(totalVal):'$0';
  const pe=$('dTotalPnl');
  if(pe){pe.textContent=totalVal>0?`${pnl>=0?'Lãi ':'Lỗ '}${F.usd(Math.abs(pnl))} (${F.pct(pnlPct)})`:'Chưa có tài sản';pe.className='dc-sub '+(pnl>=0?'gain':'loss')}
  if(S.fng){
    const v=parseInt(S.fng.value);
    const fg=$('dashFng');if(fg)drawFNG(fg,v);
    const fl=$('dFngLabel');
    if(fl){const fngVi=v<=25?'Sợ hãi':v<=40?'Lo lắng':v<=60?'Bình thường':v<=75?'Tham lam':'Rất tham lam';fl.textContent=fngVi+' ('+v+')';fl.className='dc-sub '+(v<=25?'loss':v>=75?'gain':'')}
  }
  // BTC real price
  const btc=S.crypto.find(c=>c.id==='bitcoin');
  if(btc){
    const bp=$('dBtcPrice');if(bp)bp.textContent=F.usd(btc.current_price);
    const bc=btc.price_change_percentage_24h||0;
    const bce=$('dBtcChange');if(bce){bce.textContent=(bc>=0?'↑ +':'↓ ')+bc.toFixed(2)+'% hôm nay';bce.className='dc-sub '+(bc>=0?'gain':'loss')}
  }
  // Binance
  const bv=$('dBinanceVal');if(bv){bv.textContent=S.binanceOn?F.usd(S.binance.totalUSDT):'Chưa kết nối';bv.className='dc-value dc-binance'+(S.binanceOn?' gain':'')}
  generateAdvice();
}

function sigCardHTML(s){
  const isBuy=s.signal.includes('BUY');
  const cls=isBuy?'buy-card':'sell-card';

  // Multi-timeframe scores
  let tfHTML='';
  if(s.tfScores){
    const tf=s.tfScores;
    tfHTML='<div class="tf-row">';
    ['1h','4h','1d'].forEach(k=>{
      const d=tf[k];if(!d)return;
      const c=d.score>3?'tf-bull':d.score<-3?'tf-bear':'tf-neutral';
      tfHTML+=`<span class="tf-badge ${c}">${k.toUpperCase()} ${d.dir}</span>`;
    });
    tfHTML+='</div>';
  }

  // Checklist
  let checkHTML='';
  if(s.checks&&s.checks.length){
    checkHTML='<div class="sig-checklist">'+s.checks.map(c=>{
      const cls=c.good?'check-good':c.neutral?'check-ok':'check-bad';
      const icon=c.good?'✅':c.neutral?'🟡':'❌';
      return`<span class="check-item ${cls}">${icon} ${c.label}</span>`;
    }).join('')+'</div>';
  }

  // Data source badge
  const srcBadge=s.dataSource==='binance'
    ?'<span class="src-badge src-binance">📊 Binance Real Data</span>'
    :'<span class="src-badge src-cg">🌐 CoinGecko</span>';

  // Action box
  const actionText=isBuy
    ?`<div class="sig-action-box buy-box">👉 <strong>NÊN MUA</strong> — ${simplifyReason(s.reasons[0])}</div>`
    :`<div class="sig-action-box sell-box">👉 <strong>NÊN BÁN</strong> — ${simplifyReason(s.reasons[0])}</div>`;

  return`<div class="sig-card ${cls}" onclick="openCoinModal('${s.id}')">
    <div class="sig-top">
      <span class="sig-name"><img src="${s.image}" alt="${s.symbol}">${s.symbol} <span style="font-weight:400;color:var(--t3);font-size:11px">#${s.rank||'--'}</span></span>
      <span class="sig-badge ${s.signal}">${F.sig(s.signal)}</span>
    </div>
    <div class="sig-meta">${srcBadge}${tfHTML}</div>
    ${actionText}
    ${checkHTML}
    <div class="sig-conf"><div class="sig-conf-text">Độ tin cậy: ${s.confidence}%</div><div class="conf-bar"><div class="conf-fill" style="width:${s.confidence}%"></div></div></div>
    <ul class="sig-reason">${s.reasons.slice(1).map(r=>'<li>'+simplifyReason(r)+'</li>').join('')}</ul>
    <div class="sig-prices">
      <div class="sig-price"><span class="sig-price-label">💰 Mua ở giá</span><span class="sig-price-val">${F.usd(s.entry)}</span></div>
      <div class="sig-price"><span class="sig-price-label">🛑 Cắt lỗ (-${s.slPct||'7'}%)</span><span class="sig-price-val loss">${F.usd(s.sl)}</span></div>
      <div class="sig-price"><span class="sig-price-label">🎯 Chốt lời (+${s.tpPct||'20'}%)</span><span class="sig-price-val gain">${F.usd(s.tp)}</span></div>
    </div>
    <div class="sig-rr">R:R = 1:${s.rr} ${parseFloat(s.rr)>=2.5?'⭐ Rất tốt':parseFloat(s.rr)>=2?'✅ Tốt':'⚠️ Bình thường'}</div>
  </div>`;
}

function alertHTML(a){
  return`<div class="alert-item"><span class="alert-icon">${a.icon}</span><div class="alert-content"><div class="alert-title">${a.title}</div><div class="alert-desc">${a.desc}</div></div><span class="alert-time">${F.ago(a.time)}</span></div>`;
}

function renderSignals(){
  const sum=$('sigSummary');const grid=$('signalGrid');
  let sigs=[...S.signals];
  if(S.sigFilter==='BUY')sigs=sigs.filter(s=>s.signal.includes('BUY'));
  else if(S.sigFilter==='SELL')sigs=sigs.filter(s=>s.signal.includes('SELL'));
  const bc=S.signals.filter(s=>s.signal.includes('BUY')).length;
  const sc=S.signals.filter(s=>s.signal.includes('SELL')).length;
  sum.innerHTML=`<span class="g">🟢 Mua: ${bc}</span><span class="r">🔴 Bán: ${sc}</span><span>Tổng: ${S.signals.length}</span>`;
  if(!sigs.length){grid.innerHTML='<div class="empty-msg">Không có tín hiệu'+(S.settings.highConf?' >70% tin cậy':'')+'. Thị trường đang bình thường.</div>';return}
  grid.innerHTML=sigs.map(s=>sigCardHTML(s)).join('');
}

function renderMarket(){
  const st=$('cryptoStats');
  if(S.cglobal){
    const g=S.cglobal;
    st.innerHTML=`<div class="cstat"><span class="cstat-l">Vốn hóa</span><span class="cstat-v">${F.mcap(g.total_market_cap?.usd)}</span></div>
      <div class="cstat"><span class="cstat-l">KL 24h</span><span class="cstat-v">${F.mcap(g.total_volume?.usd)}</span></div>
      <div class="cstat"><span class="cstat-l">BTC Dom</span><span class="cstat-v">${(g.market_cap_percentage?.btc||0).toFixed(1)}%</span></div>
      <div class="cstat"><span class="cstat-l">Fear&Greed</span><span class="cstat-v ${S.fng&&parseInt(S.fng.value)<=25?'loss':''}">${S.fng?S.fng.value+' — '+S.fng.value_classification:'--'}</span></div>`;
  }
  let coins=[...S.crypto];
  if(S.mktSearch){const q=S.mktSearch.toLowerCase();coins=coins.filter(c=>c.name.toLowerCase().includes(q)||c.symbol.toLowerCase().includes(q))}
  const tb=$('cryptoTbody');
  if(!coins.length){tb.innerHTML='<tr><td colspan="8" class="ld">Không tìm thấy</td></tr>';return}
  tb.innerHTML=coins.map((c,i)=>{
    const c24=c.price_change_percentage_24h||0;const c7d=c.price_change_percentage_7d_in_currency||null;
    const isFav=S.favs.includes(c.id);const spId='sp_'+c.id.replace(/[^a-z0-9]/g,'');
    return`<tr onclick="openCoinModal('${c.id}')" style="cursor:pointer">
      <td onclick="event.stopPropagation();togFav('${c.id}')"><button class="fav-btn ${isFav?'on':''}">${isFav?'⭐':'☆'}</button></td>
      <td style="color:var(--t4)">${i+1}</td>
      <td><div class="crypto-coin"><img src="${c.image}" alt="${c.symbol}"><div><span>${c.name}</span><br><span class="crypto-coin-sym">${c.symbol}</span></div></div></td>
      <td>${F.usd(c.current_price)}</td><td class="${F.cc(c24)}">${F.pct(c24)}</td>
      <td class="${c7d!=null?F.cc(c7d):''}">${c7d!=null?F.pct(c7d):'--'}</td>
      <td>${F.mcap(c.market_cap)}</td>
      <td><canvas class="sparkline" id="${spId}" width="80" height="28"></canvas></td>
    </tr>`}).join('');
  requestAnimationFrame(()=>{coins.forEach(c=>{const cv=document.getElementById('sp_'+c.id.replace(/[^a-z0-9]/g,''));const d=c.sparkline_in_7d?.price;if(cv&&d&&d.length>1)drawSparkline(cv,d,d[d.length-1]>=d[0])})});
}

// Binance tab
function renderBinanceTab(){
  const connected=S.binanceOn;
  // Show/hide cards
  ['bnBalanceCard','bnTradeCard','bnOrderCard','bnHistoryCard'].forEach(id=>{const el=$(id);if(el)el.style.display=connected?'':'none'});
  // Connect form vs status
  const form=$('bnConnectForm'),status=$('bnStatusMsg');
  if(form)form.style.display=connected?'none':'';
  if(status)status.style.display=connected?'flex':'none';
  // Total value
  if(connected){
    const tv=$('bnTotalValue');
    if(tv)tv.textContent=F.usd(S.binance.totalUSDT);
    renderBinanceBalance();
    renderBinanceOrders();
  }
}

function renderBinanceBalance(){
  const tb=$('bnBalanceTbody');
  if(!S.binance.balances.length){tb.innerHTML='<tr><td colspan="5" class="ld">Không có coin</td></tr>';return}
  
  const balances=S.binance.balances.map(b=>{
    let usdtVal=0;
    if(b.asset==='USDT'||b.asset==='BUSD'||b.asset==='USDC')usdtVal=b.total;
    else{const p=S.tickerMap[b.asset+'USDT'];if(p)usdtVal=b.total*p}
    return{...b,usdtVal};
  }).sort((a,b)=>b.usdtVal-a.usdtVal);

  $('bnTotalValue').textContent=F.usd(S.binance.totalUSDT);

  tb.innerHTML=balances.map(b=>`<tr>
    <td><strong>${b.asset}</strong></td>
    <td>${F.num(b.free)}</td>
    <td>${b.locked>0?F.num(b.locked):'—'}</td>
    <td>${F.num(b.total)}</td>
    <td>${b.usdtVal>0.01?F.usd(b.usdtVal):'< $0.01'}</td>
  </tr>`).join('');
}

function renderBinanceOrders(){
  const tb=$('bnOrdersTbody');
  const cnt=$('bnOrderCount');
  if(cnt)cnt.textContent=S.binance.orders.length;
  if(!S.binance.orders.length){tb.innerHTML='<tr><td colspan="8" class="ld">Không có lệnh mở</td></tr>';return}
  tb.innerHTML=S.binance.orders.map(o=>{
    const sideClass=o.side==='BUY'?'gain':'loss';
    return`<tr>
      <td><strong>${o.symbol}</strong></td>
      <td>${o.type}</td>
      <td class="${sideClass}"><strong>${o.side==='BUY'?'🟢 MUA':'🔴 BÁN'}</strong></td>
      <td>${F.usd(o.price)}</td>
      <td>${F.num(o.origQty)}</td>
      <td>${F.num(o.executedQty)}</td>
      <td>${F.dt(o.time)}</td>
      <td><button class="btn-sm btn-danger" onclick="cancelBinanceOrder('${o.symbol}',${o.orderId})">✕ Huỷ</button></td>
    </tr>`}).join('');
}

function renderBinanceHistory(){
  const tb=$('bnHistoryTbody');
  if(!S.binance.trades.length){tb.innerHTML='<tr><td colspan="7" class="ld">Không có lịch sử</td></tr>';return}
  tb.innerHTML=S.binance.trades.map(t=>{
    const sideClass=t.side==='BUY'?'gain':'loss';
    return`<tr>
      <td>${F.dt(t.time)}</td>
      <td><strong>${t.symbol}</strong></td>
      <td class="${sideClass}"><strong>${t.side==='BUY'?'🟢 MUA':'🔴 BÁN'}</strong></td>
      <td>${F.usd(t.price)}</td>
      <td>${F.num(t.qty)}</td>
      <td>${F.usd(t.quoteQty)}</td>
      <td>${t.commission} ${t.commissionAsset}</td>
    </tr>`}).join('');
}

function renderAlerts(){
  const el=$('alertHistory');
  if(!S.alerts.length){el.innerHTML='<div class="empty-msg">Chưa có cảnh báo nào. AI sẽ cảnh báo khi có tín hiệu quan trọng.</div>';return}
  el.innerHTML=S.alerts.slice(0,50).map(alertHTML).join('');
  renderPriceAlerts();
}

function renderPriceAlerts(){
  const el=$('paList');if(!el)return;
  if(!S.customPriceAlerts.length){el.innerHTML='<div class="empty-msg" style="padding:8px;font-size:12px">Chưa có cảnh báo giá. Thêm ở form trên.</div>';return}
  el.innerHTML=S.customPriceAlerts.map(pa=>{
    const cls=pa.triggered?'pa-item triggered':'pa-item';
    return`<div class="${cls}">
      <div><span class="pa-coin">${pa.coinId}</span><span class="pa-dir">${pa.direction==='above'?'≥':'≤'}</span><span class="pa-price ${pa.direction}">${F.usd(pa.price)}</span>${pa.triggered?' <span style="color:var(--green2);font-weight:700">✅ Đã kích hoạt</span>':''}</div>
      <button class="btn-del" onclick="delPA(${pa.id})">✕</button>
    </div>`;
  }).join('');
}
window.delPA=function(id){S.customPriceAlerts=S.customPriceAlerts.filter(p=>p.id!==id);savePA();renderPriceAlerts();toast('Đã xoá','info')};

function renderPortfolio(){
  const tb=$('portTbody');
  const h=S.holdings;
  if(!h.length){
    tb.innerHTML='<tr><td colspan="10" class="ld empty-msg">Chưa có tài sản — thêm ở form trên hoặc đồng bộ Binance</td></tr>';
    $('pTotal').textContent='$0';$('pPnl').textContent='--';$('pPnl').className='ph-pnl';$('pStats').innerHTML='';$('pLegend').innerHTML='';drawDonut($('pChart'),[]);return;
  }
  let tv=0,tc=0;
  tb.innerHTML=h.map((hh,i)=>{
    const cp=getCurPrice(hh);const val=cp*hh.qty,cost=hh.cost*hh.qty;
    const pnl=val-cost,pp=cost>0?((val-cost)/cost)*100:0;tv+=val;tc+=cost;
    const cc=F.cc(pnl);
    const slHit=hh.sl&&pp<=-hh.sl;const tpHit=hh.tp&&pp>=hh.tp;
    const status=slHit?'<span class="sl-warn">⚠️ STOP-LOSS</span>':tpHit?'<span class="tp-ok">🎯 CHỐT LỜI</span>':'<span class="holding-ok">Giữ</span>';
    return`<tr><td>🪙 ${hh.name}</td><td>${hh.qty}</td><td>${F.usd(hh.cost)}</td><td>${F.usd(cp)}</td><td>${F.usd(val)}</td><td class="${cc}">${pnl>=0?'+':''}${F.usd(Math.abs(pnl))} (${F.pct(pp)})</td><td>${hh.sl||'--'}%</td><td>${hh.tp||'--'}%</td><td>${status}</td><td><button class="btn-del" onclick="delHolding('${hh.id}')">✕</button></td></tr>`;
  }).join('');
  const tp=tv-tc,tpp=tc>0?((tv-tc)/tc)*100:0;
  $('pTotal').textContent=F.usd(tv);
  const pe=$('pPnl');pe.textContent=`${tp>=0?'+':''}${F.usd(Math.abs(tp))} (${F.pct(tpp)})`;pe.className='ph-pnl '+(tp>=0?'gain':'loss');
  $('pStats').innerHTML=`<div class="ph-stat"><span class="ph-stat-l">Vốn đầu tư</span><span class="ph-stat-v">${F.usd(tc)}</span></div><div class="ph-stat"><span class="ph-stat-l">Số mã</span><span class="ph-stat-v">${h.length}</span></div>`;
  const chartData=h.map((hh,i)=>({l:hh.name,v:getCurPrice(hh)*hh.qty,c:COLORS[i%COLORS.length]}));
  drawDonut($('pChart'),chartData);
  $('pLegend').innerHTML=chartData.map(d=>`<div class="leg-item"><span class="leg-dot" style="background:${d.c}"></span>${d.l}</div>`).join('');
}

// ═══════════════════════════════════════════════════════
// AI ASSET ALLOCATION (crypto only)
// ═══════════════════════════════════════════════════════
function aiAllocate(){
  const budgetRaw=+$('allocBudget').value;
  const currency=$('allocCurrency').value;
  const risk=$('allocRisk').value;
  if(!budgetRaw||budgetRaw<=0){toast('Nhập số tiền đầu tư','error');return}
  const budgetUSD=currency==='vnd'?budgetRaw/USD_VND:budgetRaw;
  const budgetDisplay=currency==='vnd'?F.vnd(budgetRaw):F.usd(budgetRaw);
  const fngVal=S.fng?parseInt(S.fng.value):50;
  const result=$('allocResult');

  const templates={
    low:[{id:'bitcoin',pct:50,reason:'Blue-chip crypto, an toàn nhất'},{id:'ethereum',pct:30,reason:'Hệ sinh thái DeFi lớn nhất'},{id:'tether',pct:20,reason:'Stablecoin — giữ tiền mặt chờ cơ hội'}],
    mid:[{id:'bitcoin',pct:35,reason:'Nền tảng an toàn'},{id:'ethereum',pct:25,reason:'DeFi + Staking yield'},{id:'solana',pct:15,reason:'Tốc độ cao, phí rẻ'},{id:'bnb',pct:10,reason:'Sàn Binance ecosystem'},{id:'',pct:15,reason:'Stablecoin dự phòng',stable:true}],
    high:[{id:'bitcoin',pct:20,reason:'Core holding'},{id:'ethereum',pct:15,reason:'Giảm sâu từ ATH'},{id:'solana',pct:15,reason:'On-chain mạnh nhất'},{id:'',pct:15,reason:'AI gợi ý #1',ai:true},{id:'',pct:15,reason:'AI gợi ý #2',ai:true},{id:'',pct:10,reason:'Trending coin',trending:true},{id:'',pct:10,reason:'Dự phòng',stable:true}]
  };

  let fngAdjust='',cashBoost=0;
  if(fngVal<=25){fngAdjust='Fear & Greed = '+fngVal+' (Extreme Fear) → <span class="buy">tăng tỷ trọng mua</span>, giảm tiền mặt.';cashBoost=-5}
  else if(fngVal>=75){fngAdjust='Fear & Greed = '+fngVal+' (Extreme Greed) → <strong>tăng tiền mặt 15%</strong>, giảm rủi ro.';cashBoost=15}
  else if(fngVal>=60){fngAdjust='Fear & Greed = '+fngVal+' (Greed) → giữ thận trọng, tăng tiền mặt 5%.';cashBoost=5}

  const buySignals=S.signals.filter(s=>s.signal.includes('BUY')).sort((a,b)=>b.confidence-a.confidence);
  let tpl=[...templates[risk]];
  tpl=tpl.map(t=>{
    if(t.ai&&buySignals.length){
      const pick=buySignals.shift();
      const c=S.crypto.find(x=>x.id===pick.id);
      return{id:pick.id,pct:t.pct,reason:'AI: '+pick.reasons[0],image:c?.image,name:c?.name||pick.symbol};
    }
    if(t.trending&&S.trending.length){
      const tr=S.trending[0].item;
      return{id:tr.id,pct:t.pct,reason:'Trending #1 trên CoinGecko',image:tr.small,name:tr.name};
    }
    if(t.stable)return{id:'tether',pct:t.pct,reason:t.reason,name:'USDT (Stablecoin)'};
    const c=S.crypto.find(x=>x.id===t.id);
    return{...t,image:c?.image,name:c?.name||t.id,price:c?.current_price};
  });

  if(cashBoost!==0){
    const stableIdx=tpl.findIndex(t=>t.id==='tether');
    if(stableIdx>=0){const delta=Math.min(cashBoost,tpl[0].pct-10);tpl[stableIdx].pct+=delta;tpl[0].pct-=delta}
  }

  const riskLabels={low:'🛡️ An toàn',mid:'⚖️ Cân bằng',high:'🔥 Mạo hiểm'};
  let html=`<div class="alloc-summary">
    <strong>Phân bổ ${budgetDisplay}</strong> — Mức rủi ro: ${riskLabels[risk]}<br>
    ${fngAdjust?fngAdjust+'<br>':''}
    Mỗi vị thế đặt <strong>Stop-loss -7%</strong> và <strong>Take-profit +20%</strong>. Chiến lược: <span class="buy">DCA (mua dần)</span>, không all-in.
  </div>`;

  html+=`<table class="alloc-table"><thead><tr><th>Tài sản</th><th>Tỷ trọng</th><th></th><th>Số tiền</th><th>Lý do</th></tr></thead><tbody>`;
  tpl.forEach((item,i)=>{
    const amount=budgetUSD*(item.pct/100);
    const amountDisplay=currency==='vnd'?F.vnd(amount*USD_VND):F.usd(amount);
    const icon=item.image?`<img src="${item.image}">`:`<span style="font-size:16px">🪙</span>`;
    const label=item.name||item.id;
    html+=`<tr>
      <td><div class="alloc-coin">${icon}<span>${label}</span></div></td>
      <td><span class="alloc-pct">${item.pct}%</span></td>
      <td><div class="alloc-bar-wrap"><div class="alloc-bar" style="width:${item.pct}%;background:${COLORS[i%COLORS.length]}"></div></div></td>
      <td><span class="alloc-amount">${amountDisplay}</span></td>
      <td><span class="alloc-reason">${item.reason}</span></td>
    </tr>`;
  });
  html+=`</tbody></table>`;

  html+=`<div class="alloc-actions">
    <button class="btn-apply" onclick="applyAllocation()">✅ Thêm vào danh mục</button>
    <button class="btn-copy" onclick="copyAllocation()">📋 Sao chép</button>
  </div>`;
  result.innerHTML=html;
  S._lastAlloc={items:tpl,budgetUSD,currency,budgetRaw};
  toast('✅ Đã phân bổ xong!','success');
}

window.applyAllocation=function(){
  if(!S._lastAlloc)return;
  const {items,budgetUSD}=S._lastAlloc;
  let added=0;
  items.forEach(item=>{
    if(item.id==='tether')return;
    const amount=budgetUSD*(item.pct/100);
    const c=S.crypto.find(x=>x.id===item.id);
    const price=c?c.current_price:0;
    if(price<=0)return;
    const qty=amount/price;
    if(qty<=0)return;
    S.holdings.push({id:Date.now().toString()+added,type:'crypto',symbol:item.id,symbolLower:item.id.toLowerCase(),name:item.name||item.id,qty:Math.round(qty*10000)/10000,cost:price,sl:7,tp:20});
    added++;
  });
  if(added>0){saveH();renderPortfolio();toast(`✅ Đã thêm ${added} mã vào danh mục!`,'success')}
  else toast('Không có mã nào để thêm','warn');
};

window.copyAllocation=function(){
  if(!S._lastAlloc)return;
  const {items,budgetUSD,currency,budgetRaw}=S._lastAlloc;
  let text='=== AI PHÂN BỔ TÀI SẢN ===\n';
  text+='Tổng vốn: '+(currency==='vnd'?budgetRaw.toLocaleString()+' VND':'$'+budgetUSD.toLocaleString())+'\n\n';
  items.forEach(item=>{
    const amt=budgetUSD*(item.pct/100);
    text+='  - '+(item.name||item.id)+': '+item.pct+'% = $'+amt.toFixed(2)+' — '+item.reason+'\n';
  });
  navigator.clipboard.writeText(text).then(()=>toast('📋 Đã copy!','info')).catch(()=>toast('Không thể copy','error'));
};

// ═══════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════
window.openCoinModal=function(id){
  const c=S.crypto.find(x=>x.id===id);if(!c)return;
  $('mTitle').textContent=c.name+' ('+c.symbol.toUpperCase()+')';
  const c24=c.price_change_percentage_24h||0;
  const sig=S.signals.find(s=>s.id===id);
  const sigHTML=sig?`<div style="margin-top:16px;padding:12px;background:var(--bg2);border-radius:var(--r);border-left:3px solid ${sig.signal.includes('BUY')?'var(--green)':'var(--red)'}"><div style="display:flex;justify-content:space-between;align-items:center"><span class="sig-badge ${sig.signal}">${F.sig(sig.signal)}</span><span style="color:var(--t3);font-size:12px">Tin cậy: ${sig.confidence}%</span></div><ul class="sig-reason" style="margin:8px 0">${sig.reasons.map(r=>'<li>'+r+'</li>').join('')}</ul><div class="sig-prices"><div class="sig-price"><span class="sig-price-label">Vào lệnh</span><span class="sig-price-val">${F.usd(sig.entry)}</span></div><div class="sig-price"><span class="sig-price-label">Cắt lỗ</span><span class="sig-price-val loss">${F.usd(sig.sl)}</span></div><div class="sig-price"><span class="sig-price-label">Mục tiêu</span><span class="sig-price-val gain">${F.usd(sig.tp)}</span></div></div></div>`:'';

  // Binance quick trade button
  const bnTradeHTML=S.binanceOn?`<div style="margin-top:12px;display:flex;gap:8px"><button class="btn-buy trade-btn" onclick="quickTrade('${c.symbol.toUpperCase()}USDT','BUY')">🟢 MUA trên Binance</button><button class="btn-sell trade-btn" onclick="quickTrade('${c.symbol.toUpperCase()}USDT','SELL')">🔴 BÁN trên Binance</button></div>`:'';

  $('mBody').innerHTML=`<div style="display:flex;align-items:center;gap:12px"><img src="${c.image}" style="width:36px;height:36px;border-radius:50%"><div><div style="font-size:26px;font-weight:900;font-family:var(--mono)">${F.usd(c.current_price)}</div><div class="${F.cc(c24)}" style="font-size:13px;font-weight:600">${F.pct(c24)} (24h)</div></div></div>
    <div class="coin-grid"><div class="coin-item"><span class="coin-item-l">Vốn hóa</span><span class="coin-item-v">${F.mcap(c.market_cap)}</span></div><div class="coin-item"><span class="coin-item-l">KL 24h</span><span class="coin-item-v">${F.mcap(c.total_volume)}</span></div><div class="coin-item"><span class="coin-item-l">Rank</span><span class="coin-item-v">#${c.market_cap_rank||'?'}</span></div><div class="coin-item"><span class="coin-item-l">ATH</span><span class="coin-item-v">${F.usd(c.ath)}</span></div><div class="coin-item"><span class="coin-item-l">Từ ATH</span><span class="coin-item-v loss">${F.pct(c.ath_change_percentage)}</span></div><div class="coin-item"><span class="coin-item-l">Cao 24h</span><span class="coin-item-v">${F.usd(c.high_24h)}</span></div></div>
    ${sigHTML}${bnTradeHTML}
    <div style="margin-top:16px"><canvas id="mSpark" width="460" height="90"></canvas></div>`;
  $('modal').classList.add('open');
  requestAnimationFrame(()=>{const cv=document.getElementById('mSpark');const d=c.sparkline_in_7d?.price;if(cv&&d){cv.width=cv.parentElement.clientWidth;drawSparkline(cv,d,d[d.length-1]>=d[0])}});
};

window.quickTrade=function(symbol,side){
  $('modal').classList.remove('open');
  switchTab('binance');
  $('tradeSymbol').value=symbol;
  setTimeout(()=>{$('tradeQuoteQty').focus()},300);
};

// ═══════════════════════════════════════════════════════
// NAV + EVENTS
// ═══════════════════════════════════════════════════════
const TITLES={portfolio:'Tài sản của tôi',alerts:'Cảnh báo',research:'Nghiên cứu & Tín hiệu',settings:'Cài đặt'};
function switchTab(t){
  S.tab=t;$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.tab===t));
  $$('.tab').forEach(c=>c.classList.toggle('active',c.id==='tab-'+t));
  $('pageTitle').textContent=TITLES[t]||t;
  if(t==='portfolio'){renderPortfolio();renderBinanceTab();if(S.binanceOn){fetchBinanceAccount().then(()=>{fetchBinancePrices();renderBinanceBalance()});fetchBinanceOrders().then(renderBinanceOrders)}}
  else if(t==='alerts'){renderAlerts();renderMyCoinsAlerts()}
  else if(t==='research'){renderDash();renderSignals()}
  else if(t==='settings'){}
}

// Cảnh báo cho coin đang giữ — Nên BÁN hay DCA?
function renderMyCoinsAlerts(){
  const el=$('myCoinsAlerts');if(!el)return;
  if(!S.holdings.length){el.innerHTML='<div class="empty-msg">Thêm coin vào tab 💰 Tài sản để xem cảnh báo</div>';return}

  const priceMap={};
  S.crypto.forEach(c=>{priceMap[c.id]=c;priceMap[c.symbol]=c});

  const html=S.holdings.map(h=>{
    const cg=priceMap[h.symbol]||priceMap[h.symbolLower];
    const cp=cg?cg.current_price:h.cost;
    const pnlPct=((cp-h.cost)/h.cost)*100;
    const c24=cg?cg.price_change_percentage_24h||0:0;
    const sparkData=cg?.sparkline_in_7d?.price||[];

    // Find signal for this coin
    const sig=S.signals.find(s=>s.id===h.symbol||s.id===h.symbolLower);

    let action='',actionClass='',reason='';
    // Logic: when to sell, when to DCA
    if(pnlPct>=h.tp){
      action='🎯 CHỐT LỜI — Bán bớt 50%';actionClass='sell-box';
      reason=`Đã lời +${pnlPct.toFixed(1)}% (mục tiêu ${h.tp}%). Nên bán 50% để bảo toàn lợi nhuận.`;
    }else if(pnlPct<=-h.sl){
      action='🛑 CẮT LỖ — Bán ngay';actionClass='sell-box';
      reason=`Đã lỗ ${pnlPct.toFixed(1)}% (vượt ngưỡng -${h.sl}%). Nên cắt lỗ để bảo toàn vốn.`;
    }else if(pnlPct<-15&&sig&&sig.signal.includes('BUY')){
      action='💰 DCA — Mua thêm';actionClass='buy-box';
      reason=`Đang lỗ ${pnlPct.toFixed(1)}% nhưng AI phát hiện tín hiệu tốt. Mua thêm để giảm giá trung bình.`;
    }else if(pnlPct<-5&&c24<-5){
      action='⏸️ CHỜ — Theo dõi';actionClass='';
      reason=`Đang lỗ ${pnlPct.toFixed(1)}%, hôm nay giảm ${c24.toFixed(1)}%. Chưa nên mua thêm, đợi giá ổn định.`;
    }else if(sig&&sig.signal==='STRONG_SELL'){
      action='🔴 BÁN BỚT';actionClass='sell-box';
      reason=`AI phát hiện tín hiệu bán mạnh (${sig.confidence}%). Nên bán bớt.`;
    }else if(sig&&sig.signal.includes('BUY')&&pnlPct>5){
      action='✅ GIỮ — Đang tốt';actionClass='buy-box';
      reason=`Lời +${pnlPct.toFixed(1)}% và AI vẫn khuyên giữ. Tiếp tục hold.`;
    }else if(pnlPct>0){
      action='✅ GIỮ';actionClass='';
      reason=`Đang lời +${pnlPct.toFixed(1)}%. Chưa cần hành động.`;
    }else{
      action='⏸️ CHỜ';actionClass='';
      reason=`Đang ${pnlPct>=0?'lời':'lỗ'} ${pnlPct.toFixed(1)}%. Theo dõi tiếp.`;
    }

    return`<div class="mca-item">
      <div class="mca-top">
        <span class="mca-name">${cg?'<img src="'+cg.image+'" width="20">':''}${h.name}</span>
        <span class="mca-pnl ${pnlPct>=0?'gain':'loss'}">${pnlPct>=0?'+':''}${pnlPct.toFixed(1)}%</span>
      </div>
      <div class="mca-prices">
        <span>Mua: <strong>${F.usd(h.cost)}</strong></span>
        <span>Hiện tại: <strong>${F.usd(cp)}</strong></span>
        <span>Giá trị: <strong>${F.usd(cp*h.qty)}</strong></span>
      </div>
      ${action?`<div class="sig-action-box ${actionClass}">👉 <strong>${action}</strong></div>`:''}
      <div class="mca-reason">${reason}</div>
    </div>`;
  }).join('');

  el.innerHTML=html;
}

function updateBadges(){
  const sb=$('signalBadge'),ab=$('alertBadge');
  const bc=S.signals.filter(s=>s.signal.includes('BUY')).length;
  if(sb){sb.textContent=bc;sb.classList.toggle('show',bc>0)}
  const ac=S.alerts.filter(a=>Date.now()-a.time<3600000).length;
  if(ab){ab.textContent=ac;ab.classList.toggle('show',ac>0)}
}

window.togFav=function(id){const i=S.favs.indexOf(id);if(i>=0)S.favs.splice(i,1);else S.favs.push(id);saveF();renderMarket()};
window.delHolding=function(id){S.holdings=S.holdings.filter(h=>h.id!==id);saveH();renderPortfolio();toast('Đã xoá','info')};

// Binance event handlers
async function handleBnConnect(){
  const key=$('bnApiKey')?.value?.trim();
  const secret=$('bnApiSecret')?.value?.trim();
  if(!key||!secret){toast('Nhập đầy đủ API Key và Secret Key','error');return}
  const btn=$('btnBnConnect');
  if(btn){btn.disabled=true;btn.textContent='⏳ Đang kết nối...'}
  await connectBinance(key,secret);
  if(btn){btn.disabled=false;btn.textContent='🔗 Kết nối Binance'}
  if(S.binanceOn){fetchBinanceOrders().then(renderBinanceOrders)}
}

async function handleSyncBinance(){
  if(!S.binanceOn){toast('Cần kết nối Binance trước','error');return}
  await fetchBinanceAccount();
  await fetchBinancePrices();
  let added=0;
  S.binance.balances.forEach(b=>{
    if(b.asset==='USDT'||b.asset==='BUSD'||b.asset==='USDC'||b.asset==='FDUSD')return;
    if(b.total<=0)return;
    // Check if already in holdings
    const exists=S.holdings.find(h=>h.symbol===b.asset||h.symbolLower===b.asset.toLowerCase());
    if(exists)return;
    const price=S.tickerMap[b.asset+'USDT']||0;
    if(price<=0)return;
    const coinId=b.asset.toLowerCase();
    const cgCoin=S.crypto.find(c=>c.symbol===coinId);
    S.holdings.push({
      id:Date.now().toString()+added,type:'crypto',
      symbol:cgCoin?cgCoin.id:coinId,symbolLower:coinId,
      name:cgCoin?cgCoin.name:b.asset,
      qty:b.total,cost:price,sl:7,tp:20
    });
    added++;
  });
  if(added>0){saveH();renderPortfolio();toast(`✅ Đã đồng bộ ${added} coins từ Binance!`,'success')}
  else toast('Tất cả coin Binance đã có trong danh mục','info');
}

// ═══════════════════════════════════════════════════════
// MAIN SCAN LOOP
// ═══════════════════════════════════════════════════════
async function fullScan(){
  try{
    const btn=$('btnRefresh');if(btn)btn.classList.add('spinning');
    const sg=$('signalGrid');
    if(sg)sg.innerHTML='<div class="empty-msg">⏳ Đang tải dữ liệu thị trường...</div>';

    // Fetch data (with error handling)
    await Promise.allSettled([fetchCrypto(),fetchGlobal(),fetchFNG()]);
    fetchTrending().catch(()=>{});

    // Fetch live prices for holdings from Binance
    try{await fetchHoldingPrices()}catch(e){console.error('fetchHoldingPrices:',e)}

    if(S.binanceOn){
      fetchBinanceAccount().catch(()=>{});
      fetchBinancePrices().catch(()=>{});
      fetchBinanceOrders().catch(()=>{});
    }

    // AI scan (the heavy part)
    try{await aiScanPro()}catch(e){console.error('aiScanPro error:',e)}

    // Alert checks
    try{checkStopLossTP();checkTrailingSL();checkCustomPriceAlerts();checkVolatility();checkFNG()}catch(e){console.error('Alert check error:',e)}

    // Update time
    const ht=$('hdrTime');if(ht)ht.textContent=F.date()+' • '+F.time();

    // Render everything safely
    try{renderDash()}catch(e){console.error('renderDash:',e)}
    try{renderSignals()}catch(e){console.error('renderSignals:',e)}
    try{renderMarket()}catch(e){console.error('renderMarket:',e)}
    try{renderPortfolio()}catch(e){console.error('renderPortfolio:',e)}
    try{renderMyCoinsAlerts()}catch(e){console.error('renderMyCoinsAlerts:',e)}
    try{renderAlerts()}catch(e){console.error('renderAlerts:',e)}

    if(btn)btn.classList.remove('spinning');
    console.log('✅ fullScan done —',S.signals.length,'signals,',S.crypto.length,'coins');
  }catch(e){
    console.error('fullScan crash:',e);
    const btn=$('btnRefresh');if(btn)btn.classList.remove('spinning');
  }
}

function init(){
  // Safe event binder
  const on=(id,ev,fn)=>{const el=$(id);if(el)el.addEventListener(ev,fn);else console.warn('Missing:',id)};

  loadLS();initNotif();
  const ht=$('hdrTime');if(ht){ht.textContent=F.date()+' • '+F.time();setInterval(()=>{ht.textContent=F.date()+' • '+F.time()},1000)}

  $$('.nav-item').forEach(n=>n.addEventListener('click',()=>switchTab(n.dataset.tab)));
  $$('[data-goto]').forEach(l=>l.addEventListener('click',()=>switchTab(l.dataset.goto)));
  on('btnRefresh','click',fullScan);
  on('btnNotif','click',requestNotif);
  on('mClose','click',()=>$('modal').classList.remove('open'));
  on('modal','click',e=>{if(e.target===$('modal'))$('modal').classList.remove('open')});

  // Market search
  on('mktSearch','input',e=>{S.mktSearch=e.target.value;renderMarket()});

  // Signal filter
  $$('#sigChips .chip').forEach(c=>c.addEventListener('click',()=>{$$('#sigChips .chip').forEach(x=>x.classList.remove('on'));c.classList.add('on');S.sigFilter=c.dataset.sf;renderSignals()}));

  // Add holding form
  const af=$('addForm');
  if(af)af.addEventListener('submit',e=>{
    e.preventDefault();
    const sym=$('addSymbol').value.trim().toUpperCase(),qty=+$('addQty').value,cost=+$('addCost').value,sl=+$('addSL').value||7,tp=+$('addTP').value||20;
    if(!sym||!qty||!cost){toast('Nhập đầy đủ thông tin','error');return}
    const name=sym;
    S.holdings.push({id:Date.now().toString(),type:'crypto',symbol:sym,symbolLower:sym.toLowerCase(),name,qty,cost,sl,tp});
    saveH();renderPortfolio();toast('✅ Đã thêm '+name,'success');
    $('addSymbol').value='';$('addQty').value='';$('addCost').value='';$('addSymbol').focus();
  });
  on('btnClearPort','click',()=>{if(!S.holdings.length)return;if(confirm('Xoá toàn bộ danh mục?')){S.holdings=[];saveH();renderPortfolio();toast('Đã xoá tất cả','info')}});
  on('btnClearAlerts','click',()=>{S.alerts=[];saveA();renderAlerts();updateBadges();toast('Đã xoá cảnh báo','info')});

  // AI Allocation (optional)
  const btnAlloc=$('btnAllocate');if(btnAlloc)btnAlloc.addEventListener('click',aiAllocate);

  // Binance connect
  const btnBnConnect=$('btnBnConnect');
  if(btnBnConnect)btnBnConnect.addEventListener('click',handleBnConnect);

  // Binance sync
  on('btnSyncBinance','click',handleSyncBinance);

  // Refresh alerts button
  const btnRA=$('btnRefreshAlerts');if(btnRA)btnRA.addEventListener('click',()=>{renderMyCoinsAlerts();toast('Cảnh báo đã cập nhật','success')});

  // Binance refresh
  const btnRefreshBn=$('btnRefreshBn');
  if(btnRefreshBn)btnRefreshBn.addEventListener('click',async()=>{
    await fetchBinanceAccount();await fetchBinancePrices();await fetchBinanceOrders();
    renderBinanceBalance();renderBinanceOrders();toast('✅ Đã refresh Binance','success');
  });

  // Binance disconnect
  const btnDisc=$('btnBnDisconnect');
  if(btnDisc)btnDisc.addEventListener('click',()=>{if(confirm('Ngắt kết nối Binance?'))disconnectBinance()});

  // Trade form
  on('tradeType','change',e=>{
    const pw=$('tradePriceWrap');if(pw)pw.style.display=e.target.value==='LIMIT'?'':'none';
  });
  // Hide price field initially (MARKET default)
  if($('tradePriceWrap'))$('tradePriceWrap').style.display='none';

  on('btnTradeBuy','click',()=>submitTrade('BUY'));
  on('btnTradeSell','click',()=>submitTrade('SELL'));

  // Trade history
  on('btnLoadHistory','click',async()=>{
    const sym=$('historySymbol').value.trim().toUpperCase();
    if(!sym){toast('Nhập cặp giao dịch','error');return}
    await fetchBinanceTrades(sym);renderBinanceHistory();
  });

  // Settings toggles
  const toggles=[['togSound','sound'],['togAutoScan','autoScan'],['togHighConf','highConf'],['togVolatility','volatility'],['togFng','fngAlert'],['togStoploss','stoploss'],['togTakeprofit','takeprofit'],['togTrailingSL','trailingSL']];
  toggles.forEach(([id,key])=>{const el=$(id);if(el){el.checked=S.settings[key];el.addEventListener('change',()=>{S.settings[key]=el.checked;saveS();if(key==='autoScan'){if(S.settings.autoScan){S.scanTimer=setInterval(fullScan,300000);toast('Scanner: BẬT','success')}else{clearInterval(S.scanTimer);toast('Scanner: TẮT','info')}}})}});

  // Trailing SL % input
  const trailInput=$('trailPctInput');
  if(trailInput){trailInput.value=S.settings.trailPct||5;trailInput.addEventListener('change',()=>{S.settings.trailPct=parseFloat(trailInput.value)||5;saveS();toast('Trailing SL: '+S.settings.trailPct+'%','info')})}

  // Custom Price Alerts
  on('btnAddPA','click',()=>{
    const coin=$('paCoin').value.trim();const dir=$('paDirection').value;const price=parseFloat($('paPrice').value);
    if(!coin||!price||price<=0){toast('Nhập đầy đủ coin + giá','error');return}
    S.customPriceAlerts.push({id:Date.now(),coinId:coin.toLowerCase(),direction:dir,price,triggered:false,created:Date.now()});
    savePA();renderPriceAlerts();
    $('paCoin').value='';$('paPrice').value='';
    toast(`✅ Đã thêm: ${coin.toUpperCase()} ${dir==='above'?'≥':'≤'} $${price}`,'success');
  });

  // Risk Calculator
  on('btnCalcRisk','click',()=>{
    const cap=parseFloat($('rcCapital').value);const risk=parseFloat($('rcRisk').value);
    const entry=parseFloat($('rcEntry').value);const sl=parseFloat($('rcSL').value);
    if(!cap||!risk||!entry||!sl){toast('Nhập đầy đủ 4 trường','error');return}
    const r=calcPositionSize(cap,risk,entry,sl);
    if(!r){toast('Giá vào lệnh và SL không hợp lệ','error');return}
    const warn=parseFloat(r.positionPct)>30;
    $('rcResult').innerHTML=`
      <strong>Kết quả tính toán:</strong><br>
      💰 Số tiền rủi ro: <span class="rc-val">${F.usd(r.riskAmount)}</span> (${risk}% của ${F.usd(cap)})<br>
      📏 Khoảng cách SL: <span class="rc-val">${r.slDistPct}%</span> (${F.usd(Math.abs(entry-sl))})<br>
      📊 Số lượng mua: <span class="rc-val">${r.qty}</span> coin<br>
      💎 Giá trị vị thế: <span class="rc-val">${F.usd(r.positionValue)}</span> (${r.positionPct}% vốn)${warn?'<br><span class="rc-warn">⚠️ Vị thế lớn hơn 30% vốn — rủi ro cao!</span>':''}
    `;
  });

  // Gemini AI
  const btnAI=$('btnAskAI');if(btnAI)btnAI.addEventListener('click',askGeminiAI);
  const btnGC=$('btnGeminiConnect');if(btnGC)btnGC.addEventListener('click',connectGemini);

  // Backend URL config (for Android)
  const buInput=$('backendUrl');if(buInput)buInput.value=BACKEND;
  const biInfo=$('backendInfo');if(biInfo)biInfo.textContent='Server: '+BACKEND;
  on('btnSaveBackend','click',async()=>{
    const url=$('backendUrl').value.trim().replace(/\/$/,'');
    if(!url){toast('Nhập URL server','error');return}
    const res=$('backendTestResult');
    res.innerHTML='⏳ Đang test kết nối...';
    try{
      const r=await fetch(url+'/api/binance/status',{signal:AbortSignal.timeout(5000)});
      const j=await r.json();
      if(j.success){
        localStorage.setItem('cai4_backend',url);
        BACKEND=url;
        res.innerHTML='<span style="color:var(--green2)">✅ Kết nối OK! Đang reload...</span>';
        if(biInfo)biInfo.textContent='Server: '+url;
        setTimeout(()=>location.reload(),1000);
      }else{res.innerHTML='<span style="color:var(--red2)">❌ Server phản hồi lỗi</span>'}
    }catch(e){res.innerHTML='<span style="color:var(--red2)">❌ Không kết nối được: '+e.message+'</span>'}
  });

  // Keyboard shortcuts
  document.addEventListener('keydown',e=>{
    if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;
    if(e.key==='r'||e.key==='R'){e.preventDefault();fullScan()}
    if(e.key==='Escape')$('modal').classList.remove('open');
  });

  // Check backend + auto reconnect Binance + check Gemini
  checkBackend().then(j=>{
    if(j&&j.connected){
      S.binanceOn=true;
      fetchBinanceAccount().then(()=>{fetchBinancePrices();fetchBinanceOrders()});
    }
    updConn();
  });
  // Check Gemini status
  fetch(BACKEND+'/api/ai/status').then(r=>r.json()).then(j=>{if(j.connected){geminiConnected=true;updateGeminiStatus()}}).catch(()=>{});

  // Start
  fullScan();
  if(S.settings.autoScan)S.scanTimer=setInterval(fullScan,300000);
}

async function submitTrade(side){
  if(!S.binanceOn){toast('Kết nối Binance trước','error');return}
  const symbol=$('tradeSymbol').value.trim().toUpperCase();
  const type=$('tradeType').value;
  const qty=$('tradeQty').value;
  const price=$('tradePrice').value;
  const quoteQty=$('tradeQuoteQty').value;

  if(!symbol){toast('Nhập cặp giao dịch','error');return}
  if(!qty&&!quoteQty){toast('Nhập số lượng hoặc số tiền USDT','error');return}

  const confirmMsg=`${side==='BUY'?'🟢 MUA':'🔴 BÁN'} ${symbol}\nLoại: ${type}\n${qty?'Số lượng: '+qty:'Số tiền: '+quoteQty+' USDT'}\n${type==='LIMIT'?'Giá: '+price+' USDT':''}\n\nXác nhận?`;
  if(!confirm(confirmMsg))return;

  const opts={};
  if(qty)opts.quantity=qty;
  if(quoteQty&&!qty)opts.quoteOrderQty=quoteQty;
  if(type==='LIMIT'&&price)opts.price=price;

  const resultDiv=$('tradeResult');
  resultDiv.innerHTML='<div class="trade-pending">⏳ Đang xử lý...</div>';

  const j=await placeBinanceOrder(symbol,side,type,opts);
  if(j&&j.success){
    const d=j.data;
    resultDiv.innerHTML=`<div class="trade-success">✅ <strong>${d.side} ${d.symbol}</strong> — ${d.status}<br>Số lượng: ${d.origQty} | Đã khớp: ${d.executedQty}${d.fills?.length?'<br>Giá trung bình: '+F.usd(d.fills.reduce((a,f)=>a+parseFloat(f.price)*parseFloat(f.qty),0)/d.fills.reduce((a,f)=>a+parseFloat(f.qty),0)):''}</div>`;
  }else{
    resultDiv.innerHTML=`<div class="trade-error">❌ ${j?.error||'Lỗi không xác định'}</div>`;
  }
}


// Global error handler — shows errors on screen
window.onerror=function(msg,src,line){
  console.error('JS Error:',msg,'at',src,':',line);
  return false;
};
window.addEventListener('unhandledrejection',e=>{
  console.error('Promise error:',e.reason);
});

document.addEventListener('DOMContentLoaded',()=>{
  try{init()}catch(e){
    console.error('Init crash:',e);
    document.body.innerHTML='<div style="padding:40px;color:#ef4444;font-family:monospace"><h2>❌ App Init Error</h2><pre>'+e.message+'</pre><p>Check console (F12) for details.</p></div>';
  }
});
