const axios = require("axios");

const BASE_URL = process.env.LIBRETRANSLATE_URL || "https://libretranslate.de";
const API_KEY = process.env.LIBRETRANSLATE_API_KEY;

const LANGUAGE_MAP = {
  Kannada: "kn",
  Hindi: "hi",
  Tamil: "ta",
  English: "en",
};

function getLanguageCode(language) {
  const normalized = (language || "").trim();
  return LANGUAGE_MAP[normalized] || normalized.toLowerCase().slice(0, 2);
}

async function translateText(text, targetLang) {
  const target = getLanguageCode(targetLang);
  try {
    const response = await axios.post(
      `${BASE_URL}/translate`,
      {
        q: text,
        source: "auto",
        target,
        format: "text",
        api_key: API_KEY || undefined,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

    return response.data?.translatedText || response.data?.translated || text;
  } catch (error) {
    console.error("translateService error", error?.message || error);
    return text;
  }
}

module.exports = {
  translateText,
  getLanguageCode,
};
