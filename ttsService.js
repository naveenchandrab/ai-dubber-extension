(() => {
  class TTSService {
    constructor(serverUrl = "http://localhost:3000") {
      this.languageCodes = {
        Kannada: "kn",
        Hindi: "hi",
        Tamil: "ta",
        English: "en",
      };
      this.serverUrl = serverUrl;
    }

    getLanguageCode(language) {
      const normalized = (language || "").trim();
      return (
        this.languageCodes[normalized] || normalized.toLowerCase().slice(0, 2)
      );
    }

    async synthesizeSpeech(text, targetLanguage = "Kannada", voice = "female") {
      if (!text || !text.trim()) {
        return { audioBlob: null };
      }

      const body = {
        text: text.trim(),
        targetLang: this.getLanguageCode(targetLanguage),
        voiceGender: voice,
      };

      try {
        const response = await Utils.fetchWithRetry(
          `${this.serverUrl}/tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
          2,
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(
            `TTS backend returned ${response.status} ${errorText}`,
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        const contentType =
          response.headers.get("content-type") || "audio/mpeg";
        return {
          audioBlob: new Blob([arrayBuffer], { type: contentType }),
        };
      } catch (error) {
        console.warn("TTS backend error:", error);
        return { audioBlob: null };
      }
    }
  }

  window.TTSService = TTSService;
})();
