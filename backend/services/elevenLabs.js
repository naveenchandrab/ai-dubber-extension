const axios = require("axios");

const API_KEY = process.env.ELEVENLABS_API_KEY;
const FEMALE_VOICE = process.env.ELEVENLABS_VOICE_ID_FEMALE;
const MALE_VOICE = process.env.ELEVENLABS_VOICE_ID_MALE;
const ELEVENLABS_ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";
const GOOGLE_TTS_ENDPOINT = "https://translate.google.com/translate_tts";

function isValidVoiceId(voiceId) {
  return (
    typeof voiceId === "string" &&
    voiceId.trim().length > 0 &&
    !/your[-_ ]?(female|male)[-_ ]voice[-_ ]id/i.test(voiceId)
  );
}

function resolveVoiceId(voiceId, voiceGender = "female") {
  const normalized = voiceId?.trim();
  if (isValidVoiceId(normalized)) {
    return normalized;
  }
  const fallback = voiceGender === "male" ? MALE_VOICE : FEMALE_VOICE;
  return isValidVoiceId(fallback) ? fallback.trim() : null;
}

function shouldUseGoogleTTS() {
  return !API_KEY || !API_KEY.trim();
}

function buildGoogleTTSUrl(text, targetLang) {
  const lang = (targetLang || "en").trim();
  const params = new URLSearchParams({
    ie: "UTF-8",
    q: text,
    tl: lang,
    client: "tw-ob",
  });
  return `${GOOGLE_TTS_ENDPOINT}?${params.toString()}`;
}

async function synthesizeGoogleSpeech(text, targetLang) {
  const url = buildGoogleTTSUrl(text, targetLang);
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      Accept: "audio/mpeg, */*;q=0.5",
      Referer: "https://translate.google.com/",
    },
    timeout: 20000,
  });

  if (response.status !== 200) {
    throw new Error(`Google TTS failed with status ${response.status}`);
  }

  return {
    audioBuffer: response.data,
    contentType: response.headers["content-type"] || "audio/mpeg",
  };
}

async function synthesizeSpeech(text, targetLang, voiceId, voiceGender) {
  const selectedVoice = resolveVoiceId(voiceId, voiceGender);

  if (!shouldUseGoogleTTS() && selectedVoice) {
    try {
      const response = await axios.post(
        `${ELEVENLABS_ENDPOINT}/${selectedVoice}`,
        {
          text,
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.75,
          },
        },
        {
          responseType: "arraybuffer",
          headers: {
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
            "xi-api-key": API_KEY,
          },
          timeout: 20000,
        },
      );

      return {
        audioBuffer: response.data,
        contentType: response.headers["content-type"] || "audio/mpeg",
      };
    } catch (error) {
      console.warn(
        "ElevenLabs TTS failed, falling back to Google TTS:",
        error?.message || error,
      );
    }
  }

  return synthesizeGoogleSpeech(text, targetLang);
}

module.exports = {
  synthesizeSpeech,
};
