(() => {
  class Translator {
    constructor() {
      this.languageCodes = {
        Kannada: "kn",
        Hindi: "hi",
        Tamil: "ta",
        English: "en",
      };
      this.apiBaseUrl = "https://translate.googleapis.com/translate_a/single";
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

      const target = this.getLanguageCode(targetLanguage);
      const url = `${this.apiBaseUrl}?client=gtx&sl=auto&tl=${encodeURIComponent(
        target,
      )}&dt=t&q=${encodeURIComponent(text)}`;

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          mode: "cors",
        });

        if (!response.ok) {
          throw new Error(`Translate API returned ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const translated = data[0]
            .map((segment) => (Array.isArray(segment) ? segment[0] : ""))
            .join("");
          if (translated) {
            return translated.trim();
          }
        }
      } catch (error) {
        console.warn("Translator error:", error);
      }

      return text;
    }
  }

  window.Translator = Translator;
})();
