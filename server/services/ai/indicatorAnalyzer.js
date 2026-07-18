/**
 * indicatorAnalyzer.js
 * ------------------------------------------------------------------
 * NGUYÊN TẮC THIẾT KẾ (quan trọng):
 * LLM KHÔNG được giao việc "tự tính toán" xem RSI/MACD/Volume có bất
 * thường hay không — LLM tính toán số học rất kém và hay bịa số liệu
 * (hallucination). Vì vậy toàn bộ logic phân loại tín hiệu (Overbought,
 * Oversold, Volume Spike, MACD Cross...) được xử lý 100% bằng code
 * thuần (deterministic). AI chỉ được gọi ở bước SAU CÙNG để "diễn giải"
 * và viết nhận định bằng ngôn ngữ tự nhiên dựa trên các nhãn đã có sẵn.
 * Cách này loại bỏ gần như hoàn toàn hiện tượng AI "phán bừa".
 * ------------------------------------------------------------------
 */

const THRESHOLDS = {
  RSI_OVERBOUGHT: 70,
  RSI_OVERSOLD: 30,
  RSI_APPROACHING_OB: 65, // vùng cảnh báo sớm
  RSI_APPROACHING_OS: 35,
  VOLUME_SPIKE_MULTIPLIER: 2, // volume hiện tại >= 2x volume trung bình
  VOLUME_SPIKE_STRONG_MULTIPLIER: 3.5,
};

/** Phân loại RSI */
function classifyRSI(rsi) {
  if (rsi >= THRESHOLDS.RSI_OVERBOUGHT) return "OVERBOUGHT";
  if (rsi <= THRESHOLDS.RSI_OVERSOLD) return "OVERSOLD";
  if (rsi >= THRESHOLDS.RSI_APPROACHING_OB) return "APPROACHING_OVERBOUGHT";
  if (rsi <= THRESHOLDS.RSI_APPROACHING_OS) return "APPROACHING_OVERSOLD";
  return "NEUTRAL";
}

/**
 * Phân loại MACD.
 * macd: { macdLine, signalLine, histogram, prevHistogram? }
 * Nếu có prevHistogram -> phát hiện điểm giao cắt (cross) chính xác hơn.
 */
function classifyMACD(macd) {
  const { macdLine, signalLine, histogram, prevHistogram } = macd;

  if (typeof prevHistogram === "number") {
    if (prevHistogram <= 0 && histogram > 0) return "BULLISH_CROSS";
    if (prevHistogram >= 0 && histogram < 0) return "BEARISH_CROSS";
  }

  if (histogram > 0 && macdLine > signalLine) return "BULLISH_MOMENTUM";
  if (histogram < 0 && macdLine < signalLine) return "BEARISH_MOMENTUM";
  return "NEUTRAL";
}

/**
 * Phát hiện đột biến khối lượng.
 * avgVolume nên là trung bình 20 phiên (hoặc 7 ngày). Nếu hệ thống chưa
 * lưu avgVolume, có thể tạm dùng volume24h của kỳ trước làm baseline.
 */
function detectVolumeSpike(currentVolume, avgVolume) {
  if (!avgVolume || avgVolume <= 0) {
    return { isSpike: false, ratio: null, level: "UNKNOWN" };
  }
  const ratio = currentVolume / avgVolume;
  let level = "NORMAL";
  if (ratio >= THRESHOLDS.VOLUME_SPIKE_STRONG_MULTIPLIER) level = "STRONG_SPIKE";
  else if (ratio >= THRESHOLDS.VOLUME_SPIKE_MULTIPLIER) level = "SPIKE";
  return { isSpike: ratio >= THRESHOLDS.VOLUME_SPIKE_MULTIPLIER, ratio: Number(ratio.toFixed(2)), level };
}

/**
 * Đánh giá độ đồng thuận đa khung thời gian (1h / 24h / 7d).
 * Dùng để phân biệt "biến động nhất thời" với "xu hướng thật".
 */
function analyzeMomentumAlignment({ change1h, change24h, change7d }) {
  const signs = [change1h, change24h, change7d].map((v) => Math.sign(v));
  const allPositive = signs.every((s) => s > 0);
  const allNegative = signs.every((s) => s < 0);
  if (allPositive) return "ALIGNED_UPTREND";
  if (allNegative) return "ALIGNED_DOWNTREND";
  // Đảo chiều gần đây: 1h ngược dấu với 7d
  if (Math.sign(change1h) !== 0 && Math.sign(change1h) !== Math.sign(change7d)) {
    return "POSSIBLE_REVERSAL";
  }
  return "MIXED";
}

/**
 * Hàm chính: nhận 1 coin (đã có đủ chỉ số) -> trả về object tín hiệu
 * đầy đủ, có điểm số (score) để dùng cho việc xếp hạng/lọc.
 *
 * coin = {
 *   symbol, price, volume24h, avgVolume,
 *   change1h, change24h, change7d,
 *   rsi, macd: { macdLine, signalLine, histogram, prevHistogram }
 * }
 */
function analyzeCoin(coin) {
  const rsiLabel = classifyRSI(coin.rsi);
  const macdLabel = classifyMACD(coin.macd);
  const volumeInfo = detectVolumeSpike(coin.volume24h, coin.avgVolume);
  const momentum = analyzeMomentumAlignment(coin);

  let score = 0; // dương = thiên về MUA, âm = thiên về BÁN
  const reasons = [];

  if (rsiLabel === "OVERSOLD") {
    score += 2;
    reasons.push(`RSI ${coin.rsi} ở vùng quá bán (<=30)`);
  } else if (rsiLabel === "OVERBOUGHT") {
    score -= 2;
    reasons.push(`RSI ${coin.rsi} ở vùng quá mua (>=70)`);
  } else if (rsiLabel === "APPROACHING_OVERSOLD") {
    score += 1;
    reasons.push(`RSI ${coin.rsi} đang tiến gần vùng quá bán`);
  } else if (rsiLabel === "APPROACHING_OVERBOUGHT") {
    score -= 1;
    reasons.push(`RSI ${coin.rsi} đang tiến gần vùng quá mua`);
  }

  if (macdLabel === "BULLISH_CROSS") {
    score += 2;
    reasons.push("MACD vừa cắt lên đường tín hiệu (bullish cross)");
  } else if (macdLabel === "BEARISH_CROSS") {
    score -= 2;
    reasons.push("MACD vừa cắt xuống đường tín hiệu (bearish cross)");
  } else if (macdLabel === "BULLISH_MOMENTUM") {
    score += 1;
    reasons.push("MACD đang trong pha động lượng tăng");
  } else if (macdLabel === "BEARISH_MOMENTUM") {
    score -= 1;
    reasons.push("MACD đang trong pha động lượng giảm");
  }

  if (volumeInfo.isSpike) {
    // Volume spike khuếch đại tín hiệu hiện có thay vì tự quyết định hướng
    score += Math.sign(score) * (volumeInfo.level === "STRONG_SPIKE" ? 2 : 1);
    reasons.push(
      `Khối lượng giao dịch đột biến x${volumeInfo.ratio} so với trung bình (${volumeInfo.level})`
    );
  }

  if (momentum === "POSSIBLE_REVERSAL") {
    reasons.push("Biến động 1h đang đảo chiều so với xu hướng 7 ngày — cần theo dõi sát");
  }

  let action = "WATCH";
  if (score >= 3) action = "BUY";
  else if (score <= -3) action = "SELL";
  else if (score === 0 && !volumeInfo.isSpike) action = "NEUTRAL";

  return {
    symbol: coin.symbol,
    action, // BUY | SELL | WATCH | NEUTRAL
    score,
    signals: { rsiLabel, macdLabel, volumeInfo, momentum },
    reasons,
  };
}

module.exports = {
  THRESHOLDS,
  classifyRSI,
  classifyMACD,
  detectVolumeSpike,
  analyzeMomentumAlignment,
  analyzeCoin,
};
