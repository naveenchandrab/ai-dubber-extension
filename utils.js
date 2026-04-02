(() => {
  const Utils = {
    debounce(fn, delay = 250) {
      let timer = null;
      return (...args) => {
        if (timer) {
          clearTimeout(timer);
        }
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    },
    normalizeSubtitle(text) {
      return text.replace(/\s+/g, " ").trim().toLowerCase();
    },
    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    },
    sleep(ms = 100) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    isElementVisible(element) {
      if (!(element instanceof Element)) {
        return false;
      }
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        rect.width > 0 &&
        rect.height > 0
      );
    },
    async blobToDataUrl(blob) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    },
    async dataUrlToBlob(dataUrl) {
      const response = await fetch(dataUrl);
      return response.blob();
    },
  };

  window.Utils = Utils;
})();
