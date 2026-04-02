(() => {
  class TTSService {
    constructor() {
      this.languageCodes = {
        Kannada: "kn",
        Hindi: "hi",
        Tamil: "ta",
        English: "en",
      };
      this.baseUrl = "https://translate.google.com/translate_tts";
      this.client = "tw-ob";
      this.maxTextLength = 180;
    }

    getLanguageCode(language) {
      const normalized = (language || "").trim();
      return (
        this.languageCodes[normalized] || normalized.toLowerCase().slice(0, 2)
      );
    }

    async synthesizeSpeech(text, targetLanguage = "Kannada") {
      if (!text || !text.trim()) {
        return { audioBlob: null, audioUrl: null };
      }

      const languageCode = this.getLanguageCode(targetLanguage);
      const safeText = text.trim().slice(0, this.maxTextLength);
      const audioUrl =
        `${this.baseUrl}?ie=UTF-8&client=${this.client}` +
        `&tl=${encodeURIComponent(languageCode)}` +
        `&q=${encodeURIComponent(safeText)}` +
        `&ttsspeed=1&total=1&idx=0&textlen=${safeText.length}`;

      return { audioBlob: null, audioUrl };
    }
  }

  window.TTSService = TTSService;
})();
