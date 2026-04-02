(() => {
  class Translator {
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

    async translate(text, targetLanguage = "Kannada") {
      if (!text || !text.trim()) {
        return text;
      }

      const body = {
        text: text.trim(),
        targetLang: this.getLanguageCode(targetLanguage),
      };

      try {
        const response = await Utils.fetchWithRetry(
          `${this.serverUrl}/translate`,
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
            `Translate backend returned ${response.status} ${errorText}`,
          );
        }

        const data = await response.json();
        return data.translatedText || text;
      } catch (error) {
        console.warn("Translator backend error:", error);
        return text;
      }
    }
  }

  window.Translator = Translator;
})();
