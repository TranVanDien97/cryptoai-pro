import { useState, useEffect } from 'react';
import { Key, CheckCircle, XCircle, ExternalLink, ShieldCheck, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function Settings() {
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiStatus, setGeminiStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    axios.get('/api/ai/status')
      .then(res => setGeminiStatus(res.data.connected ? 'connected' : 'disconnected'))
      .catch(() => setGeminiStatus('disconnected'));
  }, []);

  const connectGemini = async () => {
    if (!geminiKey || geminiKey.length < 20) {
      setMessage({ type: 'error', text: 'API Key không hợp lệ. Key phải có ít nhất 20 ký tự.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await axios.post('/api/ai/connect', { apiKey: geminiKey });
      if (res.data.success) {
        setGeminiStatus('connected');
        setMessage({ type: 'success', text: '✅ Đã kết nối Gemini AI thành công!' });
        setGeminiKey('');
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Không thể kết nối.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Lỗi kết nối server.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Cài Đặt</h1>
        <p className="page-subtitle">Quản lý kết nối API và cấu hình ứng dụng</p>
      </header>

      {/* Gemini AI Connection */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #E8A94B, #3FC7B4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldCheck size={20} color="#10141B" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Gemini AI</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
              Cần thiết để tạo tín hiệu AI trên Đài Tín Hiệu
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {geminiStatus === 'connected' ? (
              <>
                <CheckCircle size={16} color="#3ECF8E" />
                <span style={{ color: '#3ECF8E', fontSize: '13px', fontWeight: 600 }}>Đã kết nối</span>
              </>
            ) : geminiStatus === 'disconnected' ? (
              <>
                <XCircle size={16} color="#F2555F" />
                <span style={{ color: '#F2555F', fontSize: '13px', fontWeight: 600 }}>Chưa kết nối</span>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Đang kiểm tra...</span>
            )}
          </div>
        </div>

        <div style={{
          background: 'rgba(232, 169, 75, 0.06)', border: '1px solid rgba(232, 169, 75, 0.15)',
          borderRadius: '10px', padding: '14px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)'
        }}>
          <strong style={{ color: '#E8A94B' }}>Hướng dẫn:</strong> Truy cập{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
            style={{ color: '#3FC7B4', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            aistudio.google.com/apikey <ExternalLink size={12} />
          </a>{' '}
          → Đăng nhập Google → Bấm "Create API Key" → Copy key và dán vào ô bên dưới. <strong>Miễn phí!</strong>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Key size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder={geminiStatus === 'connected' ? '••••••••••••••••••••' : 'AIza...'}
              style={{
                width: '100%', padding: '12px 14px 12px 40px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px',
                fontFamily: 'var(--font-mono)', outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#3FC7B4'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              onKeyDown={(e) => e.key === 'Enter' && connectGemini()}
            />
          </div>
          <button
            onClick={connectGemini}
            disabled={saving}
            style={{
              padding: '12px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '14px',
              background: 'linear-gradient(135deg, #E8A94B, #d9922e)', color: '#17120A',
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1, transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' as const,
            }}
          >
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {geminiStatus === 'connected' ? 'Cập nhật Key' : 'Kết nối'}
          </button>
        </div>

        {message && (
          <div style={{
            marginTop: '14px', padding: '12px 14px', borderRadius: '10px', fontSize: '13px',
            background: message.type === 'success' ? 'rgba(62, 207, 142, 0.08)' : 'rgba(242, 85, 95, 0.08)',
            border: `1px solid ${message.type === 'success' ? 'rgba(62, 207, 142, 0.35)' : 'rgba(242, 85, 95, 0.35)'}`,
            color: message.type === 'success' ? '#3ECF8E' : '#f6a3a8',
          }}>
            {message.text}
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.6px' }}>
          Thông tin ứng dụng
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { label: 'Phiên bản', value: 'v6.0.0' },
            { label: 'AI Engine', value: 'Gemini Pro' },
            { label: 'Dữ liệu giá', value: 'CoinGecko + Binance' },
            { label: 'Biểu đồ', value: 'TradingView Charts' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '14px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
