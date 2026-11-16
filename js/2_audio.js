class AudioController {
  constructor() {
    this.audioCtx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    
    // Buffer for the loaded m4a audio file
    this.musicBuffer = null;
    this.musicSource = null;
    this.musicGain = null;

    // Load the m4a file into memory as an audio buffer (bypasses OS media player hooks)
    this.loadMusicFile();

    // Procedural Boss Beat State
    this.isBossMusicPlaying = false;
    this.bossInterval = null;

    // Pause audio when switching tabs
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.stopMusicBuffer();
        this.stopBossSynth();
      } else {
        if (this.musicEnabled && !this.isBossMusicPlaying) {
          this.playMusicBuffer();
        }
      }
    });
  }

  async loadMusicFile() {
    try {
      const response = await fetch("galaxtartheme.m4a");
      const arrayBuffer = await response.arrayBuffer();
      // We'll initialize audioCtx on first user gesture, but we can decode right away or after init
      const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.musicBuffer = await tempCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.log("Could not load m4a music buffer, falling back to synth if needed:", e);
    }
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(e => {});
    }
    if (this.musicEnabled && !this.isBossMusicPlaying) {
      this.playMusicBuffer();
    }
  }

  ensureActive() {
    if (this.audioCtx) {
      if (this.audioCtx.state === "suspended" || this.audioCtx.state === "interrupted") {
        this.audioCtx.resume().catch(e => {});
      }
    } else {
      this.init();
    }
  }

  playMusicBuffer() {
    this.init();
    if (!this.audioCtx || !this.musicBuffer || this.musicSource || this.isBossMusicPlaying) return;

    try {
      this.musicSource = this.audioCtx.createBufferSource();
      this.musicSource.buffer = this.musicBuffer;
      this.musicSource.loop = true;

      this.musicGain = this.audioCtx.createGain();
      this.musicGain.gain.setValueAtTime(0.4, this.audioCtx.currentTime);

      this.musicSource.connect(this.musicGain);
      this.musicGain.connect(this.audioCtx.destination);
      this.musicSource.start(0);
    } catch (e) {
      console.log("Buffer music play error:", e);
    }
  }

  stopMusicBuffer() {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
        this.musicSource.disconnect();
      } catch (e) {}
      this.musicSource = null;
    }
  }

  setMusicEnabled(val) {
    this.musicEnabled = val;
    if (val) {
      if (this.isBossMusicPlaying) {
        this.startBossSynth();
      } else {
        this.playMusicBuffer();
      }
    } else {
      this.stopMusicBuffer();
      this.stopBossSynth();
    }
  }

  switchToBossMusic() {
    this.isBossMusicPlaying = true;
    this.stopMusicBuffer();
    if (this.musicEnabled) {
      this.startBossSynth();
    }
  }

  switchToNormalMusic() {
    this.isBossMusicPlaying = false;
    this.stopBossSynth();
    if (this.musicEnabled) {
      this.playMusicBuffer();
    }
  }

  startBossSynth() {
    this.init();
    this.stopMusicBuffer();
    if (this.bossInterval) return;

    const bassNotes = [110, 110, 130.81, 98.00];
    let step = 0;

    this.bossInterval = setInterval(() => {
      if (!this.musicEnabled) return;
      this.ensureActive();
      if (!this.audioCtx || this.audioCtx.state !== "running") return;
      
      try {
        const now = this.audioCtx.currentTime;
        const bassOsc = this.audioCtx.createOscillator();
        const bassGain = this.audioCtx.createGain();
        bassOsc.type = "sawtooth";
        bassOsc.frequency.setValueAtTime(bassNotes[Math.floor(step / 2) % bassNotes.length], now);
        
        bassGain.gain.setValueAtTime(0.08, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        bassOsc.connect(bassGain);
        bassGain.connect(this.audioCtx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.15);

        step++;
      } catch (e) {}
    }, 200);
  }

  stopBossSynth() {
    if (this.bossInterval) {
      clearInterval(this.bossInterval);
      this.bossInterval = null;
    }
  }

  playGunSound() {
    if (!this.sfxEnabled) return;
    this.ensureActive();
    if (!this.audioCtx || this.audioCtx.state !== "running") return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.08);
    } catch (e) {}
  }

  playChargeBeamSound() {
    if (!this.sfxEnabled) return;
    this.ensureActive();
    if (!this.audioCtx || this.audioCtx.state !== "running") return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(900, this.audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.2);
    } catch (e) {}
  }

  playExplosion(isAsteroid = false) {
    if (!this.sfxEnabled) return;
    this.ensureActive();
    if (!this.audioCtx || this.audioCtx.state !== "running") return;

    try {
      const bufferSize = this.audioCtx.sampleRate * 0.2;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(isAsteroid ? 350 : 600, this.audioCtx.currentTime);
      filter.frequency.linearRampToValueAtTime(30, this.audioCtx.currentTime + 0.2);
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);
      noise.start();
    } catch (e) {}
  }
}
