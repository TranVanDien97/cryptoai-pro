import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import SignalCard from '../components/SignalCard';
import { fmt } from '../hooks/useLivePrices';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const BINANCE_API = 'https://api.binance.com/api/v3';

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcEMA(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emas: number[] = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    emas.push(closes[i] * k + emas[i - 1] * (1 - k));
  }
  return emas;
}

function calcMACD(closes: number[]): { macd: number; signal: number; hist: number } {
  if (closes.length < 26) return { macd: 0, signal: 0, hist: 0 };
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const macdEMA9 = calcEMA(macdLine.slice(-9), 9);
  const signal = macdEMA9[macdEMA9.length - 1];
  const macd = macdLine[macdLine.length - 1];
  return { macd, signal, hist: macd - signal };
}

async function analyzeSymbol(symbol: string, cgId: string, cgData: { current_price: number; price_change_percentage_24h: number; image: string; name: string; market_cap_rank: number }) {
  try {
    const klines = await fetch(`${BINANCE_API}/klines?symbol=${symbol}USDT&interval=4h&limit=60`).then(r => r.json());
    if (!Array.isArray(klines) || klines.length < 30) return null;

    const closes = klines.map((k: unknown[]) => parseFloat(k[4] as string));
    const volumes = klines.map((k: unknown[]) => parseFloat(k[5] as string));
    const lastClose = closes[closes.length - 1];
    const rsi = calcRSI(closes);
    const { macd, signal: macdSignal, hist } = calcMACD(closes);
    const ema20 = calcEMA(closes, 20);
    const ema50 = closes.length >= 50 ? calcEMA(closes, 50) : calcEMA(closes, 20);
    const lastEma20 = ema20[ema20.length - 1];
    const lastEma50 = ema50[ema50.length - 1];
    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const lastVol = volumes[volumes.length - 1];
    const volSpike = lastVol / avgVol;

    // Scoring
    let score = 0;
    const reasons: string[] = [];

    if (rsi < 30) { score += 3; reasons.push(`RSI ${rsi.toFixed(0)} vùng quá bán - cơ hội mua`); }
    else if (rsi < 40) { score += 1; reasons.push(`RSI ${rsi.toFixed(0)} tiếp cận vùng quá bán`); }
    else if (rsi > 70) { score -= 3; reasons.push(`RSI ${rsi.toFixed(0)} vùng quá mua - rủi ro điều chỉnh`); }
    else if (rsi > 60) { score -= 1; reasons.push(`RSI ${rsi.toFixed(0)} tiếp cận vùng quá mua`); }

    if (hist > 0 && macd > macdSignal) { score += 2; reasons.push('MACD histogram dương - momentum tăng'); }
    else if (hist < 0 && macd < macdSignal) { score -= 2; reasons.push('MACD histogram âm - momentum giảm'); }

    if (lastClose > lastEma20 && lastEma20 > lastEma50) { score += 2; reasons.push('Giá trên EMA20 và EMA50 - xu hướng tăng'); }
    else if (lastClose < lastEma20 && lastEma20 < lastEma50) { score -= 2; reasons.push('Giá dưới EMA20 và EMA50 - xu hướng giảm'); }

    if (volSpike > 2.5 && score > 0) { score += 1; reasons.push(`Volume đột biến x${volSpike.toFixed(1)} - tín hiệu mạnh`); }
    else if (volSpike > 2.5 && score < 0) { score -= 1; reasons.push(`Volume đột biến x${volSpike.toFixed(1)} kèm áp lực bán`); }

    const priceChange = cgData.price_change_percentage_24h || 0;
    if (priceChange > 10) { score -= 1; reasons.push(`Tăng ${priceChange.toFixed(1)}% trong 24h - cẩn thận FOMO`); }

    let sig: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
    if (score >= 4) sig = 'STRONG_BUY';
    else if (score >= 2) sig = 'BUY';
    else if (score <= -4) sig = 'STRONG_SELL';
    else if (score <= -2) sig = 'SELL';
    else sig = 'HOLD';

    const entry = lastClose;
    const atr = Math.abs(closes[closes.length - 1] - closes[closes.length - 2]) * 2;
    const sl = entry - (atr || entry * 0.05);
    const tp = entry + (atr * 2 || entry * 0.1);
    const tp2 = entry + (atr * 3.5 || entry * 0.18);
    const rrVal = atr > 0 ? ((tp - entry) / (entry - sl)).toFixed(1) : '2.0';
    const confidence = Math.min(90, Math.max(30, 50 + score * 10));

    return {
      id: cgId,
      symbol,
      name: cgData.name,
      image: cgData.image,
      signal: sig,
      confidence,
      entry,
      sl,
      tp,
      tp2,
      rr: rrVal,
      reasons,
      source: 'Binance+CG',
      rank: cgData.market_cap_rank,
      rsi: rsi.toFixed(0),
      score,
    };
  } catch {
    return null;
  }
}

export default function SignalsPage() {
  const { signals, setSignals, isScanning, setScanning, lastScanTime, setLastScanTime, backendUrl } = useStore();
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [scanStatus, setScanStatus] = useState('');
  const [buyModal, setBuyModal] = useState<{ symbol: string; price: number } | null>(null);
  const [buyAmount, setBuyAmount] = useState('2000');
  const { openPosition, botBalance } = useStore();

  const scan = useCallback(async () => {
    if (isScanning) return;
    setScanning(true);
    setScanStatus('Đang tải danh sách coin từ CoinGecko...');

    try {
      const cgCoins = await fetch(
        `${COINGECKO_API}/coins/markets?vs_currency=usd&order=volume_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`
      ).then(r => r.json());

      if (!Array.isArray(cgCoins)) throw new Error('CoinGecko API lỗi');

      const exclude = new Set(['USDT', 'USDC', 'BUSD', 'DAI', 'FDUSD', 'TUSD', 'USDP', 'GUSD']);
      const candidates = cgCoins
        .filter(c => !exclude.has(c.symbol?.toUpperCase()) && c.current_price > 0)
        .slice(0, 60);

      setScanStatus(`Đang phân tích ${candidates.length} đồng coin...`);
      const results = [];

      for (let i = 0; i < candidates.length; i++) {
        const coin = candidates[i];
        setScanStatus(`Phân tích (${i + 1}/${candidates.length}): ${coin.symbol?.toUpperCase()}...`);
        const analysis = await analyzeSymbol(
          coin.symbol?.toUpperCase() || '',
          coin.id,
          { current_price: coin.current_price, price_change_percentage_24h: coin.price_change_percentage_24h, image: coin.image, name: coin.name, market_cap_rank: coin.market_cap_rank }
        );
        if (analysis && analysis.signal !== 'HOLD') {
          results.push(analysis);
        }
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 150));
      }

      results.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

      // Try to enrich with AI if backend available
      setScanStatus('Đang xử lý AI insights...');
      try {
        const enrichResp = await fetch(`${backendUrl}/api/ai/recommendations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidates: results.slice(0, 10) }),
          signal: AbortSignal.timeout(20000),
        });
        if (enrichResp.ok) {
          const enrichData = await enrichResp.json();
          if (enrichData.success && enrichData.data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setSignals(enrichData.data as any);
            setScanStatus('');
            setLastScanTime(Date.now());
            setScanning(false);
            return;
          }
        }
      } catch { /* AI enrichment failed, use raw results */ }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSignals(results as any);
      setScanStatus('');
      setLastScanTime(Date.now());
    } catch (e) {
      setScanStatus('Lỗi: ' + (e instanceof Error ? e.message : 'Thử lại'));
    } finally {
      setScanning(false);
    }
  }, [isScanning, backendUrl]); // eslint-disable-line

  const handleBotTest = (symbol: string, price: number) => {
    setBuyModal({ symbol, price });
    setBuyAmount('2000');
  };

  const confirmBotTest = () => {
    if (!buyModal) return;
    const amt = parseFloat(buyAmount);
    if (isNaN(amt) || amt <= 0 || amt > botBalance) {
      alert(`Số tiền không hợp lệ. Số dư ảo: ${fmt.usd(botBalance)}`);
      return;
    }
    openPosition(buyModal.symbol, buyModal.price, amt);
    setBuyModal(null);
    alert(`✅ Đã mở lệnh Bot Test ${buyModal.symbol} với $${amt} USDT ảo!\nChuyển sang tab Thử nghiệm Bot để theo dõi.`);
  };

  const filtered = filter === 'ALL' ? signals :
    filter === 'BUY' ? signals.filter(s => s.signal.includes('BUY')) :
      signals.filter(s => s.signal.includes('SELL'));

  const buyCount = signals.filter(s => s.signal.includes('BUY')).length;
  const sellCount = signals.filter(s => s.signal.includes('SELL')).length;

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h1>🤖 Gợi ý AI</h1>
          {lastScanTime > 0 && (
            <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
              Quét lúc {new Date(lastScanTime).toLocaleTimeString('vi-VN')}
            </div>
          )}
        </div>
        <button className="btn btn-primary" onClick={scan} disabled={isScanning}>
          {isScanning ? '⏳ Đang quét...' : '🔍 Quét AI'}
        </button>
      </div>

      {/* Scan status */}
      {scanStatus && (
        <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: 'var(--yellowA)', border: '1px solid rgba(255,213,79,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--yellow)' }}>
          ⏳ {scanStatus}
        </div>
      )}

      {/* Stats summary */}
      {signals.length > 0 && (
        <div style={{ margin: '0 16px 12px', display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'var(--greenA)', border: '1px solid rgba(105,240,174,0.3)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{buyCount}</div>
            <div style={{ fontSize: 10, color: 'var(--t4)' }}>Tín hiệu MUA</div>
          </div>
          <div style={{ flex: 1, background: 'var(--redA)', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>{sellCount}</div>
            <div style={{ fontSize: 10, color: 'var(--t4)' }}>Tín hiệu BÁN</div>
          </div>
          <div style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)' }}>{signals.length}</div>
            <div style={{ fontSize: 10, color: 'var(--t4)' }}>Tổng tín hiệu</div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px', marginBottom: 12 }}>
        {(['ALL', 'BUY', 'SELL'] as const).map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'Tất cả' : f === 'BUY' ? '🟢 Mua' : '🔴 Bán'}
          </button>
        ))}
      </div>

      {/* Signal grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--t4)' }}>
          {signals.length === 0
            ? (
              <div>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                <div style={{ fontSize: 16, color: 'var(--t2)', marginBottom: 8 }}>Chưa có tín hiệu nào</div>
                <div style={{ fontSize: 13 }}>Nhấn <strong style={{ color: 'var(--blue)' }}>Quét AI</strong> để phân tích thị trường</div>
              </div>
            )
            : 'Không có tín hiệu phù hợp với bộ lọc'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, padding: '0 16px' }}>
          {filtered.map(s => (
            <SignalCard key={s.id || s.symbol} signal={s} onBotTest={handleBotTest} />
          ))}
        </div>
      )}

      {/* Bot Test Buy Modal */}
      {buyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 340 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🤖 Chạy Bot Test</div>
            <div style={{ color: 'var(--t4)', fontSize: 13, marginBottom: 16 }}>
              {buyModal.symbol} @ {fmt.usd(buyModal.price)}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>
                Số USDT ảo muốn đầu tư chạy test
              </label>
              <input
                type="number"
                value={buyAmount}
                onChange={e => setBuyAmount(e.target.value)}
                placeholder="Nhập số USDT..."
                min="10"
                max={botBalance}
                autoFocus
              />
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>
                Số dư ảo hiện có: <span style={{ color: 'var(--yellow)' }}>{fmt.usd(botBalance)}</span>
              </div>
            </div>

            {buyAmount && parseFloat(buyAmount) > 0 && buyModal.price > 0 && (
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12, color: 'var(--t2)' }}>
                Sẽ mua ≈ <strong style={{ color: 'var(--t1)' }}>{(parseFloat(buyAmount) / buyModal.price).toFixed(6)}</strong> {buyModal.symbol}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setBuyModal(null)}>Hủy</button>
              <button className="btn btn-yellow" style={{ flex: 2, fontWeight: 700 }} onClick={confirmBotTest}>
                🤖 Chạy Bot Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
