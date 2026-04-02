(() => {
  const STORAGE_KEY = "aiDubberSettings";
  const defaultSettings = {
    enabled: true,
    language: "Kannada",
    voice: "female",
    originalAudio: false,
  };
  const SERVER_URL = "http://localhost:3000";
  const MAX_CONCURRENT = 4;

  let settings = defaultSettings;
  let videoElement = null;
  let subtitleExtractor = null;
  const translator = new Translator(SERVER_URL);
  const ttsService = new TTSService(SERVER_URL);
  const audioEngine = new AudioEngine();
  const cacheManager = new CacheManager();
  const processingSet = new Set();
  let pendingCue = null;
  let mergeTimer = null;
  let activeJobs = 0;

  async function storageGet() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || defaultSettings);
      });
    });
  }

  async function ensureVideoElement() {
    const attempts = 8;
    for (let i = 0; i < attempts; i += 1) {
      videoElement = findVideoElement();
      if (videoElement) {
        console.info("AI Dubber: attached video element", videoElement);
        audioEngine.attachVideo(videoElement);
        audioEngine.setOriginalAudioAllowed(settings.originalAudio);
        if (settings.enabled) {
          audioEngine.enable();
        }
        return;
      }
      await Utils.sleep(800);
    }

    console.warn("AI Dubber: could not find a video element on this page.");
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

  async function saveLatency(ms) {
    chrome.storage.local.set({ lastLatencyMs: Math.round(ms) });
  }

  function buildCacheKey(text, language, voice) {
    return `${text}::${language}::${voice}`;
  }

  function shouldCombine(previous, next) {
    if (!previous || !next) {
      return false;
    }
    const gap = next.start - previous.start;
    return (
      previous.text.length < 35 &&
      next.text.length < 35 &&
      gap >= 0.05 &&
      gap <= 1.2
    );
  }

  function mergeCues(base, extra) {
    return {
      ...base,
      id: `${base.id}_${extra.id}`,
      text: `${base.text} ${extra.text}`,
      duration: Math.min(8, base.duration + extra.duration),
    };
  }

  function schedulePendingFlush() {
    if (mergeTimer) {
      clearTimeout(mergeTimer);
    }
    mergeTimer = window.setTimeout(() => {
      if (pendingCue) {
        processCue(pendingCue);
        pendingCue = null;
      }
    }, 220);
  }

  async function waitForJobSlot() {
    while (activeJobs >= MAX_CONCURRENT) {
      await Utils.sleep(100);
    }
    activeJobs += 1;
  }

  async function processCue(cue) {
    if (!cue || !cue.text) {
      return;
    }

    const normalizedText = Utils.normalizeSubtitle(cue.text);
    if (!normalizedText || processingSet.has(normalizedText)) {
      return;
    }

    processingSet.add(normalizedText);
    await waitForJobSlot();

    const startTime = performance.now();
    const cacheKey = buildCacheKey(
      normalizedText,
      settings.language,
      settings.voice,
    );

    try {
      let audioBlob = null;
      const cached = await cacheManager.getItem(cacheKey);

      if (cached && cached.audioBlob) {
        audioBlob = cached.audioBlob;
      }

      if (!audioBlob) {
        const translated = await translator.translate(
          cue.text,
          settings.language,
        );
        const ttsResponse = await ttsService.synthesizeSpeech(
          translated,
          settings.language,
          settings.voice,
        );
        audioBlob = ttsResponse.audioBlob || null;

        if (audioBlob) {
          await cacheManager.setItem(cacheKey, {
            audioBlob,
            updatedAt: Date.now(),
          });
        }
      }

      if (!audioBlob) {
        console.warn("AI Dubber: no audio generated for cue", cue.text);
        return;
      }

      audioEngine.enqueue({ ...cue, audioBlob });
      const latencyMs = Math.round(performance.now() - startTime);
      saveLatency(latencyMs);
    } catch (error) {
      console.warn("AI Dubber failed to process subtitle cue", error);
    } finally {
      processingSet.delete(normalizedText);
      activeJobs = Math.max(0, activeJobs - 1);
    }
  }

  function flushPendingCue() {
    if (pendingCue) {
      processCue(pendingCue);
      pendingCue = null;
    }
    if (mergeTimer) {
      clearTimeout(mergeTimer);
      mergeTimer = null;
    }
  }

  function onSubtitleCue(cue) {
    if (!settings.enabled) {
      return;
    }

    if (shouldCombine(pendingCue, cue)) {
      pendingCue = mergeCues(pendingCue, cue);
      schedulePendingFlush();
      return;
    }

    if (pendingCue) {
      flushPendingCue();
    }

    pendingCue = cue;
    schedulePendingFlush();
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
      audioEngine.setOriginalAudioAllowed(settings.originalAudio);
      if (settings.enabled) {
        audioEngine.enable();
      } else {
        audioEngine.disable();
      }
    });
  }

  init();
})();
