class AudioController {
  constructor() {
    this.audioCtx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    
    // Background music setup using your m4a file
    this.bgMusic = new Audio("galaxtartheme.m4a");
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.5;

    // Procedural Boss Beat State
    this.isBossMusicPlaying = false;
    this.bossInterval = null;

    // Automatically pause music when the app/tab goes to the background
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.bgMusic.pause();
        this.stopBossSynth();
      } else {
        if (this.musicEnabled && !this.isBossMusicPlaying) {
          this.bgMusic.play().catch(e => console.log("Music resume error:", e));
        }
      }
    });
  }

  init() {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(e => console.log("AudioContext resume error:", e));
    }
    if (this.musicEnabled && !this.isBossMusicPlaying && this.bgMusic.paused) {
      this.bgMusic.play().catch(e => console.log("Music autoplay blocked or file missing:", e));
    }
  }

  // Universal safety check to revive stalled or closed audio contexts mid-session
  ensureActive() {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === "suspended" || this.audioCtx.state === "interrupted") {
      this.audioCtx.resume().catch(e => console.log("Audio context recovery error:", e));
    }
  }

  setMusicEnabled(val) {
    this.musicEnabled = val;
    if (val) {
      if (this.isBossMusicPlaying) {
        this.startBossSynth();
      } else {
        this.bgMusic.play().catch(e => console.log("Music play error:", e));
      }
    } else {
      this.bgMusic.pause();
      this.stopBossSynth();
    }
  }

  switchToBossMusic() {
    this.isBossMusicPlaying = true;
    this.bgMusic.pause();
    if (this.musicEnabled) {
      this.startBossSynth();
    }
  }

  switchToNormalMusic() {
    this.isBossMusicPlaying = false;
    this.stopBossSynth();
    if (this.musicEnabled) {
      this.bgMusic.play().catch(e => console.log("Normal music play error:", e));
    }
  }

  startBossSynth() {
    this.init();
    if (this.bossInterval) return;

    const bassNotes = [110, 110, 130.81, 98.00];
    const leadNotes = [220, 329.63, 440, 523.25, 440, 329.63];
    let step = 0;

    this.bossInterval = setInterval(() => {
      if (!this.musicEnabled) return;
      this.ensureActive();
      if (!this.audioCtx) return;
      
      try {
        const now = this.audioCtx.currentTime;

        const bassOsc = this.audioCtx.createOscillator();
        const bassGain = this.audioCtx.createGain();
        bassOsc.type = "sawtooth";
        bassOsc.frequency.setValueAtTime(bassNotes[Math.floor(step / 2) % bassNotes.length], now);
        
        bassGain.gain.setValueAtTime(0.12, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        bassOsc.connect(bassGain);
        bassGain.connect(this.audioCtx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.2);

        const leadOsc = this.audioCtx.createOscillator();
        const leadGain = this.audioCtx.createGain();
        leadOsc.type = "square";
        leadOsc.frequency.setValueAtTime(leadNotes[step % leadNotes.length], now);

        leadGain.gain.setValueAtTime(0.08, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        leadOsc.connect(leadGain);
        leadGain.connect(this.audioCtx.destination);
        leadOsc.start(now);
        leadOsc.stop(now + 0.15);

        step++;
      } catch (e) {
        console.log("Boss synth tick error:", e);
      }
    }, 150);
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
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.1);
    } catch (e) {
      console.log("Gun sound error:", e);
    }
  }

  playChargeBeamSound() {
    if (!this.sfxEnabled) return;
    this.ensureActive();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(900, this.audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.25);
    } catch (e) {
      console.log("Charge beam sound error:", e);
    }
  }

  playExplosion(isAsteroid = false) {
    if (!this.sfxEnabled) return;
    this.ensureActive();
    if (!this.audioCtx) return;

    try {
      const bufferSize = this.audioCtx.sampleRate * 0.3;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(isAsteroid ? 400 : 800, this.audioCtx.currentTime);
      filter.frequency.linearRampToValueAtTime(50, this.audioCtx.currentTime + 0.3);
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);
      noise.start();
    } catch (e) {
      console.log("Explosion sound error:", e);
    }
  }
}
