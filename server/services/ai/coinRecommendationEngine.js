/**
 * coinRecommendationEngine.js
 * ------------------------------------------------------------------
 * Pipeline: Dữ liệu thô -> analyzeCoin() (deterministic) -> lọc ứng viên
 * có tín hiệu thật -> AI chỉ viết phần diễn giải ngắn cho TỪNG ứng viên
 * (không phải cho toàn bộ danh sách, để tránh AI trộn/nhầm số liệu giữa
 * các coin và giảm chi phí token).
 * ------------------------------------------------------------------
 */

const { analyzeCoin } = require("./indicatorAnalyzer");
const { askAIJson } = require("./aiClient");

const RECOMMENDATION_SYSTEM_PROMPT = `
Bạn là một Quant Analyst chuyên phân tích kỹ thuật thị trường Crypto.
Bạn sẽ nhận một object JSON chứa: mã coin, các chỉ số đã được HỆ THỐNG
tính toán sẵn (RSI, MACD, volume spike, xu hướng đa khung thời gian) và
một danh sách "reasons" do hệ thống suy ra.

QUY TẮC BẮT BUỘC:
1. KHÔNG được tự tính toán lại hoặc suy đoán bất kỳ con số nào ngoài
   dữ liệu được cung cấp. Không bịa RSI, giá, % thay đổi.
2. KHÔNG lặp lại chung chung kiểu "đồng coin này tiềm năng, nên theo dõi".
   Phải bám sát vào "reasons" đã cho để giải thích TẠI SAO.
3. Văn phong: chuyên nghiệp, súc tích, tối đa 3 câu, tiếng Việt.
4. Trả về JSON đúng format:
   { "symbol": string, "headline": string, "explanation": string, "confidence": "LOW"|"MEDIUM"|"HIGH" }
   - "confidence" dựa trên số lượng và độ mạnh của reasons (nhiều tín hiệu
     đồng thuận + volume spike => HIGH; 1 tín hiệu đơn lẻ => LOW).
`.trim();

/**
 * Bước 1 (rẻ, nhanh, không cần AI): lọc toàn bộ danh sách coin,
 * chỉ giữ lại những coin có tín hiệu đáng chú ý.
 */
function screenCoins(coinsRawList) {
  return coinsRawList
    .map(analyzeCoin)
    .filter((r) => r.action !== "NEUTRAL")
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
}

/**
 * Bước 2: với top N ứng viên, gọi AI để viết diễn giải.
 * maxCandidates giới hạn số lượng coin gửi cho AI trong 1 request/vòng lặp
 * để kiểm soát chi phí — có thể chạy song song (Promise.all) nếu cần tốc độ.
 */
async function generateRecommendations(coinsRawList, { maxCandidates = 10 } = {}) {
  const candidates = screenCoins(coinsRawList).slice(0, maxCandidates);

  const enriched = await Promise.all(
    candidates.map(async (candidate) => {
      const userPrompt = JSON.stringify({
        symbol: candidate.symbol,
        action: candidate.action,
        signals: candidate.signals,
        reasons: candidate.reasons,
      });

      try {
        const aiNote = await askAIJson(RECOMMENDATION_SYSTEM_PROMPT, userPrompt, {
          maxTokens: 300,
        });
        return { ...candidate, ai: aiNote };
      } catch (err) {
        // Nếu AI lỗi, vẫn trả kết quả deterministic — không để AI làm sập tính năng cốt lõi
        return { ...candidate, ai: null, aiError: err.message };
      }
    })
  );

  return enriched;
}

/**
 * Bước 2 Alternative: Nhận trực tiếp các candidates đã được screen từ frontend 
 * (ví dụ: aiScanPro của app.js có logic đa khung thời gian xịn hơn indicatorAnalyzer).
 */
async function generateRecommendationsFromCandidates(candidates, { maxCandidates = 10 } = {}) {
  const topCandidates = candidates.slice(0, maxCandidates);

  const enriched = await Promise.all(
    topCandidates.map(async (candidate) => {
      const userPrompt = JSON.stringify({
        symbol: candidate.symbol,
        action: candidate.signal || candidate.action,
        signals: candidate.indicators || candidate.signals,
        reasons: candidate.reasons,
      });

      try {
        const aiNote = await askAIJson(RECOMMENDATION_SYSTEM_PROMPT, userPrompt, {
          maxTokens: 300,
        });
        return { ...candidate, ai: aiNote };
      } catch (err) {
        return { ...candidate, ai: null, aiError: err.message };
      }
    })
  );

  return enriched;
}

module.exports = { screenCoins, generateRecommendations, generateRecommendationsFromCandidates };
