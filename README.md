# AI Dubber Extension

A browser extension for extracting subtitles, translating text, and generating speech using AI-powered services.

## Project structure

- `audioEngine.js` - audio playback and voice generation logic
- `background.js` - background script for extension events and state management
- `content.js` - content script injected into web pages
- `popup.html` / `popup.js` - extension popup UI
- `manifest.json` - Chrome extension manifest configuration
- `styles.css` - popup styling
- `subtitleExtractor.js` - subtitle extraction logic
- `translator.js` - translation helper functions
- `ttsService.js` - text-to-speech integration
- `utils.js` - shared utilities
- `icons/` - extension icons

## Installation

1. Open `chrome://extensions/` in Chrome or Edge.
2. Enable `Developer mode`.
3. Click `Load unpacked` and select this project folder.

## Usage

1. Open the extension popup.
2. Enable the feature you need (subtitle extraction, translation, TTS).
3. Interact with the page or media content as supported by the extension.

## Notes

- This repository is configured for local development.
- Ensure any AI or TTS service keys are managed securely outside the repository.
