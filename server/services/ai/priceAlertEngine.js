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
Bạn là công cụ viết cảnh báo giá crypto ngắn gọn cho một ứng dụng mobile.
Bạn nhận dữ liệu JSON đã được hệ thống tính toán sẵn (giá, ATR, vùng
hỗ trợ/kháng cự, tín hiệu breakout, volume).

QUY TẮC:
1. Chỉ dùng đúng số liệu được cung cấp, không tự suy đoán con số mới.
2. Câu trả lời TỐI ĐA 50 từ, 1-2 câu, tiếng Việt, văn phong cảnh báo
   trực tiếp (như push notification), không mở đầu dài dòng.
3. Nêu rõ: coin nào, đang tiến sát/phá vỡ vùng nào, có volume xác nhận
   hay không.
4. Không đưa lời khuyên "nên mua/nên bán".
`.trim();

/**
 * Hàm chính: kết hợp dữ liệu realtime + AI -> trả về alert ngắn.
 * Nếu không có tín hiệu đáng kể (NO_SIGNIFICANT_LEVEL), trả về null
 * để tránh spam thông báo vô nghĩa.
 */
async function generateSmartAlert(coinRealtimeData) {
  const { symbol, price, resistance, support, candles, volume24h, avgVolume } = coinRealtimeData;

  const atr = computeATR(candles);
  if (atr == null) return null; // không đủ dữ liệu lịch sử để tính ATR đáng tin cậy

  const volatility = classifyVolatility(atr, price);
  const breakout = detectBreakoutSignal({ price, resistance, support, atr, volume24h, avgVolume });

  if (breakout.type === "NO_SIGNIFICANT_LEVEL") return null;

  const userPrompt = JSON.stringify({
    symbol,
    price,
    atr: Number(atr.toFixed(4)),
    volatility,
    breakout,
  });

  const rawText = await askAI(ALERT_SYSTEM_PROMPT, userPrompt, { maxTokens: 120, temperature: 0.3 });
  const text = trimToWordLimit(rawText, 50);

  return {
    symbol,
    text,
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
