const express = require("express");
const router = express.Router();
const { translateText } = require("../services/translateService");
const cache = require("../cache/memoryCache");

router.post("/", async (req, res) => {
  const { text, targetLang } = req.body;

  if (!text || !targetLang) {
    return res.status(400).json({
      error: "Missing required parameters: text and targetLang",
    });
  }

  const cacheKey = `translate:${text}:${targetLang}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ translatedText: cached });
  }

  try {
    const translatedText = await translateText(text, targetLang);
    cache.set(cacheKey, translatedText, 60 * 60);
    return res.json({ translatedText });
  } catch (error) {
    console.error("Translate route error", error?.message || error);
    return res.status(500).json({ error: "Translation failed" });
  }
});

module.exports = router;
