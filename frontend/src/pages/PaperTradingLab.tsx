import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AlertCircle, PlayCircle, StopCircle } from 'lucide-react';
import axios from 'axios';
import ChartWidget from '../components/ChartWidget';

const PaperTradingLab = () => {
  const balance = useAppStore(state => state.balance);
  const positions = useAppStore(state => state.positions);
  const updatePrice = useAppStore(state => state.updatePrice);
  const closePosition = useAppStore(state => state.closePosition);

  // Real-time price updating logic
  useEffect(() => {
    const openSymbols = Array.from(new Set(positions.filter(p => p.status === 'OPEN').map(p => p.symbol)));
    if (openSymbols.length === 0) return;

    // We will use Binance WebSocket for real-time prices
    const wsUrl = `wss://stream.binance.com:9443/ws/${openSymbols.map(s => `${s.toLowerCase()}@ticker`).join('/')}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data && data.s && data.c) {
        updatePrice(data.s, parseFloat(data.c));
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    // Also fetch initial prices via REST to avoid waiting for the first tick
    openSymbols.forEach(symbol => {
      axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
        .then(res => {
          if (res.data && res.data.price) {
            updatePrice(symbol, parseFloat(res.data.price));
          }
        })
        .catch(err => console.error("REST API fallback error", err));
    });

    return () => {
      ws.close();
    };
  }, [positions.filter(p => p.status === 'OPEN').length]);

  const totalUnrealizedPnL = positions.filter(p => p.status === 'OPEN').reduce((sum, p) => sum + p.pnl, 0);
  
  // Find the first open position to show on chart
  const activePosition = positions.find(p => p.status === 'OPEN');

  return (
    <div>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Phòng Giao Dịch Ảo</h1>
          <p className="page-subtitle">Theo dõi lệnh đang test với Dữ liệu Real-time trực tiếp từ sàn</p>
        </div>
        <div className="glass-panel" style={{ padding: '16px 24px', textAlign: 'right' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>TỔNG LỢI NHUẬN TẠM TÍNH (U-PNL)</div>
          <div className="font-mono" style={{ fontSize: '24px', fontWeight: 'bold', color: totalUnrealizedPnL >= 0 ? 'var(--primary)' : 'var(--secondary)' }}>
            {totalUnrealizedPnL >= 0 ? '+' : ''}{totalUnrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
        </div>
      </header>

      {activePosition && (
        <ChartWidget 
          symbol={activePosition.symbol}
          entryPrice={activePosition.entryPrice}
          takeProfit={activePosition.takeProfit}
          stopLoss={activePosition.stopLoss}
        />
      )}

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>Cặp Giao Dịch</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>Vị Thế</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>Vốn (Size)</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>Entry / Giá Hiện Tại</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>TP / SL</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>Lợi Nhuận (PnL)</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>Trạng Thái</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <AlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                  <p>Chưa có lệnh nào đang chạy.</p>
                  <p>Hãy sang Phòng Phân Tích AI để tìm tín hiệu.</p>
                </td>
              </tr>
            ) : (
              positions.map(pos => {
                const pnlPercent = (pos.pnl / pos.size) * 100;
                const isProfitable = pos.pnl >= 0;
                
                return (
                  <tr key={pos.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px', fontWeight: 'bold' }} className="font-mono">{pos.symbol}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        color: pos.type === 'LONG' ? 'var(--primary)' : 'var(--secondary)',
                        background: pos.type === 'LONG' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 61, 0, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {pos.type}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }} className="font-mono">${pos.size.toLocaleString()}</td>
                    <td style={{ padding: '16px' }}>
                      <div className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{pos.entryPrice.toLocaleString()}</div>
                      <div className="font-mono" style={{ fontWeight: 'bold' }}>{pos.currentPrice.toLocaleString()}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div className="font-mono text-green" style={{ fontSize: '12px' }}>{pos.takeProfit.toLocaleString()}</div>
                      <div className="font-mono text-red" style={{ fontSize: '12px' }}>{pos.stopLoss.toLocaleString()}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div className="font-mono" style={{ 
                        fontWeight: 'bold', 
                        color: isProfitable ? 'var(--primary)' : 'var(--secondary)',
                      }}>
                        {isProfitable ? '+' : ''}{pos.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="font-mono" style={{ fontSize: '12px', color: isProfitable ? 'var(--primary)' : 'var(--secondary)' }}>
                        {isProfitable ? '+' : ''}{pnlPercent.toFixed(2)}%
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pos.status === 'OPEN' ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {pos.status === 'OPEN' ? <PlayCircle size={16} className="pulse-anim" /> : <StopCircle size={16} />}
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{pos.status}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {pos.status === 'OPEN' && (
                        <button 
                          style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid var(--secondary)',
                            color: 'var(--secondary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                          onClick={() => closePosition(pos.id, 'MANUAL_CLOSE')}
                        >
                          ĐÓNG LỆNH
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaperTradingLab;
