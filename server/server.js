/**
 * CryptoAI Backend — Binance API Proxy Server
 * Handles HMAC SHA256 signing + CORS for secure Binance API access
 * 
 * Endpoints:
 *   POST /api/binance/connect     — Save API Key + Secret
 *   GET  /api/binance/status      — Check connection
 *   GET  /api/binance/account     — Spot balance
 *   GET  /api/binance/orders      — Open orders (all or by symbol)
 *   GET  /api/binance/trades      — Trade history
 *   POST /api/binance/order       — Place new order (BUY/SELL)
 *   DELETE /api/binance/order     — Cancel order
 *   GET  /api/binance/ticker      — All ticker prices
 *   POST /api/binance/disconnect  — Clear credentials
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { setGeminiKey } = require('./services/ai/aiClient');
const { generateRecommendationsFromCandidates } = require('./services/ai/coinRecommendationEngine');
const { generateSmartAlert } = require('./services/ai/priceAlertEngine');

const app = express();
const PORT = process.env.PORT || 8001;
const BINANCE_BASE = 'https://api.binance.com';
const WEB_DIR = path.join(__dirname, '..', 'web');

// ═══════════════════════════════════════════════════════
// PERSISTENT STORAGE — Lưu tất cả vào file trên máy
// ═══════════════════════════════════════════════════════
const DATA_DIR = path.join(__dirname, 'data');
const CRED_FILE = path.join(DATA_DIR, 'credentials.json');

// Tạo thư mục data nếu chưa có
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadCredentials() {
  try {
    if (fs.existsSync(CRED_FILE)) {
      const data = JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'));
      console.log('  📂 Đã tải credentials từ', CRED_FILE);
      return data;
    }
  } catch (e) { console.error('  ⚠️ Lỗi đọc credentials:', e.message); }
  return { binance: { apiKey: null, apiSecret: null, connected: false }, geminiKey: null };
}

function saveCredentials() {
  try {
    fs.writeFileSync(CRED_FILE, JSON.stringify({
      binance: { apiKey: credentials.apiKey, apiSecret: credentials.apiSecret, connected: credentials.connected },
      geminiKey: geminiKey
    }, null, 2), 'utf8');
    console.log('  💾 Đã lưu credentials');
  } catch (e) { console.error('  ⚠️ Lỗi lưu:', e.message); }
}

// Load on startup — env vars override file (for cloud deploy)
const savedData = loadCredentials();
let credentials = {
  apiKey: process.env.BINANCE_API_KEY || savedData.binance?.apiKey || null,
  apiSecret: process.env.BINANCE_API_SECRET || savedData.binance?.apiSecret || null,
  connected: !!(process.env.BINANCE_API_KEY || savedData.binance?.apiKey)
};
let geminiKey = process.env.GEMINI_API_KEY || savedData.geminiKey || null;
if (geminiKey) setGeminiKey(geminiKey);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve static web files
if (fs.existsSync(WEB_DIR)) {
  app.use(express.static(WEB_DIR));
  console.log('  📁 Serving web from:', WEB_DIR);
}

// ═══════════════════════════════════════════════════════
// BINANCE API HELPERS
// ═══════════════════════════════════════════════════════
function sign(queryString) {
  return crypto
    .createHmac('sha256', credentials.apiSecret)
    .update(queryString)
    .digest('hex');
}

async function binanceRequest(method, endpoint, params = {}, signed = true) {
  if (!credentials.apiKey || !credentials.apiSecret) {
    throw new Error('Chưa kết nối Binance. Vui lòng nhập API Key.');
  }

  const url = new URL(BINANCE_BASE + endpoint);
  
  if (signed) {
    params.timestamp = Date.now();
    params.recvWindow = 10000;
  }

  const queryString = new URLSearchParams(params).toString();

  if (signed) {
    const signature = sign(queryString);
    if (method === 'GET' || method === 'DELETE') {
      url.search = queryString + '&signature=' + signature;
    }
  } else {
    if (method === 'GET') {
      url.search = queryString;
    }
  }

  const headers = { 'X-MBX-APIKEY': credentials.apiKey };
  const options = { method, headers };

  if ((method === 'POST' || method === 'PUT') && signed) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = queryString + '&signature=' + sign(queryString);
  }

  const response = await fetch(url.toString(), options);
  const data = await response.json();

  if (data.code && data.code < 0) {
    throw new Error(data.msg || `Binance Error ${data.code}`);
  }

  return data;
}

// ═══════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════

// Connect — Save API Key + Secret
app.post('/api/binance/connect', async (req, res) => {
  try {
    const { apiKey, apiSecret } = req.body;
    if (!apiKey || !apiSecret) {
      return res.json({ success: false, error: 'Thiếu API Key hoặc Secret Key' });
    }

    // Temporarily set credentials to test
    credentials = { apiKey, apiSecret, connected: false };

    // Test connection by fetching account info
    const account = await binanceRequest('GET', '/api/v3/account');
    
    credentials.connected = true;
    saveCredentials(); // Lưu Binance key vào máy
    
    // Return basic account info (no sensitive data)
    const balances = account.balances
      .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map(b => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked)
      }));

    res.json({
      success: true,
      data: {
        canTrade: account.canTrade,
        canDeposit: account.canDeposit,
        canWithdraw: account.canWithdraw,
        accountType: account.accountType,
        balances,
        totalAssets: balances.length
      }
    });
  } catch (err) {
    credentials = { apiKey: null, apiSecret: null, connected: false };
    res.json({ success: false, error: err.message });
  }
});

// Disconnect
app.post('/api/binance/disconnect', (req, res) => {
  credentials = { apiKey: null, apiSecret: null, connected: false };
  saveCredentials(); // Xóa key khỏi file
  res.json({ success: true });
});

// Connection status
app.get('/api/binance/status', (req, res) => {
  res.json({
    success: true,
    connected: credentials.connected,
    hasKey: !!credentials.apiKey
  });
});

// Account — Spot balances
app.get('/api/binance/account', async (req, res) => {
  try {
    const account = await binanceRequest('GET', '/api/v3/account');
    const balances = account.balances
      .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map(b => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
        total: parseFloat(b.free) + parseFloat(b.locked)
      }));

    res.json({ success: true, data: { balances, canTrade: account.canTrade } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Portfolio — balance + live prices in one call
app.get('/api/binance/portfolio', async (req, res) => {
  try {
    const account = await binanceRequest('GET', '/api/v3/account');
    const allPrices = await getAllBinancePrices();
    const balances = account.balances
      .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map(b => {
        const asset = b.asset;
        const free = parseFloat(b.free);
        const locked = parseFloat(b.locked);
        const total = free + locked;
        let usdValue = 0;
        let price = 0;
        if (['USDT','BUSD','USDC','FDUSD','DAI'].includes(asset)) { price = 1; usdValue = total; }
        else if (allPrices[asset + 'USDT']) { price = allPrices[asset + 'USDT']; usdValue = total * price; }
        else if (allPrices[asset + 'BUSD']) { price = allPrices[asset + 'BUSD']; usdValue = total * price; }
        else if (allPrices[asset + 'FDUSD']) { price = allPrices[asset + 'FDUSD']; usdValue = total * price; }
        else if (allPrices[asset + 'BTC'] && allPrices['BTCUSDT']) { price = allPrices[asset + 'BTC'] * allPrices['BTCUSDT']; usdValue = total * price; }
        return { asset, free, locked, total, price, usdValue };
      })
      .filter(b => b.usdValue >= 0.01)
      .sort((a, b) => b.usdValue - a.usdValue);
    const totalUSD = balances.reduce((s, b) => s + b.usdValue, 0);
    res.json({ success: true, balances, totalUSD, timestamp: Date.now() });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Open Orders
app.get('/api/binance/orders', async (req, res) => {
  try {
    const params = {};
    if (req.query.symbol) params.symbol = req.query.symbol.toUpperCase();
    
    const orders = await binanceRequest('GET', '/api/v3/openOrders', params);
    
    const formatted = orders.map(o => ({
      orderId: o.orderId,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      price: parseFloat(o.price),
      origQty: parseFloat(o.origQty),
      executedQty: parseFloat(o.executedQty),
      status: o.status,
      time: o.time,
      stopPrice: parseFloat(o.stopPrice) || null
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Trade History
app.get('/api/binance/trades', async (req, res) => {
  try {
    const symbol = (req.query.symbol || 'BTCUSDT').toUpperCase();
    const limit = parseInt(req.query.limit) || 50;
    
    const trades = await binanceRequest('GET', '/api/v3/myTrades', { symbol, limit });
    
    const formatted = trades.map(t => ({
      id: t.id,
      symbol: t.symbol,
      price: parseFloat(t.price),
      qty: parseFloat(t.qty),
      quoteQty: parseFloat(t.quoteQty),
      side: t.isBuyer ? 'BUY' : 'SELL',
      time: t.time,
      commission: parseFloat(t.commission),
      commissionAsset: t.commissionAsset
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Place Order (BUY/SELL)
app.post('/api/binance/order', async (req, res) => {
  try {
    const { symbol, side, type, quantity, price, quoteOrderQty, stopPrice, timeInForce } = req.body;

    if (!symbol || !side) {
      return res.json({ success: false, error: 'Thiếu symbol hoặc side (BUY/SELL)' });
    }

    const params = {
      symbol: symbol.toUpperCase(),
      side: side.toUpperCase(),
      type: (type || 'MARKET').toUpperCase()
    };

    // LIMIT order requires price + timeInForce
    if (params.type === 'LIMIT') {
      if (!price) return res.json({ success: false, error: 'Lệnh LIMIT cần có giá (price)' });
      params.price = price;
      params.timeInForce = timeInForce || 'GTC';
    }

    // STOP_LOSS_LIMIT requires stopPrice
    if (params.type === 'STOP_LOSS_LIMIT' || params.type === 'TAKE_PROFIT_LIMIT') {
      if (!stopPrice || !price) return res.json({ success: false, error: 'Cần stopPrice và price' });
      params.stopPrice = stopPrice;
      params.price = price;
      params.timeInForce = timeInForce || 'GTC';
    }

    // Quantity: either exact qty or quoteOrderQty (for MARKET buy by USDT amount)
    if (quantity) {
      params.quantity = quantity;
    } else if (quoteOrderQty && params.type === 'MARKET') {
      params.quoteOrderQty = quoteOrderQty;
    } else {
      return res.json({ success: false, error: 'Cần quantity hoặc quoteOrderQty' });
    }

    const order = await binanceRequest('POST', '/api/v3/order', params);

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        price: order.price,
        origQty: order.origQty,
        executedQty: order.executedQty,
        status: order.status,
        fills: order.fills || []
      }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Cancel Order
app.delete('/api/binance/order', async (req, res) => {
  try {
    const { symbol, orderId } = req.query;
    if (!symbol || !orderId) {
      return res.json({ success: false, error: 'Cần symbol và orderId' });
    }

    const result = await binanceRequest('DELETE', '/api/v3/order', {
      symbol: symbol.toUpperCase(),
      orderId: parseInt(orderId)
    });

    res.json({ success: true, data: { orderId: result.orderId, status: result.status } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Ticker prices (no auth needed)
app.get('/api/binance/ticker', async (req, res) => {
  try {
    const data = await binanceRequest('GET', '/api/v3/ticker/price', {}, false);
    // Filter USDT pairs
    const usdt = data.filter(t => t.symbol.endsWith('USDT')).map(t => ({
      symbol: t.symbol,
      price: parseFloat(t.price)
    }));
    res.json({ success: true, data: usdt });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Get Orderbook Depth for a symbol (Imbalance calculation)
app.get('/api/binance/depth', async (req, res) => {
  try {
    const symbol = (req.query.symbol || 'BTCUSDT').toUpperCase();
    const limit = parseInt(req.query.limit) || 100;
    const data = await binanceRequest('GET', '/api/v3/depth', { symbol, limit }, false);
    res.json({ success: true, bids: data.bids, asks: data.asks });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Exchange Info (for trading rules — lot size, min notional, etc.)
app.get('/api/binance/exchangeInfo', async (req, res) => {
  try {
    const symbol = req.query.symbol;
    const params = symbol ? { symbol: symbol.toUpperCase() } : {};
    // Only fetch specific symbols to avoid huge response
    if (!symbol) {
      params.symbols = JSON.stringify(['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','DOTUSDT','MATICUSDT']);
    }
    const data = await binanceRequest('GET', '/api/v3/exchangeInfo', params, false);
    const formatted = (data.symbols || []).map(s => ({
      symbol: s.symbol,
      status: s.status,
      baseAsset: s.baseAsset,
      quoteAsset: s.quoteAsset,
      filters: s.filters
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// PUBLIC MARKET DATA (no auth needed)
// ═══════════════════════════════════════════════════════

// Candlestick/Klines — real OHLCV data
app.get('/api/market/klines', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', interval = '1h', limit = 100 } = req.query;
    const url = `${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!Array.isArray(data)) return res.json({ success: false, error: 'Invalid response' });
    const candles = data.map(k => ({
      t: k[0], o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]),
      c: parseFloat(k[4]), v: parseFloat(k[5]), ct: k[6], qv: parseFloat(k[7]),
      trades: k[8], tbav: parseFloat(k[9]), tbqv: parseFloat(k[10])
    }));
    res.json({ success: true, data: candles });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// 24h Ticker — price change, volume, high/low
app.get('/api/market/ticker24h', async (req, res) => {
  try {
    const { symbols } = req.query;
    let url = `${BINANCE_BASE}/api/v3/ticker/24hr`;
    if (symbols) url += `?symbols=${encodeURIComponent(symbols)}`;
    const r = await fetch(url);
    const data = await r.json();
    const items = (Array.isArray(data) ? data : [data])
      .filter(t => t.symbol && t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 100000)
      .map(t => ({
        symbol: t.symbol, price: parseFloat(t.lastPrice),
        change: parseFloat(t.priceChangePercent), volume: parseFloat(t.quoteVolume),
        high: parseFloat(t.highPrice), low: parseFloat(t.lowPrice),
        trades: parseInt(t.count), open: parseFloat(t.openPrice)
      }));
    res.json({ success: true, data: items });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// Order Book Depth
app.get('/api/market/depth', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT', limit = 20 } = req.query;
    const url = `${BINANCE_BASE}/api/v3/depth?symbol=${symbol}&limit=${limit}`;
    const r = await fetch(url);
    const data = await r.json();
    const totalBid = data.bids.reduce((s, b) => s + parseFloat(b[0]) * parseFloat(b[1]), 0);
    const totalAsk = data.asks.reduce((s, a) => s + parseFloat(a[0]) * parseFloat(a[1]), 0);
    res.json({ success: true, data: { bids: data.bids, asks: data.asks, bidTotal: totalBid, askTotal: totalAsk, ratio: totalBid / (totalAsk || 1) } });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// Top Gainers & Losers
app.get('/api/market/movers', async (req, res) => {
  try {
    const r = await fetch(`${BINANCE_BASE}/api/v3/ticker/24hr`);
    const data = await r.json();
    const usdt = data.filter(t => t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 500000 && !t.symbol.includes('UP') && !t.symbol.includes('DOWN'))
      .map(t => ({ symbol: t.symbol, price: parseFloat(t.lastPrice), change: parseFloat(t.priceChangePercent), volume: parseFloat(t.quoteVolume) }));
    usdt.sort((a, b) => b.change - a.change);
    res.json({ success: true, gainers: usdt.slice(0, 10), losers: usdt.slice(-10).reverse() });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// Multi-timeframe analysis for a symbol
app.get('/api/market/analyze', async (req, res) => {
  try {
    const { symbol = 'BTCUSDT' } = req.query;
    // limit >=150 để đủ dữ liệu tính MA(99) (cần tối thiểu 99 nến) trên cả 3 khung thời gian
    const [h1, h4, d1] = await Promise.all([
      fetch(`${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=1h&limit=150`).then(r => r.json()),
      fetch(`${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=4h&limit=150`).then(r => r.json()),
      fetch(`${BINANCE_BASE}/api/v3/klines?symbol=${symbol}&interval=1d&limit=150`).then(r => r.json())
    ]);
    const parse = arr => (Array.isArray(arr) ? arr : []).map(k => ({
      t: k[0], o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]),
      c: parseFloat(k[4]), v: parseFloat(k[5])
    }));
    res.json({ success: true, data: { '1h': parse(h1), '4h': parse(h4), '1d': parse(d1), symbol } });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════════════════
// BATCH PRICE LOOKUP — tránh CORS browser
// ═══════════════════════════════════════════════════════
// Cache all Binance prices (refresh every 5s)
let allPricesCache = { data: {}, ts: 0 };
async function getAllBinancePrices() {
  if (Date.now() - allPricesCache.ts < 5000 && Object.keys(allPricesCache.data).length > 0) return allPricesCache.data;
  try {
    const r = await fetch(`${BINANCE_BASE}/api/v3/ticker/price`);
    if (!r.ok) return allPricesCache.data;
    const tickers = await r.json();
    const map = {};
    tickers.forEach(t => { map[t.symbol] = parseFloat(t.price); });
    allPricesCache = { data: map, ts: Date.now() };
    return map;
  } catch (e) { console.error('getAllBinancePrices error:', e.message); return allPricesCache.data; }
}

app.get('/api/market/prices', async (req, res) => {
  try {
    const symbols = (req.query.symbols || '').split(',').filter(Boolean);
    if (!symbols.length) return res.json({ success: false, error: 'No symbols' });
    const allPrices = await getAllBinancePrices();
    const prices = {};
    symbols.forEach(sym => {
      const pair = sym.toUpperCase() + 'USDT';
      if (allPrices[pair]) prices[sym.toUpperCase()] = allPrices[pair];
      // Try BUSD/FDUSD fallback
      else if (allPrices[sym.toUpperCase() + 'BUSD']) prices[sym.toUpperCase()] = allPrices[sym.toUpperCase() + 'BUSD'];
      else if (allPrices[sym.toUpperCase() + 'FDUSD']) prices[sym.toUpperCase()] = allPrices[sym.toUpperCase() + 'FDUSD'];
    });
    res.json({ success: true, prices, source: 'binance_bulk', cached: Date.now() - allPricesCache.ts < 1000 });
  } catch (err) { res.json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════════════════
// GEMINI AI INTEGRATION (Free tier — 15 RPM)
// ═══════════════════════════════════════════════════════
// geminiKey đã load từ file ở trên

app.post('/api/ai/connect', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || apiKey.length < 20) return res.json({ success: false, error: 'API Key không hợp lệ' });
  geminiKey = apiKey;
  setGeminiKey(apiKey);
  saveCredentials(); // Lưu Gemini key vào máy
  res.json({ success: true, message: 'Đã kết nối Gemini AI' });
});

app.get('/api/ai/status', (req, res) => {
  res.json({ connected: !!geminiKey });
});

app.post('/api/ai/analyze', async (req, res) => {
  if (!geminiKey) return res.json({ success: false, error: 'Chưa kết nối Gemini AI. Vào Cài đặt nhập API Key.' });

  const { marketData } = req.body;
  if (!marketData) return res.json({ success: false, error: 'Không có dữ liệu thị trường' });

  const prompt = `Bạn là chuyên gia phân tích kỹ thuật crypto (technical analyst), làm việc CHỈ dựa trên dữ liệu định lượng được cung cấp — không suy đoán, không bịa số liệu ngoài dữ liệu.

DỮ LIỆU THỊ TRƯỜNG THẬT (tính từ nến Binance thật, đa khung 1H/4H/1D — RSI/MACD/MA/vùng hỗ trợ-kháng cự):
${marketData}

QUY TẮC BẮT BUỘC:
1. TUYỆT ĐỐI KHÔNG tự đặt ra giá Entry/Stop-loss/Target mới. Nếu dữ liệu đã có sẵn Entry/SL/Target cho một coin, chỉ được giải thích/đánh giá lại các mức đó (hợp lý hay rủi ro), KHÔNG thay bằng con số khác.
2. Nếu một coin không có tín hiệu MUA/BÁN rõ ràng trong dữ liệu, phải nói "chưa đủ điều kiện" — không tự suy diễn xu hướng khi thiếu dữ liệu.
3. Luận điểm phải bám vào chỉ báo cụ thể: RSI (>70 quá mua, <30 quá bán), MACD (histogram dương/âm), vị trí giá so với MA25/MA99, Fear & Greed Index. Mỗi khuyến nghị phải nêu rõ ĐANG DỰA VÀO chỉ báo nào.
4. Nếu 3 khung thời gian (1H/4H/1D) mâu thuẫn nhau, phải nói rõ mâu thuẫn đó thay vì chọn đại 1 phía.
5. Luôn nhắc: đây là phân tích kỹ thuật tự động, không phải lời khuyên đầu tư, thị trường crypto rủi ro cao và có thể đảo chiều đột ngột.

YÊU CẦU TRẢ LỜI:
1. Nhận định xu hướng BTC (dựa trên chỉ báo cụ thể trong dữ liệu, không đoán mò)
2. Điểm qua các tín hiệu MUA/BÁN đã có trong dữ liệu — giải thích NGẮN GỌN lý do hợp lý của từng mức Entry/SL/Target đã cho (không đổi số)
3. Đánh giá mức độ rủi ro thị trường chung (1-10) dựa trên Fear&Greed + độ đồng thuận giữa các khung thời gian
4. Lưu ý rủi ro cho nhà đầu tư vốn nhỏ ($100-$1000): ưu tiên quản trị rủi ro (không all-in, chia vốn) hơn là "chọn coin nào"

FORMAT: Tiếng Việt, ngắn gọn, dùng emoji vừa phải, chia mục rõ ràng. KHÔNG dùng markdown header (#).`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.35, maxOutputTokens: 1200 }
  });

  // Try models in order: 2.0-pro-exp → 1.5-pro → 2.0-flash → 1.5-flash
  const models = ['gemini-2.0-pro-exp', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (response.status === 429) {
        console.log(`  ⚠️ ${model} rate limited, thử model tiếp...`);
        continue; // Try next model
      }

      if (response.status === 404) {
        console.log(`  ⚠️ ${model} không tồn tại, thử model tiếp...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Gemini ${model} error:`, response.status, errText);
        if (response.status === 400 || response.status === 403) {
          return res.json({ success: false, error: 'API Key không hợp lệ hoặc bị chặn. Tạo key mới tại aistudio.google.com/apikey' });
        }
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;

      console.log(`  🧠 Gemini OK — model: ${model}`);
      return res.json({ success: true, analysis: text, model, timestamp: Date.now() });
    } catch (err) {
      console.error(`Gemini ${model} fetch error:`, err.message);
      continue;
    }
  }

  // All models failed
  res.json({ success: false, error: 'Tất cả model Gemini đều bị giới hạn. Đợi 1 phút rồi thử lại.' });
});

// Gợi ý AI (Recommendation Engine)
app.post('/api/ai/recommendations', async (req, res) => {
  if (!geminiKey) return res.json({ success: false, error: 'Chưa kết nối Gemini AI.' });
  const { candidates } = req.body;
  if (!candidates || !candidates.length) return res.json({ success: false, error: 'Không có dữ liệu' });

  try {
    const enriched = await generateRecommendationsFromCandidates(candidates, { maxCandidates: 15 });
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Cảnh báo thông minh (Smart Alerts)
app.post('/api/ai/smart-alerts', async (req, res) => {
  if (!geminiKey) return res.json({ success: false, error: 'Chưa kết nối Gemini AI.' });
  const { coinsData } = req.body;
  if (!coinsData || !Array.isArray(coinsData)) return res.json({ success: false, error: 'Không có dữ liệu hợp lệ' });

  try {
    const alerts = [];
    for (const coin of coinsData) {
      try {
        const result = await generateSmartAlert(coin);
        if (result) alerts.push(result);
      } catch (err) {
        console.error('Smart Alert error for', coin.symbol, err.message);
      }
    }
    res.json({ success: true, data: alerts });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Gemini Chat — multi-turn with portfolio context
app.post('/api/ai/chat', async (req, res) => {
  if (!geminiKey) return res.json({ success: false, error: 'Chưa kết nối Gemini AI. Vào Cài đặt nhập API Key.' });
  const { message, portfolioContext, history } = req.body;
  if (!message) return res.json({ success: false, error: 'Tin nhắn trống' });

  // Build system context
  const systemPrompt = `Bạn là CryptoAI — trợ lý phân tích kỹ thuật crypto, nói tiếng Việt.
Bạn có quyền truy cập dữ liệu THẬT từ ví Binance và các tín hiệu kỹ thuật (RSI/MACD/MA/Entry/SL/Target) đã được hệ thống tính toán sẵn từ nến thật, gửi kèm bên dưới.

QUY TẮC BẮT BUỘC:
- CHỈ dùng số liệu có trong dữ liệu được cung cấp. Nếu người dùng hỏi về giá vào lệnh/cắt lỗ/chốt lời của một coin đã có tín hiệu kèm số liệu cụ thể, hãy dùng ĐÚNG các con số đó, không tự đặt số khác.
- Nếu coin không có tín hiệu/dữ liệu kỹ thuật trong context, phải nói rõ "chưa có đủ dữ liệu để đưa ra mức giá cụ thể" thay vì đoán bừa.
- Mọi nhận định xu hướng phải nêu rõ dựa trên chỉ báo nào (RSI, MACD, vị trí so với MA25/MA99...).
- Luôn nhắc đây là phân tích kỹ thuật tự động, không phải lời khuyên tài chính, thị trường rủi ro cao.
Trả lời ngắn gọn, cụ thể, có số liệu thật. Dùng emoji vừa phải.

${portfolioContext || 'Chưa có dữ liệu portfolio.'}`;

  // Build conversation
  const contents = [];
  contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
  contents.push({ role: 'model', parts: [{ text: 'Tôi đã đọc dữ liệu ví Binance của bạn. Hỏi tôi bất cứ điều gì về danh mục đầu tư!' }] });

  // Add history
  if (history && history.length) {
    history.forEach(h => {
      contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] });
    });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  const body = JSON.stringify({
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 1500 }
  });

  const models = ['gemini-2.0-pro-exp', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (response.status === 429 || response.status === 404) continue;
      if (!response.ok) continue;
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      return res.json({ success: true, reply: text, model, timestamp: Date.now() });
    } catch { continue; }
  }
  res.json({ success: false, error: 'Gemini đang bận. Thử lại sau.' });
});


// ═══════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   🤖 CryptoAI Pro — Binance + Gemini AI ║');
  console.log('  ║   http://127.0.0.1:' + PORT + '                 ║');
  console.log('  ║   Market Data + Trading + AI Analysis    ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
  console.log('  📂 Dữ liệu lưu tại:', DATA_DIR);
  console.log('  💎 Binance:', credentials.apiKey ? '✅ Đã load key ('+credentials.apiKey.slice(0,8)+'...)' : '❌ Chưa kết nối');
  console.log('  🧠 Gemini:', geminiKey ? '✅ Đã load key ('+geminiKey.slice(0,8)+'...)' : '❌ Chưa kết nối');
  console.log('');
});
