import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Crosshair, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const MOCK_SIGNALS = [
  { symbol: 'BTCUSDT', type: 'LONG' as const, entry: 65000, tp: 68000, sl: 63000, confidence: 92, timeframe: '1H' },
  { symbol: 'ETHUSDT', type: 'SHORT' as const, entry: 3500, tp: 3200, sl: 3650, confidence: 85, timeframe: '4H' },
  { symbol: 'SOLUSDT', type: 'LONG' as const, entry: 145, tp: 160, sl: 135, confidence: 88, timeframe: '15m' },
];

const AIWarRoom = () => {
  const navigate = useNavigate();
  const addPosition = useAppStore(state => state.addPosition);
  const balance = useAppStore(state => state.balance);
  const [scanning, setScanning] = useState(false);

  const handleRunTest = (signal: typeof MOCK_SIGNALS[0]) => {
    // Basic risk management: allocate 10% of balance per trade, max $1000
    const size = Math.min(balance * 0.1, 1000);
    
    addPosition({
      symbol: signal.symbol,
      type: signal.type,
      entryPrice: signal.entry,
      takeProfit: signal.tp,
      stopLoss: signal.sl,
      size
    });
    
    navigate('/paper-trading');
  };

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Phòng Phân Tích AI</h1>
        <p className="page-subtitle">Hệ thống Radar quét tín hiệu và tìm kiếm cơ hội giao dịch (Real-time)</p>
      </header>

      <div style={{ marginBottom: '32px' }}>
        <button 
          className="glass-panel"
          style={{ 
            padding: '16px 32px', 
            background: scanning ? 'var(--bg-card)' : 'var(--primary-glow)',
            color: scanning ? 'var(--text-muted)' : 'var(--primary)',
            border: `1px solid ${scanning ? 'var(--border)' : 'var(--primary)'}`,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
          onClick={() => {
            setScanning(true);
            setTimeout(() => setScanning(false), 2000);
          }}
        >
          <Brain size={24} className={scanning ? 'pulse-anim' : ''} />
          {scanning ? 'Đang phân tích thị trường...' : 'Quét Thị Trường Mới Nhất'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {MOCK_SIGNALS.map(signal => (
          <div key={signal.symbol} className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: signal.type === 'LONG' ? 'var(--primary)' : 'var(--secondary)' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{signal.symbol}</span>
                <span style={{ 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  fontSize: '12px' 
                }}>{signal.timeframe}</span>
              </div>
              <div style={{ 
                color: signal.type === 'LONG' ? 'var(--primary)' : 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 'bold'
              }}>
                {signal.type === 'LONG' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                {signal.type}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>ENTRY</div>
                <div className="font-mono">{signal.entry.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: 'var(--warning)', fontSize: '12px', marginBottom: '4px' }}>ĐỘ TIN CẬY (AI)</div>
                <div className="font-mono">{signal.confidence}%</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap:'4px' }}>
                  <Target size={14}/> TAKE PROFIT
                </div>
                <div className="font-mono text-green">{signal.tp.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap:'4px' }}>
                  <Crosshair size={14}/> STOP LOSS
                </div>
                <div className="font-mono text-red">{signal.sl.toLocaleString()}</div>
              </div>
            </div>

            <button 
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(41, 121, 255, 0.1)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 'bold',
                transition: 'var(--transition)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(41, 121, 255, 0.1)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
              onClick={() => handleRunTest(signal)}
            >
              🤖 CHẠY TEST LỆNH NÀY
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIWarRoom;
