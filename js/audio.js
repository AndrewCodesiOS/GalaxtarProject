class AudioController {
  constructor() {
    this.ctx = null;
    this.isPlaying = JSON.parse(localStorage.getItem("gx_isPlaying") ?? "true");
    this.isSFXEnabled = JSON.parse(localStorage.getItem("gx_isSFXEnabled") ?? "true");
    this.ambientInterval = null;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  savePrefs() {
    localStorage.setItem("gx_isPlaying", JSON.stringify(this.isPlaying));
    localStorage.setItem("gx_isSFXEnabled", JSON.stringify(this.isSFXEnabled));
  }

  playMusic() {
    this.isPlaying = true;
    this.savePrefs();
    this.initContext();
    if (this.ambientInterval) return;

    const chords = [
      [110.0, 164.81, 220.0],
      [98.0, 146.83, 196.0],
      [87.31, 130.81, 174.61],
      [82.41, 123.47, 164.81]
    ];
    let step = 0;

    const triggerPad = () => {
      if (!this.isPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = chords[step % chords.length];
      step++;

      notes.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.018, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 5.0);
      });
    };

    triggerPad();
    this.ambientInterval = setInterval(triggerPad, 4600);
  }

  pauseMusic() {
    this.isPlaying = false;
    this.savePrefs();
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }

  playSystemClick() {
    if (!this.isSFXEnabled) return;
    this.initContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playGunSound() {
    if (!this.isSFXEnabled) return;
    this.initContext();
    const now = this.ctx.currentTime;
    const pitchMod = 0.8 + Math.random() * 0.4;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(680 * pitchMod, now);
    osc.frequency.exponentialRampToValueAtTime(140 * pitchMod, now + 0.11);

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playChargeBeamSound() {
    if (!this.isSFXEnabled) return;
    this.initContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.45);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  playExplosion(isAsteroid = false) {
    if (!this.isSFXEnabled) return;
    this.initContext();
    const now = this.ctx.currentTime;
    const duration = isAsteroid ? 0.25 : 0.45;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isAsteroid ? 900 : 420, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isAsteroid ? 0.08 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }
}
