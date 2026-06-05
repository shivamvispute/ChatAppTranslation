const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function translate(text, targetLang, sourceLang = null) {
  if (!text || !text.trim()) return { translatedText: text, detectedLanguage: sourceLang, source: 'passthrough', latencyMs: 0, cacheHit: false };
  try {
    const { data } = await axios.post(`${ML_SERVICE_URL}/translate/`, {
      text,
      targetLang,
      sourceLang,
    }, { timeout: 8000 });
    return data;
  } catch (err) {
    console.error('ML service translate error:', err.message);
    // Final fallback: return original text
    return { translatedText: text, detectedLanguage: sourceLang, source: 'error_fallback', latencyMs: 0, cacheHit: false };
  }
}

async function detectLanguage(text) {
  try {
    const { data } = await axios.post(`${ML_SERVICE_URL}/detect/`, { text }, { timeout: 5000 });
    return data.language || 'EN';
  } catch {
    return null;
  }
}

async function indexMessage(messageId, roomId, text, senderUsername, timestamp) {
  try {
    await axios.post(`${ML_SERVICE_URL}/search/index`, {
      messageId: String(messageId),
      roomId: String(roomId),
      text,
      senderUsername,
      timestamp: String(timestamp),
    }, { timeout: 5000 });
  } catch (err) {
    // Non-blocking — indexing failure doesn't break chat
    console.error('ML index error:', err.message);
  }
}

async function semanticSearch(query, roomId, topK = 5) {
  const { data } = await axios.post(`${ML_SERVICE_URL}/search/query`, {
    query,
    roomId: String(roomId),
    topK,
  }, { timeout: 8000 });
  return data.results || [];
}

async function getMLMetrics() {
  const { data } = await axios.get(`${ML_SERVICE_URL}/metrics/`, { timeout: 3000 });
  return data;
}

module.exports = { translate, detectLanguage, indexMessage, semanticSearch, getMLMetrics };
