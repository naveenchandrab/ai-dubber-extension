const STORAGE_KEY = "aiDubberSettings";
const defaultSettings = {
  enabled: true,
  language: "Kannada",
  voice: "female",
  originalAudio: false,
};

const checkbox = document.getElementById("toggleRunning");
const languageSelect = document.getElementById("languageSelect");
const voiceSelect = document.getElementById("voiceSelect");
const originalAudioCheckbox = document.getElementById("toggleOriginalAudio");
const statusLabel = document.getElementById("statusLabel");
const latencyLabel = document.getElementById("latencyLabel");

function renderState(settings, latencyMs = null) {
  checkbox.checked = settings.enabled;
  languageSelect.value = settings.language;
  voiceSelect.value = settings.voice;
  originalAudioCheckbox.checked = settings.originalAudio || false;
  statusLabel.textContent = settings.enabled ? "Running" : "Idle";
  latencyLabel.textContent = latencyMs != null ? `${latencyMs} ms` : "—";
}

function saveSettings(settings) {
  chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

function loadSettings() {
  chrome.storage.local.get([STORAGE_KEY, "lastLatencyMs"], (result) => {
    const settings = result[STORAGE_KEY] || defaultSettings;
    renderState(settings, result.lastLatencyMs || null);
  });
}

function syncSettings() {
  const settings = {
    enabled: checkbox.checked,
    language: languageSelect.value,
    voice: voiceSelect.value,
    originalAudio: originalAudioCheckbox.checked,
  };
  saveSettings(settings);
  renderState(settings);
}

checkbox.addEventListener("change", syncSettings);
languageSelect.addEventListener("change", syncSettings);
voiceSelect.addEventListener("change", syncSettings);
originalAudioCheckbox.addEventListener("change", syncSettings);

loadSettings();
