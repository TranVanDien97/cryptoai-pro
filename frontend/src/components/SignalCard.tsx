
import { useStore } from '../store/useStore';
import { fmt } from '../hooks/useLivePrices';

export default function SignalCard({ signal, onBotTest }: {
  signal: {
    id: string;
    symbol: string;
    name: string;
    image: string;
    signal: string;
    confidence: number;
    entry: number;
    sl: number;
    tp: number;
    tp2?: number;
    rr?: string;
    reasons: string[];
    source: string;
    rank?: number;
    ai?: { headline: string; explanation: string } | null;
  };
  onBotTest: (symbol: string, price: number) => void;
}) {
  const livePrices = useStore(s => s.livePrices);
  const liveP = livePrices[signal.symbol.toUpperCase()] || livePrices[signal.symbol.toUpperCase() + 'USDT'] || signal.entry;

  const isBuy = signal.signal.includes('BUY');
  const isSell = signal.signal.includes('SELL');

  const badgeClass = isBuy ? 'badge-buy' : isSell ? 'badge-sell' : 'badge-hold';
  const badgeLabel = signal.signal === 'STRONG_BUY' ? '⚡ STRONG BUY' :
    signal.signal === 'BUY' ? '✅ MUA' :
      signal.signal === 'STRONG_SELL' ? '🔥 STRONG SELL' :
        signal.signal === 'SELL' ? '❌ BÁN' : '⏸ HOLD';

  const pnlFromEntry = liveP > 0 && signal.entry > 0
    ? ((liveP - signal.entry) / signal.entry) * 100
    : 0;

  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${isBuy ? 'rgba(105,240,174,0.3)' : isSell ? 'rgba(255,82,82,0.3)' : 'var(--border)'}`,
      borderRadius: 12,
      padding: 14,
      transition: 'transform 0.15s, box-shadow 0.15s',
      cursor: 'default',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <img src={signal.image} alt={signal.symbol} width={36} height={36} style={{ borderRadius: '50%' }} onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${signal.symbol}&background=1a2035&color=ffd54f`; }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {signal.symbol}
            {signal.rank && <small style={{ color: 'var(--t4)', fontWeight: 400, fontSize: 10, marginLeft: 6 }}>#{signal.rank}</small>}
          </div>
          <div style={{ color: 'var(--t4)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{signal.name}</div>
        </div>
        <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
      </div>

      {/* AI Insight box */}
      {signal.ai && (
        <div style={{ background: 'var(--yellowA)', border: '1px solid rgba(255,213,79,0.3)', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
          <div style={{ color: 'var(--yellow)', fontWeight: 600, fontSize: 12, marginBottom: 3 }}>🤖 {signal.ai.headline}</div>
          <div style={{ color: 'var(--t2)', fontSize: 11, lineHeight: 1.5 }}>{signal.ai.explanation}</div>
        </div>
      )}

      {/* Reasons */}
      {!signal.ai && signal.reasons.length > 0 && (
        <ul style={{ marginBottom: 10, paddingLeft: 0, listStyle: 'none' }}>
          {signal.reasons.slice(0, 2).map((r, i) => (
            <li key={i} style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 2, paddingLeft: 14, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--blue)' }}>›</span>{r}
            </li>
          ))}
        </ul>
      )}

      {/* Price grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
        <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '6px 8px' }}>
          <div style={{ fontSize: 9, color: 'var(--t4)', marginBottom: 2 }}>GIÁ LIVE</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)', fontFamily: 'var(--mono)' }}>{fmt.usd(liveP)}</div>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '6px 8px' }}>
          <div style={{ fontSize: 9, color: 'var(--t4)', marginBottom: 2 }}>VÀO LỆNH</div>
          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)' }}>{fmt.usd(signal.entry)}</div>
          {pnlFromEntry !== 0 && <div style={{ fontSize: 9, color: pnlFromEntry >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt.pct(pnlFromEntry)}</div>}
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '6px 8px' }}>
          <div style={{ fontSize: 9, color: 'var(--red)', marginBottom: 2 }}>CẮT LỖ</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--mono)' }}>{fmt.usd(signal.sl)}</div>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '6px 8px' }}>
          <div style={{ fontSize: 9, color: 'var(--green)', marginBottom: 2 }}>CHỐT LỜI</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--mono)' }}>{fmt.usd(signal.tp)}</div>
          {signal.tp2 && <div style={{ fontSize: 9, color: 'var(--green)', opacity: 0.7 }}>T2: {fmt.usd(signal.tp2)}</div>}
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t4)', marginBottom: 4 }}>
          <span>Độ tin cậy AI</span>
          <span style={{ color: signal.confidence >= 70 ? 'var(--green)' : signal.confidence >= 50 ? 'var(--yellow)' : 'var(--red)' }}>{signal.confidence}%</span>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
          <div style={{ width: `${signal.confidence}%`, height: '100%', borderRadius: 4, background: signal.confidence >= 70 ? 'var(--green)' : signal.confidence >= 50 ? 'var(--yellow)' : 'var(--red)', transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Action button */}
      {isBuy && (
        <button
          className="btn btn-yellow"
          style={{ width: '100%', fontSize: 12, padding: '8px 0', fontWeight: 700 }}
          onClick={() => onBotTest(signal.symbol, liveP || signal.entry)}
        >
          🤖 Chạy Bot Test — {signal.symbol}
        </button>
      )}
    </div>
  );
}
