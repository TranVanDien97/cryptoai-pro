import { useState } from 'react';
import { useStore } from '../store/useStore';
import { fmt } from '../hooks/useLivePrices';

function LivePnl({ symbol, qty, buyPrice }: { symbol: string; qty: number; buyPrice: number }) {
  const price = useStore(s => s.livePrices[symbol] || s.livePrices[symbol + 'USDT'] || buyPrice);
  const pnl = (price - buyPrice) * qty;
  const pct = ((price - buyPrice) / buyPrice) * 100;
  return (
    <td className={pnl >= 0 ? 'gain' : 'loss'} style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>
      {pnl >= 0 ? '+' : ''}{fmt.usd(pnl)} ({fmt.pct(pct)})
    </td>
  );
}

function LivePrice({ symbol, buyPrice }: { symbol: string; buyPrice: number }) {
  const price = useStore(s => s.livePrices[symbol] || s.livePrices[symbol + 'USDT'] || buyPrice);
  return (
    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--yellow)' }}>{fmt.usd(price)}</td>
  );
}

export default function BotPage() {
  const {
    botBalance, positions, tradeLogs,
    closePosition, closeAllPositions, resetBot, openPosition,
  } = useStore();
  const [quickSym, setQuickSym] = useState('');
  const [quickAmt, setQuickAmt] = useState('');
  const livePrices = useStore(s => s.livePrices);

  const INITIAL_BALANCE = 10000;
  const totalPositionValue = positions.reduce((sum, p) => {
    const lp = livePrices[p.symbol] || livePrices[p.symbol + 'USDT'] || p.currentPrice;
    return sum + p.qty * lp;
  }, 0);
  const totalEquity = botBalance + totalPositionValue;
  const growth = ((totalEquity - INITIAL_BALANCE) / INITIAL_BALANCE) * 100;

  const closedTrades = tradeLogs.filter(l => l.type === 'SELL');
  const wins = closedTrades.filter(l => l.pnl > 0).length;
  const winRate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0;
  const totalPnl = closedTrades.reduce((s, l) => s + l.pnl, 0);

  const handleQuickBuy = () => {
    const sym = quickSym.trim().toUpperCase();
    const amt = parseFloat(quickAmt);
    if (!sym) { alert('Nhập mã coin (VD: BTC, ETH, ALLO)'); return; }
    if (isNaN(amt) || amt <= 0) { alert('Nhập số USDT hợp lệ'); return; }
    if (amt > botBalance) { alert('Không đủ số dư USDT ảo'); return; }
    const lp = livePrices[sym] || livePrices[sym + 'USDT'];
    if (!lp || lp <= 0) {
      alert(`Không tìm thấy giá live cho ${sym}. Hãy quét AI để tìm coin có tín hiệu trước.`);
      return;
    }
    openPosition(sym, lp, amt);
    setQuickSym('');
    setQuickAmt('');
  };

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px' }}>
        <h1>⚙️ Thử nghiệm Bot</h1>
        <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 2 }}>Mô phỏng giao dịch theo giá thật real-time</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, margin: '0 16px 14px' }}>
        {/* Total Equity */}
        <div className="card" style={{ position: 'relative' }}>
          <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 4 }}>TỔNG TÀI SẢN ẢO</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--yellow)', fontFamily: 'var(--mono)' }}>{fmt.usd(totalEquity)}</div>
          <div style={{ fontSize: 12, marginTop: 2, color: growth >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {growth >= 0 ? '▲' : '▼'} {Math.abs(growth).toFixed(2)}% ({growth >= 0 ? '+' : ''}{fmt.usd(totalEquity - INITIAL_BALANCE)})
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ position: 'absolute', top: 10, right: 10, fontSize: 14, padding: '2px 6px' }}
            onClick={() => { if (confirm('Đặt lại về $10,000 USDT?')) resetBot(); }}
            title="Đặt lại vốn"
          >🔄</button>
        </div>

        {/* Win Rate */}
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 4 }}>TỶ LỆ THẮNG</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: winRate >= 60 ? 'var(--green)' : winRate >= 40 ? 'var(--yellow)' : 'var(--red)' }}>{winRate}%</div>
          <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 2 }}>{wins}/{closedTrades.length} lệnh | P&L: <span style={{ color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{totalPnl >= 0 ? '+' : ''}{fmt.usd(totalPnl)}</span></div>
        </div>
      </div>

      {/* Balance & positions summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, margin: '0 16px 14px' }}>
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 4 }}>SỐ DƯ USDT ẢO</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--mono)' }}>{fmt.usd(botBalance)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 4 }}>ĐANG MỞ</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--yellow)' }}>{positions.length} vị thế</div>
        </div>
      </div>

      {/* Quick Buy */}
      <div className="card" style={{ margin: '0 16px 14px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginBottom: 10 }}>🛒 Mua Nhanh (không cần chờ AI)</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ flex: 1.2 }}
            placeholder="Mã coin (VD: ALLO, BTC)"
            value={quickSym}
            onChange={e => setQuickSym(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleQuickBuy()}
          />
          <input
            style={{ flex: 1 }}
            type="number"
            placeholder="USDT"
            value={quickAmt}
            onChange={e => setQuickAmt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuickBuy()}
          />
          <button className="btn btn-yellow btn-sm" style={{ whiteSpace: 'nowrap', padding: '0 14px' }} onClick={handleQuickBuy}>Mua ảo</button>
        </div>
      </div>

      {/* Open Positions */}
      <div className="card" style={{ margin: '0 16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Vị thế đang mở</div>
          {positions.length > 0 && (
            <button
              className="btn btn-red btn-sm"
              onClick={() => { if (confirm('Bán toàn bộ vị thế theo giá live?')) closeAllPositions(); }}
            >🔴 Bán tất cả</button>
          )}
        </div>

        {positions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t4)', fontSize: 13 }}>
            Chưa có vị thế nào. Quét AI và nhấn <strong>🤖 Chạy Bot Test</strong> để bắt đầu!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>Số lượng</th>
                  <th>Giá mua</th>
                  <th>Giá live</th>
                  <th>Lời / Lỗ</th>
                  <th style={{ textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => (
                  <tr key={p.symbol}>
                    <td>
                      <strong style={{ color: 'var(--yellow)', fontSize: 13 }}>{p.symbol}</strong>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{p.qty.toFixed(6)}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt.usd(p.buyPrice)}</td>
                    <LivePrice symbol={p.symbol} buyPrice={p.currentPrice} />
                    <LivePnl symbol={p.symbol} qty={p.qty} buyPrice={p.buyPrice} />
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-red btn-sm" onClick={() => closePosition(p.symbol)}>Bán</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trade Logs */}
      <div className="card" style={{ margin: '0 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Lịch sử giao dịch</div>
          {tradeLogs.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Xóa lịch sử?')) useStore.getState().resetBot(); }}>Xóa</button>
          )}
        </div>
        {tradeLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t4)', fontSize: 12 }}>Chưa có giao dịch nào</div>
        ) : (
          <div style={{ maxHeight: 260, overflowY: 'auto' }} className="scrollbar-thin">
            <table>
              <thead>
                <tr>
                  <th>Giờ</th>
                  <th>Coin</th>
                  <th>Loại</th>
                  <th>Giá</th>
                  <th>P&L</th>
                </tr>
              </thead>
              <tbody>
                {tradeLogs.map((l, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 11, color: 'var(--t4)' }}>{l.time}</td>
                    <td><strong>{l.symbol}</strong></td>
                    <td>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                        background: l.type === 'BUY' ? 'var(--greenA)' : 'var(--redA)',
                        color: l.type === 'BUY' ? 'var(--green)' : 'var(--red)',
                        border: `1px solid ${l.type === 'BUY' ? 'var(--green)' : 'var(--red)'}`,
                      }}>{l.type}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmt.usd(l.price)}</td>
                    <td>
                      {l.type === 'SELL' ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: l.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {l.pnl >= 0 ? '+' : ''}{fmt.usd(l.pnl)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
