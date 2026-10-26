// Procedural Audio Engine for Apex Brawl
// Provides instant martial-arts fighting game sound effects using Web Audio API

class SoundFX {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.isMuted = false;
    this.volume = 0.7;
    this.bgmOscillators = [];
    this.isMusicPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // Swift air whoosh / blade slice on menu hover
  playHover() {
    this.init();
    if (this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3200, this.ctx.currentTime + 0.08);

    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // Heavy martial arts gong / metallic impact strike on selection
  playSelect() {
    this.init();
    if (this.isMuted) return;

    const t = this.ctx.currentTime;

    // Metallic hit fundamental
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(140, t);
    osc1.frequency.exponentialRampToValueAtTime(45, t + 0.4);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(560, t);
    osc2.frequency.exponentialRampToValueAtTime(180, t + 0.25);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.45);
    osc2.stop(t + 0.45);
  }

  // Sub-bass rumble boom on game start / confirmation
  playStartBoom() {
    this.init();
    if (this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.9);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.9);
  }

  // Precise countdown tick for the 2-minute round timer
  playTimerTick(isUrgent = false) {
    this.init();
    if (this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isUrgent ? 880 : 440, t);
    osc.frequency.exponentialRampToValueAtTime(isUrgent ? 660 : 330, t + 0.05);

    gain.gain.setValueAtTime(isUrgent ? 0.22 : 0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Ambient Dark Martial Drone (Temple of Kombat)
  toggleAmbientDrone() {
    this.init();
    if (this.isMusicPlaying) {
      this.bgmOscillators.forEach(o => {
        try { o.stop(); o.disconnect(); } catch (e) {}
      });
      this.bgmOscillators = [];
      this.isMusicPlaying = false;
      return false;
    }

    const t = this.ctx.currentTime;
    const freqs = [55, 110, 164.81]; // A1, A2, E3 dark mystical chord

    this.bgmOscillators = freqs.map(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      // Low pass filter to make it a deep, rumbling temple pad
      const lpf = this.ctx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(220, t);

      gain.gain.setValueAtTime(0.08, t);

      osc.connect(lpf);
      lpf.connect(gain);
      gain.connect(this.musicGain);

      osc.start();
      return osc;
    });

    this.isMusicPlaying = true;
    return true;
  }
}

window.soundFX = new SoundFX();
