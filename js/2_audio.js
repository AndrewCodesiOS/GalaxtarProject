class AudioController {
  constructor() {
    this.audioCtx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    
    // Background music setup using your m4a file
    this.bgMusic = new Audio("galaxtartheme.m4a");
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.3;

    // Procedural Boss Beat State
    this.isBossMusicPlaying = false;
    this.bossInterval = null;
    this.currentBossTier = null;
    this.isPhoenixRebornMusic = false;

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
        this.startBossSynth(this.currentBossTier, this.isPhoenixRebornMusic);
      } else {
        this.bgMusic.play().catch(e => console.log("Music play error:", e));
      }
    } else {
      this.bgMusic.pause();
      this.stopBossSynth();
    }
  }

  switchToBossMusic(bossTier = 40000, isReborn = false) {
    this.isBossMusicPlaying = true;
    this.currentBossTier = bossTier;
    this.isPhoenixRebornMusic = isReborn;
    this.bgMusic.pause();
    if (this.musicEnabled) {
      this.startBossSynth(bossTier, isReborn);
    }
  }

  switchToNormalMusic() {
    this.isBossMusicPlaying = false;
    this.currentBossTier = null;
    this.isPhoenixRebornMusic = false;
    this.stopBossSynth();
    if (this.musicEnabled) {
      this.bgMusic.play().catch(e => console.log("Normal music play error:", e));
    }
  }

  startBossSynth(tier, isReborn = false) {
    this.init();
    if (this.bossInterval) {
      clearInterval(this.bossInterval);
      this.bossInterval = null;
    }

    // Define unique musical profiles for each boss tier (increased bass/lead volumes for a louder boss theme)
    let profile = {
      bassNotes: [110, 110, 130.81, 98.00],
      leadNotes: [220, 329.63, 440, 523.25],
      bassType: "sawtooth",
      leadType: "square",
      tempo: 150
    };

    if (tier === 80000) {
      // Vortex Interceptor: Eerie, pulsing sub-bass & detuned notes
      profile = {
        bassNotes: [82.41, 73.42, 92.50, 65.41],
        leadNotes: [164.81, 196.00, 246.94, 220.00],
        bassType: "sine",
        leadType: "sawtooth",
        tempo: 180
      };
    } else if (tier === 120000) {
      if (isReborn) {
        // Helios Phoenix (REBORN): Ultra-frantic, blazing solar overdrive theme
        profile = {
          bassNotes: [110, 164.81, 146.83, 130.81],
          leadNotes: [440, 659.25, 880, 987.77, 1046.50],
          bassType: "sawtooth",
          leadType: "sawtooth",
          tempo: 100
        };
      } else {
        // Helios Phoenix (Normal): Deep, heavy, commanding solar dreadnought theme
        profile = {
          bassNotes: [98.00, 146.83, 123.47, 110.00],
          leadNotes: [293.66, 369.99, 440, 587.33],
          bassType: "sawtooth",
          leadType: "triangle",
          tempo: 135
        };
      }
    } else if (tier === 160000) {
      // Hydra-9 Swarm: Chaotic, shifting multi-rhythms
      profile = {
        bassNotes: [110, 146.83, 98.00, 123.47],
        leadNotes: [220, 277.18, 329.63, 415.30],
        bassType: "sawtooth",
        leadType: "sawtooth",
        tempo: 110
      };
    } else if (tier === 200000) {
      // Eternity Engine: Intimidating, heavy cathedral sweeps & metallic chimes
      profile = {
        bassNotes: [55.00, 55.00, 65.41, 49.00],
        leadNotes: [110, 220, 329.63, 440, 880],
        bassType: "sawtooth",
        leadType: "square",
        tempo: 200
      };
    }

    let step = 0;

    this.bossInterval = setInterval(() => {
      if (!this.musicEnabled) return;
      this.ensureActive();
      if (!this.audioCtx) return;
      
      try {
        const now = this.audioCtx.currentTime;

        const bassOsc = this.audioCtx.createOscillator();
        const bassGain = this.audioCtx.createGain();
        bassOsc.type = profile.bassType;
        bassOsc.frequency.setValueAtTime(profile.bassNotes[Math.floor(step / 2) % profile.bassNotes.length], now);
        
        // Raised boss music gain for a louder, more prominent boss presence
        bassGain.gain.setValueAtTime(0.24, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        bassOsc.connect(bassGain);
        bassGain.connect(this.audioCtx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.2);

        const leadOsc = this.audioCtx.createOscillator();
        const leadGain = this.audioCtx.createGain();
        leadOsc.type = profile.leadType;
        leadOsc.frequency.setValueAtTime(profile.leadNotes[step % profile.leadNotes.length], now);

        leadGain.gain.setValueAtTime(0.18, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        leadOsc.connect(leadGain);
        leadGain.connect(this.audioCtx.destination);
        leadOsc.start(now);
        leadOsc.stop(now + 0.15);

        step++;
      } catch (e) {
        console.log("Boss synth tick error:", e);
      }
    }, profile.tempo);
  }

  stopBossSynth() {
    if (this.bossInterval) {
      clearInterval(this.bossInterval);
      this.bossInterval = null;
    }
  }

  playPhoenixRebirthSound() {
    if (!this.sfxEnabled) return;
    this.ensureActive();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 1.2);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 1.5);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 1.5);
    } catch (e) {
      console.log("Phoenix rebirth sound error:", e);
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
      // Lowered gain/volume specifically for bullet SFX
      gain.gain.setValueAtTime(0.008, this.audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.005, this.audioCtx.currentTime + 0.1);
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
      gain.gain.setValueAtTime(0.008, this.audioCtx.currentTime);
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
      gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
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
