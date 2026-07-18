/**
 * priceAlertEngine.js
 * ------------------------------------------------------------------
 * Thay vì "giá chạm X thì báo", hệ thống dùng ATR (Average True Range)
 * để đo biến động thực tế, từ đó xác định vùng kháng cự/hỗ trợ có ý
 * nghĩa thống kê và phát hiện sớm khả năng phá vỡ (breakout) khi có
 * volume xác nhận đi kèm.
 * ------------------------------------------------------------------
 */

const { askAI } = require("./aiClient");
const { detectVolumeSpike } = require("./indicatorAnalyzer");

/**
 * Tính ATR từ mảng nến (candles) gần nhất.
 * candles: [{ high, low, close }], đã sắp xếp theo thời gian tăng dần.
 * period mặc định 14 (chuẩn ATR).
 */
function computeATR(candles, period = 14) {
  if (candles.length < period + 1) return null;

  const trueRanges = [];
  for (let i = 1; i < candles.length; i++) {
    const { high, low } = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  const lastPeriod = trueRanges.slice(-period);
  const atr = lastPeriod.reduce((sum, v) => sum + v, 0) / lastPeriod.length;
  return atr;
}

/** Phân loại chế độ biến động dựa trên ATR% (ATR / giá hiện tại). */
function classifyVolatility(atr, price) {
  const atrPct = (atr / price) * 100;
  let level = "LOW";
  if (atrPct >= 5) level = "EXTREME";
  else if (atrPct >= 3) level = "HIGH";
  else if (atrPct >= 1.5) level = "MODERATE";
  return { atrPct: Number(atrPct.toFixed(2)), level };
}

/**
 * Xác định breakout tiềm năng:
 * - Giá tiến gần / vượt vùng kháng cự hoặc hỗ trợ (trong biên độ 1 ATR)
 * - Có xác nhận volume (spike) đi kèm -> tăng độ tin cậy
 */
function detectBreakoutSignal({ price, resistance, support, atr, volume24h, avgVolume }) {
  const volumeInfo = detectVolumeSpike(volume24h, avgVolume);
  const nearResistance = resistance != null && price >= resistance - atr && price <= resistance + atr;
  const nearSupport = support != null && price <= support + atr && price >= support - atr;

  if (nearResistance && volumeInfo.isSpike) {
    return { type: "RESISTANCE_BREAKOUT_LIKELY", confirmed: true, volumeInfo, level: resistance };
  }
  if (nearResistance) {
    return { type: "APPROACHING_RESISTANCE", confirmed: false, volumeInfo, level: resistance };
  }
  if (nearSupport && volumeInfo.isSpike) {
    return { type: "SUPPORT_BREAKDOWN_LIKELY", confirmed: true, volumeInfo, level: support };
  }
  if (nearSupport) {
    return { type: "APPROACHING_SUPPORT", confirmed: false, volumeInfo, level: support };
  }
  return { type: "NO_SIGNIFICANT_LEVEL", confirmed: false, volumeInfo, level: null };
}

/** Cắt cứng về đúng giới hạn số từ, phòng trường hợp AI viết dài hơn yêu cầu. */
function trimToWordLimit(text, limit = 50) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ") + "…";
}

const ALERT_SYSTEM_PROMPT = `
Bạn là một nhà quản trị rủi ro chuyên nghiệp. Bạn nhận dữ liệu JSON của 1 đồng coin đang được giữ trong danh mục đầu tư (giá mua, giá hiện tại, PNL%, ATR, vùng hỗ trợ/kháng cự, tín hiệu breakout).

QUY TẮC PHẢN HỒI JSON:
1. Bạn BẮT BUỘC phải trả về đúng chuẩn JSON với cấu trúc:
{
  "action": "DCA" | "SELL" | "HOLD" | "TAKE_PROFIT" | "STOP_LOSS",
  "reason": "Lý do cực kỳ ngắn gọn, sắc bén, tối đa 40 từ"
}
2. Dựa vào Giá mua (entry) và PNL%:
   - Nếu đang lỗ sâu nhưng gần Hỗ trợ cứng + Volatility thấp: nên DCA hoặc HOLD.
   - Nếu đang lỗ và thủng Hỗ trợ cứng + Volatility cao: STOP_LOSS.
   - Nếu đang lời và gần Kháng cự cứng: TAKE_PROFIT.
   - Nếu giá đang breakout: HOLD hoặc BUY.
3. KHÔNG trả về bất kỳ text nào nằm ngoài JSON.
`.trim();

/**
 * Hàm chính: kết hợp dữ liệu realtime + AI -> trả về alert ngắn.
 * Nếu không có tín hiệu đáng kể (NO_SIGNIFICANT_LEVEL), trả về null
 * để tránh spam thông báo vô nghĩa.
 */
async function generateSmartAlert(coinRealtimeData) {
  const { symbol, price, entryPrice, pnlPct, resistance, support, candles, volume24h, avgVolume } = coinRealtimeData;

  const atr = computeATR(candles);
  if (atr == null) return null; // không đủ dữ liệu lịch sử để tính ATR đáng tin cậy

  const volatility = classifyVolatility(atr, price);
  const breakout = detectBreakoutSignal({ price, resistance, support, atr, volume24h, avgVolume });

  const userPrompt = JSON.stringify({
    symbol,
    currentPrice: price,
    entryPrice: entryPrice || price,
    pnlPct: pnlPct || 0,
    atr: Number(atr.toFixed(4)),
    volatility,
    breakout,
    supportLevel: support,
    resistanceLevel: resistance
  });

  const rawText = await askAI(ALERT_SYSTEM_PROMPT, userPrompt, { maxTokens: 150, temperature: 0.2 });
  
  let resultObj = { action: 'HOLD', reason: 'Tiếp tục theo dõi' };
  try {
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    if(parsed.action) resultObj.action = parsed.action;
    if(parsed.reason) resultObj.reason = parsed.reason;
  } catch(e) {
    resultObj.reason = trimToWordLimit(rawText, 40);
  }

  return {
    symbol,
    action: resultObj.action,
    text: resultObj.reason,
    meta: { atr, volatility, breakout },
  };
}

module.exports = {
  computeATR,
  classifyVolatility,
  detectBreakoutSignal,
  trimToWordLimit,
  generateSmartAlert,
};
