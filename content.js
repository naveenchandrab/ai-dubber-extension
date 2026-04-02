(() => {
  const STORAGE_KEY = "aiDubberSettings";
  const defaultSettings = {
    enabled: true,
    language: "Kannada",
  };

  let settings = defaultSettings;
  let videoElement = null;
  let subtitleExtractor = null;
  const translator = new Translator();
  const ttsService = new TTSService();
  const audioEngine = new AudioEngine();
  const processingSet = new Set();

  async function storageGet() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || defaultSettings);
      });
    });
  }

  async function getCachedAudio(key) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "getCachedAudio", key },
        (response) => {
          resolve(response || { found: false });
        },
      );
    });
  }

  async function setCachedAudio(key, audioDataUrl, audioUrl) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "setCachedAudio", key, audioDataUrl, audioUrl },
        (response) => {
          resolve(response || { stored: false });
        },
      );
    });
  }

  async function fetchRemoteAudio(audioUrl) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "fetchAudioUrl", audioUrl },
        (response) => {
          resolve(response || { success: false });
        },
      );
    });
  }

  function findVideoElement() {
    const videos = Array.from(document.querySelectorAll("video"));
    if (!videos.length) {
      return null;
    }

    return videos.reduce((best, current) => {
      const bestSize =
        (best.videoWidth || best.clientWidth) *
        (best.videoHeight || best.clientHeight);
      const currentSize =
        (current.videoWidth || current.clientWidth) *
        (current.videoHeight || current.clientHeight);
      return currentSize > bestSize ? current : best;
    }, videos[0]);
  }

  async function ensureVideoElement() {
    const attempts = 8;
    for (let i = 0; i < attempts; i += 1) {
      videoElement = findVideoElement();
      if (videoElement) {
        console.info("AI Dubber: attached video element", videoElement);
        audioEngine.attachVideo(videoElement);
        if (settings.enabled) {
          audioEngine.enable();
        }
        return;
      }
      await Utils.sleep(800);
    }

    console.warn("AI Dubber: could not find a video element on this page.");
  }

  async function init() {
    settings = await storageGet();
    await ensureVideoElement();

    subtitleExtractor = new SubtitleExtractor(onSubtitleCue);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[STORAGE_KEY]) {
        return;
      }
      settings = changes[STORAGE_KEY].newValue || defaultSettings;
      if (settings.enabled) {
        audioEngine.enable();
      } else {
        audioEngine.disable();
      }
    });
  }

  async function onSubtitleCue(cue) {
    if (!settings.enabled) {
      return;
    }

    const normalizedText = Utils.normalizeSubtitle(cue.text);
    if (!normalizedText || processingSet.has(normalizedText)) {
      return;
    }

    processingSet.add(normalizedText);
    const cacheKey = `${normalizedText}::${settings.language}`;
    let audioBlob = null;
    let audioUrl = null;

    try {
      const cached = await getCachedAudio(cacheKey);
      if (cached.found) {
        if (cached.audioDataUrl) {
          audioBlob = await Utils.dataUrlToBlob(cached.audioDataUrl);
        } else if (cached.audioUrl) {
          audioUrl = cached.audioUrl;
        }
      }

      if (!audioBlob && !audioUrl) {
        const translated = await translator.translate(
          cue.text,
          settings.language,
        );
        const result = await ttsService.synthesizeSpeech(
          translated,
          settings.language,
        );
        audioBlob = result.audioBlob || null;
        audioUrl = result.audioUrl || null;

        if (audioUrl && !audioBlob) {
          const fetched = await fetchRemoteAudio(audioUrl);
          if (fetched.success && fetched.audioDataUrl) {
            audioBlob = await Utils.dataUrlToBlob(fetched.audioDataUrl);
            await setCachedAudio(cacheKey, fetched.audioDataUrl, null);
            audioUrl = null;
          }
        }

        if (audioBlob) {
          const dataUrl = await Utils.blobToDataUrl(audioBlob);
          await setCachedAudio(cacheKey, dataUrl, null);
        } else if (audioUrl) {
          await setCachedAudio(cacheKey, null, audioUrl);
        }
      }

      if (!audioBlob && !audioUrl) {
        console.warn("AI Dubber: no audio generated for cue", cue.text);
        return;
      }

      audioEngine.enqueue({ ...cue, audioBlob, audioUrl });
    } catch (error) {
      console.warn("AI Dubber failed to process subtitle cue", error);
    } finally {
      processingSet.delete(normalizedText);
    }
  }

  init();
})();
