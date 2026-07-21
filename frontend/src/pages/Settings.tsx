import { useState, useEffect } from 'react';
import { Key, CheckCircle, XCircle, ExternalLink, ShieldCheck, Loader2, Zap, Bot } from 'lucide-react';
import axios from 'axios';

export default function Settings() {
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [status, setStatus] = useState<any>({ connected: false, groq: false, gemini: false });
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    axios.get('/api/ai/status').then(res => setStatus(res.data)).catch(() => {});
  }, []);

  const connect = async (provider: 'groq' | 'gemini') => {
    const key = provider === 'groq' ? groqKey : geminiKey;
    if (!key || key.length < 20) {
      setMessage({ type: 'error', text: 'API Key phải có ít nhất 20 ký tự.' });
      return;
    }
    setSaving(provider);
    setMessage(null);
    try {
      const res = await axios.post('/api/ai/connect', { apiKey: key, provider });
      if (res.data.success) {
        setStatus((s: any) => ({ ...s, connected: true, [provider]: true }));
        setMessage({ type: 'success', text: `✅ Đã kết nối ${provider === 'groq' ? 'Groq' : 'Gemini'} AI!` });
        provider === 'groq' ? setGroqKey('') : setGeminiKey('');
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Không thể kết nối.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối server.' });
    } finally {
      setSaving(null);
    }
  };

  const StatusBadge = ({ active }: { active: boolean }) => active
    ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3ECF8E', fontSize: '12px', fontWeight: 600 }}><CheckCircle size={14} /> Đã kết nối</span>
    : <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}><XCircle size={14} /> Chưa kết nối</span>;

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Cài Đặt</h1>
        <p className="page-subtitle">Kết nối AI để tạo tín hiệu giao dịch thông minh hơn</p>
      </header>

      {/* Info banner */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '3px solid #3FC7B4' }}>
        <Bot size={20} style={{ color: '#3FC7B4', flexShrink: 0 }} />
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          App <b style={{ color: '#fff' }}>luôn hoạt động</b> ngay cả khi không có API Key — sử dụng thuật toán phân tích momentum + volume từ dữ liệu CoinGecko thật.
          Thêm AI Key để phân tích sâu hơn (xu hướng kỹ thuật, tin tức, đánh giá rủi ro).
        </div>
      </div>

      {/* Groq — RECOMMENDED */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px', border: '1px solid rgba(63, 199, 180, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #3FC7B4, #2ba08e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Groq AI</h2>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: 'rgba(63,199,180,0.15)', color: '#3FC7B4', border: '1px solid rgba(63,199,180,0.3)' }}>
                ĐỀ XUẤT
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>
              Llama 3.3 70B — Miễn phí, nhanh, phân tích chính xác
            </p>
          </div>
          <StatusBadge active={status.groq} />
        </div>

        <div style={{
          background: 'rgba(63,199,180,0.06)', border: '1px solid rgba(63,199,180,0.15)',
          borderRadius: '10px', padding: '14px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)'
        }}>
          <strong style={{ color: '#3FC7B4' }}>3 bước:</strong>{' '}
          Vào{' '}
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
            style={{ color: '#3FC7B4', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            console.groq.com/keys <ExternalLink size={11} />
          </a>{' '}
          → Đăng ký bằng Google (5 giây) → Bấm "Create API Key" → Paste vào đây. <b>Hoàn toàn miễn phí!</b>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Key size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder={status.groq ? '••••••••••••••••' : 'gsk_...'}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#3FC7B4'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              onKeyDown={(e) => e.key === 'Enter' && connect('groq')}
            />
          </div>
          <button onClick={() => connect('groq')} disabled={saving === 'groq'} style={{ ...btnStyle, background: 'linear-gradient(135deg, #3FC7B4, #2ba08e)' }}>
            {saving === 'groq' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            Kết nối
          </button>
        </div>
      </div>

      {/* Gemini — SECONDARY */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #E8A94B, #d9922e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldCheck size={20} color="#10141B" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Google Gemini</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>Dự phòng — miễn phí</p>
          </div>
          <StatusBadge active={status.gemini} />
        </div>

        <div style={{
          background: 'rgba(232,169,75,0.06)', border: '1px solid rgba(232,169,75,0.15)',
          borderRadius: '10px', padding: '14px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)'
        }}>
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
            style={{ color: '#E8A94B', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            aistudio.google.com/apikey <ExternalLink size={11} />
          </a>{' '}
          → Đăng nhập Google → Create API Key → Paste.
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Key size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder={status.gemini ? '••••••••••••••••' : 'AIza...'}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = '#E8A94B'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              onKeyDown={(e) => e.key === 'Enter' && connect('gemini')}
            />
          </div>
          <button onClick={() => connect('gemini')} disabled={saving === 'gemini'} style={{ ...btnStyle, background: 'linear-gradient(135deg, #E8A94B, #d9922e)' }}>
            {saving === 'gemini' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            Kết nối
          </button>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px',
          background: message.type === 'success' ? 'rgba(62,207,142,0.08)' : 'rgba(242,85,95,0.08)',
          border: `1px solid ${message.type === 'success' ? 'rgba(62,207,142,0.35)' : 'rgba(242,85,95,0.35)'}`,
          color: message.type === 'success' ? '#3ECF8E' : '#f6a3a8',
        }}>
          {message.text}
        </div>
      )}

      {/* App Info */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.6px' }}>
          Hệ thống AI Engine
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Ưu tiên 1', value: 'Groq (Llama 3)', color: '#3FC7B4' },
            { label: 'Ưu tiên 2', value: 'Google Gemini', color: '#E8A94B' },
            { label: 'Fallback', value: 'Thuật toán', color: 'var(--text-secondary)' },
            { label: 'Dữ liệu giá', value: 'CoinGecko Real-time', color: 'var(--text-primary)' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: '10px', padding: '14px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px 12px 38px',
  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
  borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px',
  fontFamily: 'var(--font-mono)', outline: 'none', transition: 'border-color 0.2s',
};

const btnStyle: React.CSSProperties = {
  padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '14px',
  color: '#10141B', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
};
