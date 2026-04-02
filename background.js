const audioCache = new Map();

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Dubber background worker installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    sendResponse({ success: false });
    return true;
  }

  if (message.type === "getCachedAudio") {
    const audioEntry = audioCache.get(message.key) || null;
    if (audioEntry) {
      sendResponse({ found: true, ...audioEntry });
    } else {
      sendResponse({ found: false });
    }
    return true;
  }

  if (message.type === "fetchAudioUrl") {
    if (!message.audioUrl) {
      sendResponse({ success: false, error: "Missing audioUrl" });
      return true;
    }

    fetch(message.audioUrl, {
      method: "GET",
      mode: "cors",
    })
      .then((response) =>
        response
          .arrayBuffer()
          .then((arrayBuffer) => ({ response, arrayBuffer })),
      )
      .then(({ response, arrayBuffer }) => {
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < uint8Array.length; i += 1) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);
        const contentType =
          response.headers.get("content-type") || "audio/mpeg";
        const audioDataUrl = `data:${contentType};base64,${base64}`;
        sendResponse({ success: true, audioDataUrl });
      })
      .catch((error) => {
        console.warn("AI Dubber background fetchAudioUrl failed", error);
        sendResponse({
          success: false,
          error: error?.message || "fetch failed",
        });
      });
    return true;
  }

  if (message.type === "proxyRequest") {
    if (!message.url) {
      sendResponse({ success: false, error: "Missing url" });
      return true;
    }

    fetch(message.url, message.options || {})
      .then((response) =>
        response
          .arrayBuffer()
          .then((arrayBuffer) => ({ response, arrayBuffer })),
      )
      .then(({ response, arrayBuffer }) => {
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < uint8Array.length; i += 1) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);
        const headers = [];
        response.headers.forEach((value, key) => {
          headers.push([key, value]);
        });

        sendResponse({
          success: true,
          status: response.status,
          statusText: response.statusText,
          headers,
          bodyBase64: base64,
        });
      })
      .catch((error) => {
        console.warn("AI Dubber background proxyRequest failed", error);
        sendResponse({
          success: false,
          error: error?.message || "Proxy fetch failed",
        });
      });
    return true;
  }

  if (message.type === "setCachedAudio") {
    if (message.key && (message.audioDataUrl || message.audioUrl)) {
      audioCache.set(message.key, {
        audioDataUrl: message.audioDataUrl || null,
        audioUrl: message.audioUrl || null,
        updatedAt: Date.now(),
      });
      sendResponse({ stored: true });
    } else {
      sendResponse({ stored: false });
    }
    return true;
  }

  sendResponse({ success: false });
  return true;
});
