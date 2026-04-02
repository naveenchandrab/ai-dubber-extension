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
      return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
    },
    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    },
    sleep(ms = 100) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    async proxyFetch(url, options = {}) {
      return new Promise((resolve, reject) => {
        if (!chrome?.runtime?.sendMessage) {
          reject(new Error("Extension messaging unavailable"));
          return;
        }

        chrome.runtime.sendMessage(
          {
            type: "proxyRequest",
            url,
            options: {
              ...options,
            },
          },
          (result) => {
            const lastError = chrome.runtime.lastError;
            if (lastError) {
              reject(new Error(lastError.message));
              return;
            }
            if (!result || !result.success) {
              reject(new Error(result?.error || "Proxy fetch failed"));
              return;
            }

            try {
              const binary = atob(result.bodyBase64 || "");
              const length = binary.length;
              const buffer = new Uint8Array(length);
              for (let i = 0; i < length; i += 1) {
                buffer[i] = binary.charCodeAt(i);
              }

              const headers = new Headers();
              (result.headers || []).forEach(([key, value]) => {
                headers.append(key, value);
              });

              resolve(
                new Response(buffer, {
                  status: result.status,
                  statusText: result.statusText,
                  headers,
                }),
              );
            } catch (err) {
              reject(err);
            }
          },
        );
      });
    },
    async fetchWithRetry(url, options = {}, retries = 2, retryDelay = 300) {
      const useProxy =
        window.location.protocol === "https:" && url.startsWith("http:");

      const fetchFn = useProxy ? Utils.proxyFetch : fetch;

      try {
        const response = await fetchFn(url, options);
        if (!response.ok && retries > 0 && response.status >= 500) {
          await Utils.sleep(retryDelay);
          return Utils.fetchWithRetry(
            url,
            options,
            retries - 1,
            retryDelay * 1.5,
          );
        }
        return response;
      } catch (error) {
        if (retries <= 0) {
          throw error;
        }
        await Utils.sleep(retryDelay);
        return Utils.fetchWithRetry(
          url,
          options,
          retries - 1,
          retryDelay * 1.5,
        );
      }
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
