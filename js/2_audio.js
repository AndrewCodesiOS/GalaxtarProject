class AudioController {
  constructor() {
    this.audioCtx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    
    this.isBossMusicPlaying = false;
    this.musicTimerId = null;

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
    if (this.musicEnabled && !this.musicTimerId) {
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
      this.startMusic(); // Restarts the loop instantly with the boss tempo/notes
    }
  }

  switchToNormalMusic() {
    this.isBossMusicPlaying = false;
    if (this.musicEnabled) {
      this.startMusic(); // Restarts the loop instantly with the normal exploration tempo/notes
    }
  }

  startMusic() {
    this.init();
    if (!this.audioCtx) return;
    if (this.musicTimerId) {
      clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }

    // Normal exploration groove (chill, sweeping arpeggios)
    const normalBass = [130.81, 98.00, 110.00, 87.31]; 
    const normalLead = [261.63, 329.63, 392.00, 523.25];

    // Intense boss battle groove (frantic, aggressive pulsing)
    const bossBass = [110.00, 110.00, 130.81, 98.00]; 
    const bossLead = [220.00, 329.63, 440.00, 523.25, 440.00, 329.63];

    let step = 0;
    // Normal music has a relaxed tempo (300ms), boss music is fast and tense (160ms)
    const intervalTime = this.isBossMusicPlaying ? 160 : 300;

    this.musicTimerId = setInterval(() => {
      if (!this.musicEnabled || !this.audioCtx || this.audioCtx.state !== "running") return;

      try {
        const now = this.audioCtx.currentTime;
        const bNotes = this.isBossMusicPlaying ? bossBass : normalBass;
        const lNotes = this.isBossMusicPlaying ? bossLead : normalLead;

        // Bass Synth Tone
        const osc1 = this.audioCtx.createOscillator();
        const gain1 = this.audioCtx.createGain();
        osc1.type = this.isBossMusicPlaying ? "sawtooth" : "triangle";
        osc1.frequency.setValueAtTime(bNotes[Math.floor(step / 2) % bNotes.length], now);
        
        gain1.gain.setValueAtTime(this.isBossMusicPlaying ? 0.09 : 0.06, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc1.connect(gain1);
        gain1.connect(this.audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.2);

        // Arpeggio Lead Tone
        const osc2 = this.audioCtx.createOscillator();
        const gain2 = this.audioCtx.createGain();
        osc2.type = "square";
        osc2.frequency.setValueAtTime(lNotes[step % lNotes.length], now);

        gain2.gain.setValueAtTime(0.05, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc2.connect(gain2);
        gain2.connect(this.audioCtx.destination);
        osc2.start(now);
        osc2.stop(now + 0.12);

        step++;
      } catch (err) {
        // Silently catch timing dropouts
      }
    }, intervalTime);
  }

  stopMusic() {
    if (this.musicTimerId) {
      clearInterval(this.musicTimerId);
      this.musicTimerId = null;
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
