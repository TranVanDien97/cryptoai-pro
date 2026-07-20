import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles, RefreshCw, Loader2, TrendingUp, Target,
  ShieldAlert, Clock, Trash2, Radio, ArrowUpRight, ArrowDownRight,
  CheckCircle2, Info,
} from "lucide-react";
import axios from 'axios';

const SYSTEM_PROMPT = `Bạn là một nhà phân tích thị trường tiền điện tử định lượng, làm việc cho một bàn giao dịch ngắn hạn (swing trade 3–14 ngày).

Nhiệm vụ: dùng công cụ tìm kiếm web để tra cứu diễn biến giá, khối lượng giao dịch và tin tức mới nhất của thị trường crypto, sau đó đề xuất ĐÚNG 6 đồng coin có tiềm năng giao dịch ngắn hạn tốt nhất tại thời điểm hiện tại, trải rộng theo vốn hóa:
- 3 đồng "vốn hóa lớn" (large-cap: nằm trong khoảng top ~30 theo vốn hóa thị trường, ví dụ bitcoin, ethereum, solana, ripple, cardano, dogecoin, chainlink, avalanche-2, polkadot, litecoin...).
- 3 đồng "vốn hóa nhỏ/vừa" (small/mid-cap: ngoài top 30, biến động mạnh hơn, tiềm năng tăng trưởng cao hơn nhưng rủi ro cao hơn).

Với mỗi đồng, xác định:
- coinId: ĐÚNG id của đồng đó trên CoinGecko. Không được bịa id — chỉ dùng id bạn chắc chắn tồn tại trên CoinGecko.
- symbol: mã ticker (vd BTC)
- name: tên đầy đủ
- cap: "large" hoặc "small" (đúng theo phân loại vốn hóa ở trên)
- entryPrice: giá mua đề xuất (số, đơn vị USD)
- stopLoss: giá cắt lỗ (số, thấp hơn entryPrice)
- takeProfit: giá chốt lời (số, cao hơn entryPrice)
- confidence: "low" | "medium" | "high"
- timeframe: khung thời gian dự kiến, ví dụ "5-10 ngày"
- reasoning: lý do phân tích, 2-3 câu ngắn gọn bằng tiếng Việt, dựa trên dữ liệu vừa tra cứu (xu hướng giá, tin tức, chỉ báo kỹ thuật, dòng tiền...)

Yêu cầu bắt buộc:
- entryPrice, stopLoss, takeProfit phải là số hợp lý, sát với giá thị trường thực tế mà bạn vừa tra cứu được.
- Đảm bảo đúng 3 đồng cap="large" và đúng 3 đồng cap="small", không trùng lặp coin giữa các lần đề xuất trong cùng một phản hồi.
- Sau khi nghiên cứu xong, CHỈ trả lời bằng một mảng JSON hợp lệ duy nhất, không kèm markdown code fence, không kèm lời giải thích nào khác ngoài JSON. Đúng cấu trúc:
[{"coinId":"...","symbol":"...","name":"...","cap":"large","entryPrice":0,"stopLoss":0,"takeProfit":0,"confidence":"medium","timeframe":"...","reasoning":"..."}]`;

const fmtUsd = (n: any) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const fmtDate = (iso: any) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2));

function Confidence({ level }: { level: string }) {
  const map: any = {
    high: { label: "TIN CẬY CAO", cls: "conf-high" },
    medium: { label: "TIN CẬY VỪA", cls: "conf-medium" },
    low: { label: "TIN CẬY THẤP", cls: "conf-low" },
  };
  const c = map[level] || map.medium;
  return <span className={`badge ${c.cls}`}>{c.label}</span>;
}

function StatusStamp({ status }: { status: string }) {
  if (status === "win") return <div className="stamp stamp-win">THẮNG</div>;
  if (status === "loss") return <div className="stamp stamp-loss">THUA</div>;
  return null;
}

function RangeGauge({ stop, entry, target, current }: any) {
  const span = target - stop;
  const pct = (v: any) => Math.max(0, Math.min(100, ((v - stop) / span) * 100));
  const entryPct = pct(entry);
  const curPct = current != null ? pct(current) : null;
  return (
    <div className="gauge">
      <div className="gauge-track">
        <div className="gauge-fill" style={{ width: `${curPct != null ? curPct : entryPct}%` }} />
        <div className="gauge-entry" style={{ left: `${entryPct}%` }} title="Giá mua" />
        {curPct != null && <div className="gauge-current" style={{ left: `${curPct}%` }} title="Giá hiện tại" />}
      </div>
      <div className="gauge-labels">
        <span className="g-stop">{fmtUsd(stop)}</span>
        <span className="g-entry">{fmtUsd(entry)}</span>
        <span className="g-target">{fmtUsd(target)}</span>
      </div>
    </div>
  );
}

function SignalTicket({ s, mode, onToggle }: any) {
  const isUp = s.currentPrice != null && s.currentPrice >= s.entryPrice;
  return (
    <div className={`ticket ${s.status !== "pending" ? "ticket-closed" : ""} ${s.selected ? "ticket-selected" : ""}`}>
      <StatusStamp status={s.status} />
      <div className="ticket-head">
        <div>
          <div className="ticket-symbol">
            {s.symbol}
            <span className={`cap-pill ${s.cap === "small" ? "cap-small" : "cap-large"}`}>
              {s.cap === "small" ? "Vốn hóa nhỏ" : "Vốn hóa lớn"}
            </span>
          </div>
          <div className="ticket-name">{s.name}</div>
        </div>
        <Confidence level={s.confidence} />
      </div>

      <div className="ticket-row">
        <div className="ticket-cell">
          <span className="cell-label"><ShieldAlert size={12} /> Cắt lỗ</span>
          <span className="cell-value cell-danger">{fmtUsd(s.stopLoss)}</span>
        </div>
        <div className="ticket-cell">
          <span className="cell-label"><Target size={12} /> Mua vào</span>
          <span className="cell-value">{fmtUsd(s.entryPrice)}</span>
        </div>
        <div className="ticket-cell">
          <span className="cell-label"><TrendingUp size={12} /> Chốt lời</span>
          <span className="cell-value cell-success">{fmtUsd(s.takeProfit)}</span>
        </div>
      </div>

      {mode === "tracking" && (
        <>
          <RangeGauge stop={s.stopLoss} entry={s.entryPrice} target={s.takeProfit} current={s.currentPrice} />
          <div className="ticket-current">
            <span className="cell-label">Giá hiện tại</span>
            <span className={`cell-value ${isUp ? "cell-success" : "cell-danger"}`}>
              {fmtUsd(s.currentPrice)}
              {s.currentPrice != null && (isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}
            </span>
          </div>
        </>
      )}

      <p className="ticket-reasoning">{s.reasoning}</p>

      <div className="ticket-foot">
        <span><Clock size={12} /> {s.timeframe || "Ngắn hạn"}</span>
        <span>{fmtDate(s.createdAt)}</span>
      </div>

      {mode === "signals" && (
        <button className={`btn-track ${s.selected ? "btn-track-active" : ""}`} onClick={() => onToggle(s.id)}>
          {s.selected ? <><CheckCircle2 size={14} /> Đang theo dõi</> : "+ Chọn theo dõi"}
        </button>
      )}
    </div>
  );
}

function WinRateGauge({ wins, losses }: any) {
  const total = wins + losses;
  const pct = total > 0 ? (wins / total) * 100 : 0;
  const r = 64;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="winrate-gauge">
      <svg viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
        <circle
          cx="80" cy="80" r={r} fill="none" stroke="url(#wr-grad)" strokeWidth="12"
          strokeDasharray={c} strokeDashoffset={total > 0 ? offset : c}
          strokeLinecap="round" transform="rotate(-90 80 80)"
        />
        <defs>
          <linearGradient id="wr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--teal)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="winrate-center">
        <div className="winrate-pct">{total > 0 ? pct.toFixed(0) : "—"}{total > 0 ? "%" : ""}</div>
        <div className="winrate-label">tỷ lệ thắng</div>
      </div>
    </div>
  );
}

function MiniTicker({ ticker }: any) {
  if (!ticker) return null;
  const items = [
    { id: "bitcoin", label: "BTC" },
    { id: "ethereum", label: "ETH" },
    { id: "solana", label: "SOL" },
  ];
  return (
    <div className="mini-ticker">
      <Radio size={12} className="live-dot" />
      {items.map((it) => {
        const d = ticker[it.id];
        if (!d) return null;
        const up = (d.usd_24h_change || 0) >= 0;
        return (
          <span key={it.id} className="tick-item">
            <b>{it.label}</b> {fmtUsd(d.usd)}
            <span className={up ? "tick-up" : "tick-down"}>
              {up ? "▲" : "▼"} {Math.abs(d.usd_24h_change || 0).toFixed(1)}%
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default function SignalLab() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("signals");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [ticker, setTicker] = useState<any>(null);
  const [capFilter, setCapFilter] = useState("all");
  const signalsRef = useRef(signals);

  useEffect(() => { signalsRef.current = signals; }, [signals]);

  useEffect(() => {
    (async () => {
      try {
        const stored = localStorage.getItem("all-signals");
        if (stored) setSignals(JSON.parse(stored));
      } catch (e) {
        // no data yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (updated: any) => {
    setSignals(updated);
    signalsRef.current = updated;
    try {
      localStorage.setItem("all-signals", JSON.stringify(updated));
    } catch (e) {
      console.error("Lỗi lưu dữ liệu:", e);
    }
  }, []);

  const generateSignals = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    try {
      // Gọi API nội bộ thay vì gọi trực tiếp Anthropic (vì cần API Key và tránh lỗi CORS)
      // Endpoint này sẽ sử dụng Gemini API sẵn có ở backend hoặc chuyển tiếp lên AI
      const res = await axios.post("/api/ai/generate-signals", { prompt: SYSTEM_PROMPT });
      
      let parsed = [];
      if (res.data && res.data.success) {
          const text = res.data.analysis;
          const match = text.match(/\[[\s\S]*\]/);
          if (!match) throw new Error("Không đọc được phản hồi JSON từ AI, thử lại nhé.");
          parsed = JSON.parse(match[0]);
      } else {
          throw new Error(res.data?.error || "Lỗi tạo tín hiệu");
      }

      const now = new Date().toISOString();
      const fresh = parsed.map((p: any) => ({
        id: uid(),
        coinId: p.coinId,
        symbol: (p.symbol || "").toUpperCase(),
        name: p.name || p.symbol || "",
        cap: p.cap === "small" ? "small" : "large",
        entryPrice: Number(p.entryPrice),
        stopLoss: Number(p.stopLoss),
        takeProfit: Number(p.takeProfit),
        confidence: p.confidence || "medium",
        timeframe: p.timeframe || "Ngắn hạn",
        reasoning: p.reasoning || "",
        createdAt: now,
        status: "pending",
        closedAt: null,
        closedPrice: null,
        currentPrice: null,
        selected: false,
      }));
      await persist([...fresh, ...signalsRef.current]);
      setTab("signals");
    } catch (e: any) {
      setGenError(e.message || "Có lỗi xảy ra khi tạo tín hiệu.");
    } finally {
      setGenerating(false);
    }
  }, [persist]);

  const refreshPrices = useCallback(async () => {
    const pending = signalsRef.current.filter((s) => s.status === "pending" && s.selected);
    if (pending.length === 0) return;
    setRefreshing(true);
    setTrackError(null);
    try {
      const ids = [...new Set(pending.map((s) => s.coinId))].join(",");
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      if (!res.ok) throw new Error("Không lấy được giá thời gian thực.");
      const prices = await res.json();
      const now = new Date().toISOString();
      const updated = signalsRef.current.map((s) => {
        if (s.status !== "pending") return s;
        const cp = prices[s.coinId] && prices[s.coinId].usd;
        if (cp === undefined) return s;
        if (cp >= s.takeProfit) return { ...s, currentPrice: cp, status: "win", closedAt: now, closedPrice: cp };
        if (cp <= s.stopLoss) return { ...s, currentPrice: cp, status: "loss", closedAt: now, closedPrice: cp };
        return { ...s, currentPrice: cp };
      });
      await persist(updated);
    } catch (e: any) {
      setTrackError(e.message || "Có lỗi khi cập nhật giá.");
    } finally {
      setRefreshing(false);
    }
  }, [persist]);

  useEffect(() => {
    if (tab !== "tracking") return;
    refreshPrices();
    const id = setInterval(refreshPrices, 30000);
    return () => clearInterval(id);
  }, [tab, refreshPrices]);

  useEffect(() => {
    const fetchTicker = async () => {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true");
        if (res.ok) setTicker(await res.json());
      } catch (e) { /* ambient ticker, fail silently */ }
    };
    fetchTicker();
    const id = setInterval(fetchTicker, 45000);
    return () => clearInterval(id);
  }, []);

  const toggleSelect = useCallback(async (id: string) => {
    const updated = signalsRef.current.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s));
    await persist(updated);
  }, [persist]);

  const clearAll = async () => {
    if (!window.confirm("Xóa toàn bộ lịch sử tín hiệu? Hành động này không thể hoàn tác.")) return;
    await persist([]);
  };

  const tracked = signals.filter((s) => s.selected);
  const wins = tracked.filter((s) => s.status === "win").length;
  const losses = tracked.filter((s) => s.status === "loss").length;
  const pendingTracked = tracked.filter((s) => s.status === "pending").length;
  const visibleSignals = signals.filter((s) => capFilter === "all" || s.cap === capFilter);

  return (
    <div className="sl-app">
      <style>{`
        .sl-app {
          --gold: #E8A94B;
          --teal: #3FC7B4;
          --success: #3ECF8E;
          --danger: #F2555F;
          min-height: 100vh;
          padding: 0 0 48px;
        }
        .sl-app * { box-sizing: border-box; }
        .sl-app .disp { font-family: 'Space Grotesk', sans-serif; }
        .sl-app .mono { font-family: 'IBM Plex Mono', monospace; }

        .sl-header {
          position: sticky; top: 0; z-index: 10;
          background: rgba(14,18,25,0.9); backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--border);
          padding: 16px 24px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
        }
        .sl-logo { display: flex; align-items: center; gap: 10px; }
        .sl-logo-mark {
          width: 34px; height: 34px; border-radius: 8px;
          background: linear-gradient(135deg, var(--gold), var(--teal));
          display: flex; align-items: center; justify-content: center; color: #10141B; font-weight: 700;
        }
        .sl-logo-text .t1 { font-size: 16px; font-weight: 700; letter-spacing: 0.3px; line-height: 1.1; color: var(--text-primary); }
        .sl-logo-text .t2 { font-size: 11px; color: var(--text-muted); }

        .mini-ticker { display: flex; align-items: center; gap: 16px; font-size: 12px; color: var(--text-muted); flex-wrap: wrap; }
        .live-dot { color: var(--danger); animation: pulse 1.6s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.35;} }
        .tick-item { display: flex; gap: 6px; align-items: center; font-family: 'IBM Plex Mono', monospace; color: var(--text-primary); }
        .tick-item b { color: var(--text-muted); font-family: 'Inter', sans-serif; }
        .tick-up { color: var(--success); } .tick-down { color: var(--danger); }

        .sl-tabs { display: flex; gap: 4px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 4px; }
        .sl-tab { border: none; background: transparent; color: var(--text-muted); font-family: 'Inter'; font-weight: 600; font-size: 13px; padding: 8px 16px; border-radius: 7px; cursor: pointer; transition: all .15s; }
        .sl-tab.active { background: rgba(255,255,255,0.05); color: var(--text-primary); box-shadow: inset 0 0 0 1px var(--border); }
        .sl-tab:hover:not(.active) { color: var(--text-primary); }

        .sl-main { max-width: 1080px; margin: 0 auto; padding: 40px 24px 0; }

        .hero { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 32px; flex-wrap: wrap; }
        .hero h1 { font-size: 30px; margin: 0 0 8px; font-weight: 700; color: var(--text-primary); }
        .hero p { color: var(--text-muted); margin: 0; max-width: 520px; font-size: 14px; line-height: 1.6; }
        .disclaimer { font-size: 11.5px; color: var(--text-muted); margin-top: 10px; display: flex; gap: 6px; align-items: flex-start; max-width: 520px; }
        .disclaimer svg { flex: none; margin-top: 1px; }

        .btn-primary {
          display: flex; align-items: center; gap: 8px; border: none; cursor: pointer;
          background: linear-gradient(135deg, var(--gold), #d9922e); color: #17120A;
          font-weight: 700; font-size: 14px; padding: 12px 20px; border-radius: 10px;
          transition: transform .12s, opacity .12s;
        }
        .btn-primary:hover { transform: translateY(-1px); }
        .btn-primary:disabled { opacity: .6; cursor: not-allowed; transform: none; }

        .btn-ghost {
          display: flex; align-items: center; gap: 6px; border: 1px solid var(--border); background: var(--bg-card);
          color: var(--text-muted); font-size: 13px; font-weight: 600; padding: 9px 14px; border-radius: 9px; cursor: pointer;
        }
        .btn-ghost:hover { color: var(--text-primary); border-color: #3a4356; }
        .btn-ghost:disabled { opacity: .5; cursor: not-allowed; }

        .err-box { background: rgba(242,85,95,0.08); border: 1px solid rgba(242,85,95,0.35); color: #f6a3a8; padding: 12px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 20px; }

        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; margin-bottom: 8px; }

        .ticket {
          position: relative; overflow: hidden;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 18px;
          display: flex; flex-direction: column; gap: 14px; color: var(--text-primary);
        }
        .ticket-closed { opacity: 0.88; }
        .ticket-selected { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold); }

        .cap-pill { font-size: 9px; font-weight: 700; letter-spacing: 0.3px; padding: 2px 7px; border-radius: 999px; margin-left: 8px; vertical-align: middle; border: 1px solid; }
        .cap-large { color: var(--teal); border-color: var(--teal); background: rgba(63,199,180,0.08); }
        .cap-small { color: #c98bd6; border-color: #c98bd6; background: rgba(201,139,214,0.08); }

        .filter-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
        .chip-group { display: flex; gap: 8px; }
        .chip { border: 1px solid var(--border); background: var(--bg-card); color: var(--text-muted); font-size: 12px; font-weight: 600; padding: 7px 13px; border-radius: 999px; cursor: pointer; }
        .chip-active { color: var(--bg-body); background: var(--text-primary); border-color: var(--text-primary); }
        .select-hint { font-size: 12px; color: var(--text-muted); }
        .select-hint b { color: var(--gold); }

        .btn-track { border: 1px solid var(--border); background: transparent; color: var(--text-muted); font-size: 12.5px; font-weight: 600; padding: 9px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .btn-track:hover { border-color: var(--gold); color: var(--gold); }
        .btn-track-active { border-color: var(--gold); color: var(--gold); background: rgba(232,169,75,0.08); }
        .stamp {
          position: absolute; top: 18px; right: -34px; transform: rotate(35deg);
          font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 12px; letter-spacing: 2px;
          padding: 3px 40px; border: 2px solid; opacity: 0.9;
        }
        .stamp-win { color: var(--success); border-color: var(--success); }
        .stamp-loss { color: var(--danger); border-color: var(--danger); }

        .ticket-head { display: flex; justify-content: space-between; align-items: flex-start; }
        .ticket-symbol { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 20px; }
        .ticket-name { font-size: 12px; color: var(--text-muted); }

        .badge { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; padding: 4px 8px; border-radius: 999px; border: 1px solid; white-space: nowrap; }
        .conf-high { color: var(--teal); border-color: var(--teal); background: rgba(63,199,180,0.08); }
        .conf-medium { color: var(--gold); border-color: var(--gold); background: rgba(232,169,75,0.08); }
        .conf-low { color: var(--text-muted); border-color: var(--border); }

        .ticket-row { display: flex; border-top: 1px dashed var(--border); border-bottom: 1px dashed var(--border); padding: 12px 0; }
        .ticket-cell { flex: 1; display: flex; flex-direction: column; gap: 4px; align-items: center; text-align: center; }
        .ticket-cell:not(:last-child) { border-right: 1px solid var(--border); }
        .cell-label { font-size: 10px; color: var(--text-muted); display: flex; gap: 4px; align-items: center; justify-content: center; }
        .cell-value { font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 2px; }
        .cell-success { color: var(--success); }
        .cell-danger { color: var(--danger); }

        .gauge { display: flex; flex-direction: column; gap: 6px; }
        .gauge-track { position: relative; height: 6px; border-radius: 3px; background: linear-gradient(90deg, var(--danger), var(--border) 50%, var(--success)); }
        .gauge-fill { display: none; }
        .gauge-entry { position: absolute; top: -3px; width: 2px; height: 12px; background: var(--text-primary); }
        .gauge-current { position: absolute; top: -5px; width: 10px; height: 10px; margin-left: -5px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 0 3px rgba(232,169,75,0.25); }
        .gauge-labels { display: flex; justify-content: space-between; font-size: 10px; font-family: 'IBM Plex Mono', monospace; color: var(--text-muted); }

        .ticket-current { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border-radius: 8px; padding: 8px 10px; }

        .ticket-reasoning { font-size: 12.5px; color: var(--text-muted); line-height: 1.55; margin: 0; }
        .ticket-foot { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-muted); }
        .ticket-foot span { display: flex; align-items: center; gap: 4px; }

        .empty { text-align: center; padding: 60px 20px; color: var(--text-muted); border: 1px dashed var(--border); border-radius: 14px; }
        .empty .disp { color: var(--text-primary); font-size: 18px; margin-bottom: 6px; }

        .stat-strip { display: grid; grid-template-columns: 1.2fr repeat(3, 1fr); gap: 16px; margin-bottom: 32px; align-items: stretch; }
        .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
        .stat-num { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: var(--text-primary); }
        .stat-label { font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .winrate-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 12px 18px; display: flex; align-items: center; gap: 16px; }
        .winrate-gauge { position: relative; width: 100px; height: 100px; }
        .winrate-gauge svg { width: 100px; height: 100px; }
        .winrate-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .winrate-pct { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 20px; color: var(--text-primary); }
        .winrate-label { font-size: 9.5px; color: var(--text-muted); text-transform: uppercase; }
        .winrate-side { display: flex; flex-direction: column; gap: 4px; }
        .winrate-side .disp { font-size: 13px; font-weight: 700; color: var(--text-primary); }
        .winrate-side span { font-size: 11px; color: var(--text-muted); }

        .section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .section-title h2 { font-size: 15px; margin: 0; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.6px; }

        @media (max-width: 720px) {
          .stat-strip { grid-template-columns: 1fr 1fr; }
          .winrate-card { grid-column: span 2; }
        }
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');`}</style>

      <header className="sl-header">
        <div className="sl-logo">
          <div className="sl-logo-mark disp">AI</div>
          <div className="sl-logo-text">
            <div className="t1 disp">ĐÀI TÍN HIỆU AI</div>
            <div className="t2">Backtest độ chính xác của AI trên thị trường thực</div>
          </div>
        </div>
        <MiniTicker ticker={ticker} />
        <div className="sl-tabs">
          <button className={`sl-tab ${tab === "signals" ? "active" : ""}`} onClick={() => setTab("signals")}>Tín hiệu AI</button>
          <button className={`sl-tab ${tab === "tracking" ? "active" : ""}`} onClick={() => setTab("tracking")}>Theo dõi &amp; Thống kê</button>
        </div>
      </header>

      <main className="sl-main">
        {tab === "signals" && (
          <>
            <div className="hero">
              <div>
                <h1 className="disp">Để AI chọn coin, bạn theo dõi kết quả</h1>
                <p>Mỗi lần tạo, AI nghiên cứu thị trường theo thời gian thực và đề xuất 6 đồng coin tiềm năng cho giao dịch ngắn hạn — 3 vốn hóa lớn, 3 vốn hóa nhỏ/vừa — kèm giá mua, giá cắt lỗ và giá chốt lời cụ thể. Chọn những đồng bạn muốn kiểm chứng để chuyển sang tab theo dõi.</p>
                <div className="disclaimer"><Info size={13} /> Đây là công cụ thử nghiệm để đánh giá khả năng phân tích của AI, không phải lời khuyên đầu tư. Tự chịu trách nhiệm với quyết định giao dịch của bạn.</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
                <button className="btn-primary" onClick={generateSignals} disabled={generating}>
                  {generating ? <Loader2 size={16} className="mono" style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={16} />}
                  {generating ? "AI đang nghiên cứu..." : "Tạo tín hiệu mới"}
                </button>
                {signals.length > 0 && (
                  <button className="btn-ghost" onClick={clearAll}><Trash2 size={13} /> Xóa lịch sử</button>
                )}
              </div>
            </div>

            {genError && <div className="err-box">{genError}</div>}

            {signals.length > 0 && (
              <div className="filter-row">
                <div className="chip-group">
                  <button className={`chip ${capFilter === "all" ? "chip-active" : ""}`} onClick={() => setCapFilter("all")}>Tất cả</button>
                  <button className={`chip ${capFilter === "large" ? "chip-active" : ""}`} onClick={() => setCapFilter("large")}>Vốn hóa lớn</button>
                  <button className={`chip ${capFilter === "small" ? "chip-active" : ""}`} onClick={() => setCapFilter("small")}>Vốn hóa nhỏ</button>
                </div>
                <div className="select-hint">Đã chọn theo dõi: <b>{tracked.length}</b> / {signals.length}</div>
              </div>
            )}

            {!loaded ? (
              <div className="empty">Đang tải dữ liệu...</div>
            ) : signals.length === 0 ? (
              <div className="empty">
                <div className="disp">Chưa có tín hiệu nào</div>
                <div>Bấm "Tạo tín hiệu mới" để AI nghiên cứu và đề xuất coin từ vốn hóa lớn đến nhỏ.</div>
              </div>
            ) : (
              <div className="grid">
                {visibleSignals.map((s) => <SignalTicket key={s.id} s={s} mode="signals" onToggle={toggleSelect} />)}
              </div>
            )}
          </>
        )}

        {tab === "tracking" && (
          <>
            <div className="hero">
              <div>
                <h1 className="disp">AI đúng bao nhiêu phần trăm?</h1>
                <p>Chỉ những coin bạn chọn theo dõi ở tab "Tín hiệu AI" mới xuất hiện ở đây. Giá được đối chiếu theo thời gian thực — THẮNG khi giá chạm chốt lời trước, THUA khi giá chạm cắt lỗ trước.</p>
              </div>
              <button className="btn-ghost" onClick={refreshPrices} disabled={refreshing}>
                <RefreshCw size={14} style={refreshing ? { animation: "spin 1s linear infinite" } : {}} />
                {refreshing ? "Đang cập nhật..." : "Cập nhật giá"}
              </button>
            </div>

            {trackError && <div className="err-box">{trackError}</div>}

            <div className="stat-strip">
              <div className="winrate-card">
                <WinRateGauge wins={wins} losses={losses} />
                <div className="winrate-side">
                  <span className="disp">{wins + losses} tín hiệu đã đóng</span>
                  <span>{wins} thắng · {losses} thua</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-num disp">{tracked.length}</div>
                <div className="stat-label">Đang theo dõi</div>
              </div>
              <div className="stat-card">
                <div className="stat-num disp" style={{ color: "var(--success)" }}>{wins}</div>
                <div className="stat-label">Thắng</div>
              </div>
              <div className="stat-card">
                <div className="stat-num disp" style={{ color: "var(--gold)" }}>{pendingTracked}</div>
                <div className="stat-label">Đang mở</div>
              </div>
            </div>

            {tracked.length === 0 ? (
              <div className="empty">
                <div className="disp">Chưa chọn coin nào để theo dõi</div>
                <div>Sang tab "Tín hiệu AI" và bấm "Chọn theo dõi" trên những tín hiệu bạn muốn kiểm chứng.</div>
              </div>
            ) : (
              <div className="grid">
                {tracked.map((s) => <SignalTicket key={s.id} s={s} mode="tracking" />)}
              </div>
            )}
          </>
        )}
      </main>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
