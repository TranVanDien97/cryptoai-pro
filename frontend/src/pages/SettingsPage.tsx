import { useState } from 'react';
import { useStore } from '../store/useStore';

export default function SettingsPage() {
  const { backendUrl, geminiKey, setBackendUrl, setGeminiKey } = useStore();
  const [url, setUrl] = useState(backendUrl);
  const [key, setKey] = useState(geminiKey);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  const testBackend = async () => {
    setTestStatus({ type: 'info', msg: 'Đang kiểm tra kết nối...' });
    try {
      const r = await fetch(`${url}/api/binance/status`, { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        setTestStatus({ type: 'success', msg: '✅ Kết nối backend thành công!' });
      } else {
        setTestStatus({ type: 'error', msg: `❌ Backend trả về lỗi ${r.status}` });
      }
    } catch {
      setTestStatus({ type: 'error', msg: '❌ Không thể kết nối. Kiểm tra lại URL.' });
    }
  };

  const saveGeminiKey = async () => {
    setTestStatus({ type: 'info', msg: 'Đang lưu Gemini API Key...' });
    try {
      const r = await fetch(`${url}/api/ai/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await r.json();
      if (data.success) {
        setGeminiKey(key);
        setTestStatus({ type: 'success', msg: '✅ Đã kết nối Gemini AI! Tính năng AI insights đã hoạt động.' });
      } else {
        setTestStatus({ type: 'error', msg: `❌ ${data.error || 'Lỗi kết nối Gemini'}` });
      }
    } catch {
      // Save locally anyway
      setGeminiKey(key);
      setTestStatus({ type: 'success', msg: '✅ Đã lưu key vào trình duyệt. (Backend offline)' });
    }
  };



  return (
    <div style={{ padding: '0 16px 80px' }}>
      <div style={{ paddingTop: 16, marginBottom: 20 }}>
        <h1>🛠️ Cài đặt</h1>
        <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 2 }}>Cấu hình backend và AI</div>
      </div>

      {testStatus && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          background: testStatus.type === 'success' ? 'var(--greenA)' : testStatus.type === 'error' ? 'var(--redA)' : 'var(--yellowA)',
          border: `1px solid ${testStatus.type === 'success' ? 'rgba(105,240,174,0.3)' : testStatus.type === 'error' ? 'rgba(255,82,82,0.3)' : 'rgba(255,213,79,0.3)'}`,
          color: testStatus.type === 'success' ? 'var(--green)' : testStatus.type === 'error' ? 'var(--red)' : 'var(--yellow)',
        }}>
          {testStatus.msg}
        </div>
      )}

      {/* Backend URL */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>🖥️ Backend URL</div>
        <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 12 }}>
          Địa chỉ máy chủ backend để gọi API Binance và AI
        </div>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://cryptoai-pro.onrender.com"
          style={{ marginBottom: 10 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={testBackend}>🔗 Kiểm tra kết nối</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setBackendUrl(url.trim().replace(/\/$/, '')); setTestStatus({ type: 'success', msg: '✅ Đã lưu URL!' }); }}>Lưu URL</button>
        </div>
      </div>

      {/* Gemini AI Key */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>🧠 Gemini AI API Key</div>
        <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 12 }}>
          Dùng để hiểu thị trường và sinh tín hiệu AI.{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>
            Lấy key miễn phí tại đây →
          </a>
        </div>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="AIza..."
          style={{ marginBottom: 10 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={saveGeminiKey}>🔑 Kết nối Gemini AI</button>
        </div>
        {geminiKey && (
          <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 8 }}>
            ✅ Đang dùng key: {geminiKey.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="card" style={{ borderColor: 'rgba(68,138,255,0.3)' }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--blue)' }}>ℹ️ Hướng dẫn sử dụng</div>
        <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.8 }}>
          <p><strong style={{ color: 'var(--t1)' }}>1. Quét AI:</strong> Vào tab Gợi ý AI → nhấn Quét AI → chờ phân tích kỹ thuật 60+ coin</p>
          <p><strong style={{ color: 'var(--t1)' }}>2. Chọn coin:</strong> Xem tín hiệu mua/bán, chỉ báo RSI/MACD/EMA và AI insights</p>
          <p><strong style={{ color: 'var(--t1)' }}>3. Chạy Bot Test:</strong> Nhấn "🤖 Chạy Bot Test" → nhập số USDT ảo → theo dõi P&L realtime ở tab Bot</p>
          <p><strong style={{ color: 'var(--t1)' }}>4. Chốt lệnh:</strong> Vào tab Thử nghiệm Bot → nhấn Bán để chốt vị thế</p>
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--t4)', fontSize: 11 }}>
        CryptoAI Pro v6.0 — AI Coin Testing & Simulation Platform
      </div>
    </div>
  );
}
