class AudioController {
  constructor() {
    this.audioCtx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    
    this.isBossMusicPlaying = false;
    this.musicInterval = null;

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.stopMusic();
      } else {
        if (this.musicEnabled) {
          this.startMusic();
        }
      }
    });
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(e => console.log("AudioContext resume error:", e));
    }
    if (this.musicEnabled && !this.musicInterval) {
      this.startMusic();
    }
  }

  setMusicEnabled(val) {
    this.musicEnabled = val;
    if (val) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  switchToBossMusic() {
    this.isBossMusicPlaying = true;
    if (this.musicEnabled) {
      this.startMusic();
    }
  }

  switchToNormalMusic() {
    this.isBossMusicPlaying = false;
    if (this.musicEnabled) {
      this.startMusic();
    }
  }

  startMusic() {
    this.init();
    if (!this.audioCtx) return;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }

    const normalBass = [130.81, 98.00, 110.00, 87.31]; 
    const normalLead = [261.63, 329.63, 392.00, 523.25];
    const bossBass = [110.00, 110.00, 130.81, 98.00]; 
    const bossLead = [220.00, 329.63, 440.00, 523.25, 440.00, 329.63];

    let step = 0;
    // Safe, well-spaced interval to guarantee zero main-thread contention
    const tempo = this.isBossMusicPlaying ? 200 : 350;

    this.musicInterval = setInterval(() => {
      if (!this.musicEnabled || !this.audioCtx || this.audioCtx.state !== "running") return;

      try {
        const now = this.audioCtx.currentTime;
        const bNotes = this.isBossMusicPlaying ? bossBass : normalBass;
        const lNotes = this.isBossMusicPlaying ? bossLead : normalLead;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = this.isBossMusicPlaying ? "sawtooth" : "triangle";
        osc.frequency.setValueAtTime(bNotes[step % bNotes.length], now);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.15);

        step++;
      } catch (e) {
        // Drop safely if context is locked
      }
    }, tempo);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  playGunSound() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.1);
  }

  playChargeBeamSound() {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, this.audioCtx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.25);
  }

  playExplosion(isAsteroid = false) {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.audioCtx) return;
    const bufferSize = this.audioCtx.sampleRate * 0.25;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isAsteroid ? 350 : 700, this.audioCtx.currentTime);
    filter.frequency.linearRampToValueAtTime(40, this.audioCtx.currentTime + 0.25);
    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    noise.start();
  }
}
