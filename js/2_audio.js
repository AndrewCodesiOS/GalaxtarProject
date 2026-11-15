class AudioController {
  constructor() {
    this.audioCtx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    
    this.isBossMusicPlaying = false;
    this.nextNoteTime = 0;
    this.schedulerTimer = null;
    this.songStep = 0;

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.stopProceduralMusic();
      } else {
        if (this.musicEnabled) {
          this.startProceduralMusic();
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
    if (this.musicEnabled && !this.schedulerTimer) {
      this.startProceduralMusic();
    }
  }

  setMusicEnabled(val) {
    this.musicEnabled = val;
    if (val) {
      this.startProceduralMusic();
    } else {
      this.stopProceduralMusic();
    }
  }

  switchToBossMusic() {
    this.isBossMusicPlaying = true;
    this.songStep = 0; // Reset sequence cleanly on transition
  }

  switchToNormalMusic() {
    this.isBossMusicPlaying = false;
    this.songStep = 0;
  }

  startProceduralMusic() {
    this.init();
    if (!this.audioCtx || this.schedulerTimer) return;

    this.nextNoteTime = this.audioCtx.currentTime + 0.1;

    // Background scheduler ticks every 25ms to queue precise audio events ahead of time
    this.schedulerTimer = setInterval(() => {
      if (!this.musicEnabled || !this.audioCtx || this.audioCtx.state !== "running") return;

      // Lookahead scheduling window (0.1 seconds)
      while (this.nextNoteTime < this.audioCtx.currentTime + 0.1) {
        this.scheduleNote();
      }
    }, 25);
  }

  stopProceduralMusic() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  scheduleNote() {
    const t = this.nextNoteTime;
    
    // Normal exploration vs Boss chiptune notes & timing
    const normalBass = [130.81, 98.00, 110.00, 87.31]; // C3, G3, A3, F3
    const normalLead = [261.63, 329.63, 392.00, 523.25];
    
    const bossBass = [110.00, 110.00, 130.81, 98.00]; 
    const bossLead = [220.00, 329.63, 440.00, 523.25, 440.00, 329.63];

    const bNotes = this.isBossMusicPlaying ? bossBass : normalBass;
    const lNotes = this.isBossMusicPlaying ? bossLead : normalLead;
    const noteDuration = this.isBossMusicPlaying ? 0.15 : 0.25;

    try {
      // 1. Bass Oscillator
      const bassOsc = this.audioCtx.createOscillator();
      const bassGain = this.audioCtx.createGain();
      bassOsc.type = this.isBossMusicPlaying ? "sawtooth" : "triangle";
      bassOsc.frequency.setValueAtTime(bNotes[Math.floor(this.songStep / 2) % bNotes.length], t);

      bassGain.gain.setValueAtTime(this.isBossMusicPlaying ? 0.1 : 0.06, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + noteDuration);

      bassOsc.connect(bassGain);
      bassGain.connect(this.audioCtx.destination);
      bassOsc.start(t);
      bassOsc.stop(t + noteDuration);

      // 2. Arpeggio Lead Oscillator
      const leadOsc = this.audioCtx.createOscillator();
      const leadGain = this.audioCtx.createGain();
      leadOsc.type = "square";
      leadOsc.frequency.setValueAtTime(lNotes[this.songStep % lNotes.length], t);

      leadGain.gain.setValueAtTime(0.05, t);
      leadGain.gain.exponentialRampToValueAtTime(0.001, t + (noteDuration * 0.8));

      leadOsc.connect(leadGain);
      leadGain.connect(this.audioCtx.destination);
      leadOsc.start(t);
      leadOsc.stop(t + (noteDuration * 0.8));

      this.songStep++;
      this.nextNoteTime += noteDuration;
    } catch (e) {
      // Catch safety fallbacks
      this.nextNoteTime += 0.25;
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
