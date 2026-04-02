(() => {
  class AudioEngine {
    constructor() {
      this.queue = [];
      this.currentAudio = null;
      this.video = null;
      this.scheduledTimer = null;
      this.active = false;
      this.videoMutedByEngine = false;
      this.muteVideoOnDub = true;
    }

    attachVideo(video) {
      if (!video) {
        return;
      }

      this.video = video;
      this.video.addEventListener("play", () => this.onVideoPlay());
      this.video.addEventListener("pause", () => this.onVideoPause());
      this.video.addEventListener("seeking", () => this.onVideoSeek());
      this.video.addEventListener("seeked", () => this.onVideoSeek());
      this.video.addEventListener("ratechange", () =>
        this.onPlaybackRateChange(),
      );
      this.video.addEventListener("timeupdate", () => this.resync());
    }

    setOriginalAudioAllowed(allowOriginal) {
      this.muteVideoOnDub = !allowOriginal;
      if (!this.muteVideoOnDub && this.videoMutedByEngine && this.video) {
        this.video.muted = false;
        this.videoMutedByEngine = false;
      }
    }

    enable() {
      this.active = true;
      this.scheduleNext();
    }

    disable() {
      this.active = false;
      this.cancelCurrent();
      this.queue = [];
      if (this.video && this.videoMutedByEngine) {
        this.video.muted = false;
        this.videoMutedByEngine = false;
      }
    }

    enqueue(clip) {
      if (!clip || (!clip.audioBlob && !clip.audioUrl)) {
        return;
      }

      if (this.queue.some((item) => item.id === clip.id)) {
        return;
      }

      this.queue.push({ ...clip, queuedAt: Date.now() });
      this.queue.sort((a, b) => a.start - b.start);
      this.scheduleNext();
    }

    scheduleNext() {
      if (!this.active || !this.video) {
        return;
      }

      if (this.scheduledTimer) {
        clearTimeout(this.scheduledTimer);
        this.scheduledTimer = null;
      }

      if (this.queue.length === 0) {
        if (this.videoMutedByEngine) {
          this.video.muted = false;
          this.videoMutedByEngine = false;
        }
        return;
      }

      const next = this.queue[0];
      const now = this.video.currentTime;
      const offset = next.start - now;

      if (offset <= 0.25) {
        this.queue.shift();
        this.playClip(next);
        return;
      }

      const delay = Math.max(0, offset * 1000 - 100);
      this.scheduledTimer = window.setTimeout(() => {
        this.scheduleNext();
      }, delay);
    }

    playClip(clip) {
      if (!clip || (!clip.audioBlob && !clip.audioUrl)) {
        return;
      }

      this.cancelCurrent();

      const audio = document.createElement("audio");
      audio.style.display = "none";
      audio.preload = "auto";
      audio.autoplay = true;
      audio.playsInline = true;
      audio.volume = 0;
      audio.dataset.clipId = clip.id;
      audio.dataset.startTime = clip.start;
      audio.playbackRate = this.video?.playbackRate || 1;

      if (clip.audioBlob) {
        audio.src = URL.createObjectURL(clip.audioBlob);
        audio.dataset.isBlob = "true";
      } else {
        audio.src = clip.audioUrl;
      }

      audio.addEventListener("canplaythrough", () => {
        if (this.video && this.muteVideoOnDub && !this.videoMutedByEngine) {
          this.video.muted = true;
          this.videoMutedByEngine = true;
        }
        this.fadeAudio(audio, 0, 1, 180);
        if (!this.video.paused) {
          audio.play().catch(() => {
            /* ignore autoplay restrictions */
          });
        }
      });

      audio.addEventListener("timeupdate", () => {
        if (audio.duration && audio.duration - audio.currentTime < 0.2) {
          audio.volume = Math.max(0, audio.volume - 0.02);
        }
      });

      audio.addEventListener("ended", () => {
        if (audio.parentElement) {
          audio.parentElement.removeChild(audio);
        }
        if (audio.dataset.isBlob === "true") {
          URL.revokeObjectURL(audio.src);
        }
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        this.scheduleNext();
      });

      audio.addEventListener("error", (event) => {
        console.warn("AI Dubber audio error", event, clip);
        if (audio.parentElement) {
          audio.parentElement.removeChild(audio);
        }
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (this.video && this.videoMutedByEngine) {
          this.video.muted = false;
          this.videoMutedByEngine = false;
        }
        this.scheduleNext();
      });

      document.body.appendChild(audio);
      this.currentAudio = audio;

      if (!this.video.paused) {
        audio.play().catch(() => {
          /* ignore autoplay restrictions */
        });
      }
    }

    fadeAudio(audio, from, to, duration) {
      if (!audio) {
        return;
      }

      const start = performance.now();
      const change = to - from;

      const update = () => {
        const elapsed = performance.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        audio.volume = from + change * progress;
        if (progress < 1) {
          requestAnimationFrame(update);
        }
      };

      requestAnimationFrame(update);
    }

    cancelCurrent() {
      if (this.scheduledTimer) {
        clearTimeout(this.scheduledTimer);
        this.scheduledTimer = null;
      }

      if (this.currentAudio) {
        this.currentAudio.pause();
        if (this.currentAudio.parentElement) {
          this.currentAudio.parentElement.removeChild(this.currentAudio);
        }
        if (this.currentAudio.dataset.isBlob === "true") {
          try {
            URL.revokeObjectURL(this.currentAudio.src);
          } catch (error) {
            /* ignore */
          }
        }
        this.currentAudio = null;
      }
    }

    resync(force = false) {
      if (!this.video || !this.currentAudio) {
        return;
      }

      if (this.video.paused) {
        return;
      }

      const expected = Math.max(
        0,
        this.video.currentTime -
          parseFloat(this.currentAudio.dataset.startTime || "0"),
      );
      const drift = this.currentAudio.currentTime - expected;

      if (Math.abs(drift) > 0.3 || force) {
        this.currentAudio.currentTime = Math.max(0, expected);
        this.currentAudio.playbackRate = this.video.playbackRate || 1;
        if (!this.video.paused) {
          this.currentAudio.play().catch(() => {
            /* ignore */
          });
        }
      }
    }

    onVideoPause() {
      if (this.currentAudio) {
        this.currentAudio.pause();
      }
    }

    onVideoPlay() {
      if (this.currentAudio) {
        this.currentAudio.play().catch(() => {
          /* ignore */
        });
      }
      this.scheduleNext();
    }

    onVideoSeek() {
      this.queue = [];
      this.cancelCurrent();
      this.scheduleNext();
    }

    onPlaybackRateChange() {
      if (this.currentAudio && this.video) {
        this.currentAudio.playbackRate = this.video.playbackRate || 1;
      }
    }
  }

  window.AudioEngine = AudioEngine;
})();
