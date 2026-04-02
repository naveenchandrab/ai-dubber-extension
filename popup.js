const STORAGE_KEY = "aiDubberSettings";
const defaultSettings = {
  enabled: true,
  language: "Kannada",
};

const checkbox = document.getElementById("toggleRunning");
const select = document.getElementById("languageSelect");
const statusLabel = document.getElementById("statusLabel");

function renderState(settings) {
  checkbox.checked = settings.enabled;
  select.value = settings.language;
  statusLabel.textContent = settings.enabled ? "Running" : "Idle";
}

function saveSettings(settings) {
  chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

function loadSettings() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const settings = result[STORAGE_KEY] || defaultSettings;
    renderState(settings);
  });
}

checkbox.addEventListener("change", () => {
  const settings = {
    enabled: checkbox.checked,
    language: select.value,
  };
  saveSettings(settings);
  renderState(settings);
});

select.addEventListener("change", () => {
  const settings = {
    enabled: checkbox.checked,
    language: select.value,
  };
  saveSettings(settings);
  renderState(settings);
});

loadSettings();
