class AudioController {
  constructor() {
    this.audioCtx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    
    // Procedural Music State
    this.isBossMusicPlaying = false;
    this.musicInterval = null;

    // Automatically pause music when the app/tab goes to the background
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
    // Restart interval to immediately shift tempo/notes to the boss loop
    if (this.musicEnabled) {
      this.startMusic();
    }
  }

  switchToNormalMusic() {
    this.isBossMusicPlaying = false;
    // Restart interval to shift back to normal exploration groove
    if (this.musicEnabled) {
      this.startMusic();
    }
  }

  startMusic() {
    this.init();
    if (!this.audioCtx || this.musicInterval) return;

    // Normal exploration melody vs Boss battle melody
    const normalBass = [130.81, 98.00, 110.00, 87.31]; // C3, G3, A3, F3 groove
    const normalLead = [261.63, 329.63, 392.00, 523.25];
    
    const bossBass = [110, 110, 130.81, 98.00]; // Intense pulsing boss notes
    const bossLead = [220, 329.63, 440, 523.25, 440, 329.63];

    let step = 0;

    // We use different intervals/tempos: exploration is smoother, boss is frantic
    const tempo = this.isBossMusicPlaying ? 150 : 240;

    this.musicInterval = setInterval(() => {
      if (!this.musicEnabled || !this.audioCtx || this.audioCtx.state !== "running") return;
      
      try {
        const now = this.audioCtx.currentTime;
        const bNotes = this.isBossMusicPlaying ? bossBass : normalBass;
        const lNotes = this.isBossMusicPlaying ? bossLead : normalLead;

        // 1. Bass Synth
        const bassOsc = this.audioCtx.createOscillator();
        const bassGain = this.audioCtx.createGain();
        bassOsc.type = this.isBossMusicPlaying ? "sawtooth" : "triangle";
        bassOsc.frequency.setValueAtTime(bNotes[Math.floor(step / 2) % bNotes.length], now);
        
        bassGain.gain.setValueAtTime(this.isBossMusicPlaying ? 0.12 : 0.08, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + (this.isBossMusicPlaying ? 0.2 : 0.3));

        bassOsc.connect(bassGain);
        bassGain.connect(this.audioCtx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + (this.isBossMusicPlaying ? 0.2 : 0.3));

        // 2. Arpeggio Lead
        const leadOsc = this.audioCtx.createOscillator();
        const leadGain = this.audioCtx.createGain();
        leadOsc.type = "square";
        leadOsc.frequency.setValueAtTime(lNotes[step % lNotes.length], now);

        leadGain.gain.setValueAtTime(0.06, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        leadOsc.connect(leadGain);
        leadGain.connect(this.audioCtx.destination);
        leadOsc.start(now);
        leadOsc.stop(now + 0.15);

        step++;
      } catch (e) {
        console.log("Procedural music tick error:", e);
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
    gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
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
    gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
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
  }
}
