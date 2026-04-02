# AI Dubber Extension

AI Dubber is a Chrome extension that translates OTT subtitles and dubs them using a backend translation/TTS service. The extension is designed for Netflix and Prime Video with improved sync, caching, and user controls.

## Updated architecture

- `content.js` handles subtitle extraction, debounce, prefetching, and backend requests.
- `audioEngine.js` schedules audio precisely and adjusts for seeks, playback rate, pause/resume, and drift.
- `popup.js` exposes language, voice, original audio mix, and latency display.
- `backend/` provides secure API proxying to translation and TTS services.

## Backend structure

```
/backend
├── server.js
├── routes/
│   ├── translate.js
│   ├── tts.js
│   ├── cache.js
├── services/
│   ├── elevenLabs.js
│   ├── translateService.js
├── cache/
│   ├── memoryCache.js
├── package.json
├── .env.example
```

## Setup

### 1. Start the backend

```bash
cd backend
npm install
cp .env.example .env
# configure your API keys in .env
npm start
```

### 2. Load the Chrome extension

1. Open `chrome://extensions/`.
2. Enable `Developer mode`.
3. Click `Load unpacked` and choose the project root.
4. Run the backend at `http://localhost:3000`.

## Extension usage

- Enable dubbing in the popup.
- Select target language and voice profile.
- Toggle original audio if you want to mix audio instead of muting video.
- Monitor latency in milliseconds after each subtitle conversion.

## Notes

- API keys are kept on the backend for security.
- The extension caches audio in IndexedDB to reduce repeated processing.
- The backend caches translation and TTS results in memory for repeated requests.
- The system currently supports Netflix and Prime Video subtitle extraction.
