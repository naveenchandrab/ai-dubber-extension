const express = require("express");
const router = express.Router();
const { synthesizeSpeech } = require("../services/elevenLabs");
const cache = require("../cache/memoryCache");

router.post("/", async (req, res) => {
  const { text, targetLang, voiceGender, voiceId } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Missing required parameter: text" });
  }

  const cacheKey = `tts:${voiceId || voiceGender}:${targetLang}:${text}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.audioBuffer) {
    res.set("Content-Type", cached.contentType || "audio/mpeg");
    return res.send(Buffer.from(cached.audioBuffer));
  }

  try {
    const { audioBuffer, contentType } = await synthesizeSpeech(
      text,
      targetLang,
      voiceId,
      voiceGender,
    );

    cache.set(cacheKey, { audioBuffer, contentType }, 60 * 60);
    res.set("Content-Type", contentType || "audio/mpeg");
    return res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error("TTS route error", error?.message || error);
    return res
      .status(500)
      .json({ error: error?.message || "Speech generation failed" });
  }
});

module.exports = router;
