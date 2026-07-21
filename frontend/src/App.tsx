import { useEffect } from 'react';
import './index.css';
import { useStore } from './store/useStore';
import { useLivePrices } from './hooks/useLivePrices';
import SignalsPage from './pages/SignalsPage';
import BotPage from './pages/BotPage';
import SettingsPage from './pages/SettingsPage';

const NAV_ITEMS = [
  { id: 'signals', icon: '🤖', label: 'Gợi ý AI' },
  { id: 'bot', icon: '⚙️', label: 'Bot Test' },
  { id: 'settings', icon: '🛠️', label: 'Cài đặt' },
] as const;

// Live price streaming symbols
const STREAM_SYMS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK', 'NEAR', 'MATIC', 'UNI', 'ATOM', 'LTC'];

export default function App() {
  const { activeTab, setTab, wsConnected, signals, positions } = useStore();

  // Collect all symbols to stream (signals + positions)
  const sigSyms = signals.map(s => s.symbol);
  const posSyms = positions.map(p => p.symbol);
  const allSyms = [...new Set([...STREAM_SYMS, ...sigSyms, ...posSyms])];

  useLivePrices(allSyms);

  // Update position prices on every live price change
  const livePrices = useStore(s => s.livePrices);
  const updatePositionPrices = useStore(s => s.updatePositionPrices);
  useEffect(() => {
    if (positions.length > 0) {
      updatePositionPrices(livePrices);
    }
  }, [livePrices]); // eslint-disable-line

  const buySignals = signals.filter(s => s.signal.includes('BUY')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)' }}>
      {/* Top header bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--blue), var(--purple))',
            borderRadius: 8, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 14, color: '#fff'
          }}>AI</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>CryptoAI Pro</div>
            <div style={{ fontSize: 10, color: 'var(--t4)' }}>AI Coin Testing Platform</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* WS status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className={`live-dot ${wsConnected ? 'on' : ''}`} />
            <span style={{ fontSize: 10, color: 'var(--t4)' }}>{wsConnected ? 'Live' : 'Offline'}</span>
          </div>

          {/* Positions count */}
          {positions.length > 0 && (
            <div style={{ background: 'var(--yellowA)', border: '1px solid var(--yellow)', borderRadius: 20, padding: '2px 10px', fontSize: 11, color: 'var(--yellow)', fontWeight: 700 }}>
              {positions.length} vị thế
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} className="scrollbar-thin">
        {activeTab === 'signals' && <SignalsPage />}
        {activeTab === 'bot' && <BotPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* Bottom navigation */}
      <nav style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        background: 'var(--bg2)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.id;
          const badge = item.id === 'signals' && buySignals > 0 ? buySignals :
            item.id === 'bot' && positions.length > 0 ? positions.length : 0;

          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                background: 'none',
                border: 'none',
                borderRadius: 0,
                padding: '10px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                cursor: 'pointer',
                position: 'relative',
                borderTop: `2px solid ${isActive ? 'var(--blue)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 10, color: isActive ? 'var(--blue)' : 'var(--t4)', fontWeight: isActive ? 700 : 400 }}>
                {item.label}
              </span>
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: 6, right: '50%', transform: 'translateX(14px)',
                  background: item.id === 'signals' ? 'var(--green)' : 'var(--yellow)',
                  color: '#000',
                  borderRadius: 20, fontSize: 9, fontWeight: 700,
                  minWidth: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>{badge}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
