const axios = require('axios');

// In-memory cache: "text|targetLang" -> translatedText
const cache = new Map();
const MAX_CACHE_SIZE = 500;

const DEEPL_URL = 'https://api-free.deepl.com/v2/translate';

async function translate(text, targetLang, sourceLang = null) {
  if (!text || !text.trim()) return { translatedText: text, detectedLanguage: sourceLang };

  const normalizedTarget = targetLang.toUpperCase();
  const cacheKey = `${text}|${normalizedTarget}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const params = {
      auth_key: process.env.DEEPL_API_KEY,
      text,
      target_lang: normalizedTarget,
    };
    if (sourceLang) params.source_lang = sourceLang.toUpperCase();

    const { data } = await axios.post(DEEPL_URL, null, { params });
    const translation = data.translations[0];
    const result = {
      translatedText: translation.text,
      detectedLanguage: translation.detected_source_language,
    };

    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(cacheKey, result);

    return result;
  } catch (err) {
    // Return original text on failure so chat still works
    console.error('DeepL error:', err.response?.data || err.message);
    return { translatedText: text, detectedLanguage: sourceLang };
  }
}

async function detectLanguage(text) {
  try {
    // Translate to English just to get detected language
    const { detectedLanguage } = await translate(text, 'EN');
    return detectedLanguage;
  } catch {
    return null;
  }
}

module.exports = { translate, detectLanguage };
