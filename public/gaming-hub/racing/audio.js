class RacingAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.sirenOsc = null;
        this.sirenGain = null;
        this.sirenLFO = null;

        this.settings = {
            master: 0.5,
            engine: 0.4,
            siren: 0.4,
            sfx: 0.6,
            muted: false
        };

        this.loadSettings();
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // Master Bus
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.master;
        this.masterGain.connect(this.ctx.destination);

        this.initEngineSound();
        this.initSirenSound();
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    loadSettings() {
        const stored = localStorage.getItem('racing_audio_settings');
        if (stored) {
            this.settings = { ...this.settings, ...JSON.parse(stored) };
        }
    }

    saveSettings() {
        localStorage.setItem('racing_audio_settings', JSON.stringify(this.settings));
        this.updateVolumes();
    }

    updateVolumes() {
        if (!this.ctx) return;
        this.masterGain.gain.setTargetAtTime(
            this.settings.muted ? 0 : this.settings.master,
            this.ctx.currentTime, 0.1
        );
        // Engine and Siren handled dynamically, but base levels stored in settings
    }

    // --- Procedural Sounds ---

    initEngineSound() {
        // Engine: Sawtooth wave + low pass filter
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 100; // Idle

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0;

        // Filter to dampen the buzz
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);

        this.engineOsc.start();
    }

    updateEngine(speedRatio) { // 0 to 1
        if (!this.ctx) return;

        const baseFreq = 80;
        const maxFreq = 600;
        const targetFreq = baseFreq + (maxFreq - baseFreq) * speedRatio;

        // Jitter for realism
        const jitter = Math.random() * 5;

        this.engineOsc.frequency.setTargetAtTime(targetFreq + jitter, this.ctx.currentTime, 0.1);

        // Volume ducking when idle
        const vol = Math.max(0.1, Math.min(speedRatio + 0.1, 0.5)) * this.settings.engine;
        this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }

    initSirenSound() {
        // Siren: modulated oscillator
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenOsc.type = 'square';
        this.sirenOsc.frequency.value = 600;

        this.sirenLFO = this.ctx.createOscillator();
        this.sirenLFO.type = 'sine';
        this.sirenLFO.frequency.value = 2; // Rate of wail

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 200; // Depth

        this.sirenLFO.connect(lfoGain);
        lfoGain.connect(this.sirenOsc.frequency);

        this.sirenGain = this.ctx.createGain();
        this.sirenGain.gain.value = 0;

        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.masterGain);

        this.sirenOsc.start();
        this.sirenLFO.start();
    }

    setSiren(active, proximity = 1) {
        if (!this.ctx) return;
        const targetVol = active ? (this.settings.siren * proximity) : 0;
        this.sirenGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.2);
    }

    // --- SFX One-shots ---

    playBeep(pitch = 600, duration = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = pitch;

        gain.gain.value = this.settings.sfx;

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.stop(this.ctx.currentTime + duration);
    }

    playCrash(force) {
        if (!this.ctx) return;
        // White noise burst
        const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 sec
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        // Scale with force 0 to 1
        gain.gain.value = Math.min(force, 1) * this.settings.sfx;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    }
}

// Singleton
window.RacingAudioSystem = new RacingAudio();
