/**
 * aiClient.js
 * Wrapper dùng Gemini 2.0 Pro thay cho Anthropic.
 */

let currentGeminiKey = null;

function setGeminiKey(key) {
  currentGeminiKey = key;
}

const DEFAULT_MODEL = "gemini-2.0-pro-exp";
const BACKUP_MODEL = "gemini-1.5-pro";

/**
 * Gọi AI với system prompt + user prompt, trả về text thuần.
 */
async function askAI(system, userPrompt, opts = {}) {
  if (!currentGeminiKey) {
    throw new Error("Chưa cấu hình Gemini API Key");
  }

  const { maxTokens = 500, temperature = 0.2 } = opts;

  const body = JSON.stringify({
    contents: [
      { role: "user", parts: [{ text: system + "\n\n" + userPrompt }] }
    ],
    generationConfig: { temperature, maxOutputTokens: maxTokens }
  });

  const models = [DEFAULT_MODEL, BACKUP_MODEL];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentGeminiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
      });

      if (response.status === 429 || response.status === 404) {
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;

      return text.trim();
    } catch (err) {
      lastError = err;
    }
  }
  
  throw new Error(`Tất cả model Gemini đều lỗi hoặc bị giới hạn: ${lastError?.message}`);
}

/**
 * Gọi AI và ép trả JSON thuần.
 */
async function askAIJson(system, userPrompt, opts = {}) {
  const strictSystem = `${system}\n\nQUAN TRỌNG: Chỉ trả về JSON hợp lệ, không kèm markdown, không kèm giải thích, không dùng \`\`\`. Bắt buộc phải là JSON thuần.`;
  const raw = await askAI(strictSystem, userPrompt, opts);
  
  // Dọn dẹp markdown block nếu AI vô tình sinh ra
  const cleaned = raw.replace(/```json|```/g, "").trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`AI trả về JSON không hợp lệ: ${err.message}\nRaw: ${cleaned}`);
  }
}

module.exports = { askAI, askAIJson, setGeminiKey };
