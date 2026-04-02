(() => {
  class SubtitleExtractor {
    constructor(onCue) {
      this.onCue = onCue;
      this.lastText = "";
      this.observer = null;
      this.scanSubtitle = Utils.debounce(this.scanSubtitle.bind(this), 250);
      this.start();
    }

    start() {
      this.attachObserver();
      this.scanSubtitle();
      window.addEventListener("keydown", this.scanSubtitle.bind(this), true);
    }

    attachObserver() {
      const root = document.body;
      if (!root) {
        return;
      }

      this.observer = new MutationObserver(() => {
        this.scanSubtitle();
      });

      this.observer.observe(root, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    scanSubtitle() {
      const textElements = this.findSubtitleNodes();
      if (!textElements.length) {
        return;
      }

      const subtitleText = textElements
        .map((node) => node.innerText.trim())
        .filter(Boolean)
        .join(" ")
        .trim();

      if (!subtitleText || subtitleText === this.lastText) {
        return;
      }

      this.lastText = subtitleText;
      this.emitCue(subtitleText);
    }

    findSubtitleNodes() {
      const selectors = [
        ".player-timedtext-text",
        ".player-timedtext-text-container",
        ".player-timedtext",
        ".atvwebplayersdk-captions-text",
        ".caption-text",
        ".subtitles-text",
        ".vjs-text-track-display",
        '[data-automation-id="caption"], [data-automation-id="subtitles"]',
        ".caption",
        ".vss-subtitles",
      ];

      for (const selector of selectors) {
        const nodes = Array.from(document.querySelectorAll(selector));
        if (nodes.length) {
          return nodes.filter((node) => Utils.isElementVisible(node));
        }
      }

      const fallback = [];
      const video = document.querySelector("video");
      const searchRoot = video?.closest("div") || document.body;
      const candidates = Array.from(
        searchRoot.querySelectorAll("span, div, p"),
      );

      for (const node of candidates) {
        if (!node.innerText || node.innerText.trim().length === 0) {
          continue;
        }
        if (!Utils.isElementVisible(node)) {
          continue;
        }
        if (node.closest("video")) {
          continue;
        }
        const text = node.innerText.trim();
        if (text.length < 2 || text.length > 250) {
          continue;
        }
        fallback.push(node);
        if (fallback.length >= 10) {
          break;
        }
      }

      return fallback;
    }

    getVideoTime() {
      const video = document.querySelector("video");
      return video?.currentTime || 0;
    }

    emitCue(text) {
      const now = this.getVideoTime();
      const duration = Math.min(5, Math.max(1.2, text.split(" ").length * 0.4));

      const cue = {
        id: `${text}-${Math.round(now * 100)}`,
        text,
        start: now + 0.1,
        duration,
      };

      this.onCue(cue);
    }
  }

  window.SubtitleExtractor = SubtitleExtractor;
})();
