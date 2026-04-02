(() => {
  class AudioEngine {
    constructor() {
      this.queue = [];
      this.currentAudio = null;
      this.video = null;
      this.scheduledTimer = null;
      this.active = false;
      this.videoMutedByEngine = false;
    }

    attachVideo(video) {
      if (!video) {
        return;
      }

      this.video = video;
      this.video.addEventListener("play", () => this.onVideoPlay());
      this.video.addEventListener("pause", () => this.onVideoPause());
      this.video.addEventListener("seeking", () => this.resync());
      this.video.addEventListener("timeupdate", () => this.resync());
    }

    enable() {
      this.active = true;
      this.scheduleNext();
    }

    disable() {
      this.active = false;
      if (this.video && this.videoMutedByEngine) {
        this.video.muted = false;
        this.videoMutedByEngine = false;
      }
      this.cancelCurrent();
      this.queue = [];
    }

    enqueue(clip) {
      if (!clip || (!clip.audioBlob && !clip.audioUrl)) {
        return;
      }
      if (this.queue.some((item) => item.id === clip.id)) {
        return;
      }

      const queued = {
        ...clip,
        queuedAt: Date.now(),
      };
      this.queue.push(queued);
      this.queue.sort((a, b) => a.start - b.start);
      this.scheduleNext();
    }

    scheduleNext() {
      if (!this.active || !this.video) {
        return;
      }

      if (this.queue.length === 0) {
        if (this.videoMutedByEngine) {
          this.video.muted = false;
          this.videoMutedByEngine = false;
        }
        return;
      }

      if (this.scheduledTimer) {
        clearTimeout(this.scheduledTimer);
        this.scheduledTimer = null;
      }

      const next = this.queue[0];
      const now = this.video.currentTime;
      const offset = next.start - now;

      if (offset <= 0.25) {
        this.queue.shift();
        this.playClip(next);
        return;
      }

      const delay = Math.max(0, offset * 1000 - 120);
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
      audio.volume = 1;
      audio.dataset.clipId = clip.id;
      audio.startTime = clip.start;

      if (clip.audioBlob) {
        audio.src = URL.createObjectURL(clip.audioBlob);
        audio.dataset.isBlob = "true";
      } else {
        audio.src = clip.audioUrl;
      }
      audio.load();

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

      audio.addEventListener("canplaythrough", () => {
        if (this.video && !this.videoMutedByEngine) {
          this.video.muted = true;
          this.videoMutedByEngine = true;
        }
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
        try {
          URL.revokeObjectURL(this.currentAudio.src);
        } catch (error) {
          /* ignore */
        }
        this.currentAudio = null;
      }
    }

    resync() {
      if (!this.video || !this.currentAudio || this.video.paused) {
        return;
      }

      const drift =
        this.currentAudio.currentTime -
        Math.max(0, this.video.currentTime - this.currentAudio.startTime);
      if (Math.abs(drift) > 0.5) {
        this.currentAudio.currentTime = Math.max(
          0,
          this.currentAudio.currentTime - drift,
        );
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
  }

  window.AudioEngine = AudioEngine;
})();
