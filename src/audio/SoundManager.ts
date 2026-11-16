export type MusicMode = 'home' | 'gameplay' | 'boss' | 'victory';

export type SfxName =
  | 'click'
  | 'gameStart'
  | 'coin'
  | 'correct'
  | 'wrong'
  | 'combo'
  | 'levelUp'
  | 'bossIntro'
  | 'victory'
  | 'gameOver';

export interface AudioPrefs {
  soundEnabled: boolean;
  musicEnabled: boolean;
}

const PREFS_KEY = 'cgquiz_audio_prefs';

interface TrackConfig {
  bpm: number;
  lead: number[];
  bass: number[];
  arp: number[];
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  intensity: number;
}

function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const TRACKS: Record<MusicMode, TrackConfig> = {
  home: {
    bpm: 128,
    leadWave: 'square',
    bassWave: 'sawtooth',
    intensity: 0.9,
    lead: [72, 0, 76, 79, 0, 76, 74, 0, 72, 74, 76, 0, 79, 0, 84, 79],
    bass: [48, 48, 60, 48, 43, 43, 55, 43, 45, 45, 57, 45, 41, 41, 53, 43],
    arp: [60, 64, 67, 72, 55, 59, 62, 67, 57, 60, 64, 69, 53, 57, 60, 67],
  },
  gameplay: {
    bpm: 146,
    leadWave: 'square',
    bassWave: 'sawtooth',
    intensity: 1.0,
    lead: [76, 76, 0, 79, 81, 0, 79, 76, 74, 0, 76, 79, 83, 0, 84, 79],
    bass: [45, 57, 45, 57, 41, 53, 41, 53, 43, 55, 43, 55, 48, 60, 43, 55],
    arp: [69, 72, 76, 81, 65, 69, 72, 77, 67, 71, 74, 79, 72, 76, 79, 84],
  },
  boss: {
    bpm: 158,
    leadWave: 'sawtooth',
    bassWave: 'square',
    intensity: 1.15,
    lead: [64, 0, 67, 68, 71, 0, 70, 68, 64, 76, 75, 74, 71, 70, 68, 67],
    bass: [40, 40, 52, 40, 41, 41, 53, 41, 43, 43, 55, 43, 42, 42, 54, 40],
    arp: [52, 55, 59, 64, 53, 56, 60, 65, 55, 59, 62, 67, 54, 58, 62, 66],
  },
  victory: {
    bpm: 136,
    leadWave: 'triangle',
    bassWave: 'square',
    intensity: 0.95,
    lead: [72, 76, 79, 84, 0, 84, 83, 84, 79, 0, 76, 79, 84, 88, 86, 84],
    bass: [48, 60, 48, 60, 45, 57, 45, 57, 41, 53, 41, 53, 43, 55, 43, 55],
    arp: [60, 64, 67, 72, 69, 72, 76, 81, 65, 69, 72, 77, 67, 71, 74, 79],
  },
};

/**
 * Web Audio API sound effects and adaptive chiptune music synthesizer.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private prefs: AudioPrefs = { soundEnabled: true, musicEnabled: true };
  private unlocked = false;
  private mode: MusicMode = 'home';
  private step = 0;
  private nextNoteTime = 0;
  private schedulerTimer: number | null = null;
  private lastSfxTime: Partial<Record<SfxName, number>> = {};
  private listeners = new Set<(prefs: AudioPrefs) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
          this.prefs = {
            soundEnabled: parsed.soundEnabled !== false,
            musicEnabled: parsed.musicEnabled !== false,
          };
        }
      } catch {
        // ignore storage errors
      }
    }
  }

  getPrefs(): AudioPrefs {
    return { ...this.prefs };
  }

  isMuted(): boolean {
    return !this.prefs.soundEnabled;
  }

  subscribe(fn: (prefs: AudioPrefs) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const snap = this.getPrefs();
    for (const fn of this.listeners) fn(snap);
  }

  private savePrefs(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      // ignore
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.createNoiseBuffer();
      this.syncGains();
    }
    return this.ctx;
  }

  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const length = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private syncGains(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.prefs.soundEnabled ? 0.55 : 0.0001, now, 0.02);
    this.musicGain.gain.setTargetAtTime(
      this.prefs.soundEnabled && this.prefs.musicEnabled ? 0.24 : 0.0001,
      now,
      0.04
    );
    this.sfxGain.gain.setTargetAtTime(this.prefs.soundEnabled ? 0.65 : 0.0001, now, 0.02);
  }

  unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    if (!this.unlocked) {
      this.unlocked = true;
      this.syncGains();
      if (this.prefs.soundEnabled && this.prefs.musicEnabled) {
        this.startMusicLoop();
      }
    }
  }

  toggleSound(): boolean {
    const next = !this.prefs.soundEnabled;
    this.prefs.soundEnabled = next;
    if (next) {
      this.prefs.musicEnabled = true;
      this.unlock();
      this.startMusicLoop();
    } else {
      this.stopMusicLoop();
    }
    this.syncGains();
    this.savePrefs();
    this.emit();
    return next;
  }

  toggleMusic(): boolean {
    this.prefs.musicEnabled = !this.prefs.musicEnabled;
    if (this.prefs.soundEnabled && this.prefs.musicEnabled) {
      this.unlock();
      this.startMusicLoop();
    } else {
      this.stopMusicLoop();
    }
    this.syncGains();
    this.savePrefs();
    this.emit();
    return this.prefs.musicEnabled;
  }

  setMusicMode(nextMode: MusicMode): void {
    if (this.mode === nextMode) return;
    this.mode = nextMode;
    this.step = 0;
  }

  private startMusicLoop(): void {
    if (this.schedulerTimer !== null || !this.ctx) return;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.schedulerTimer = window.setInterval(() => this.scheduleAhead(), 35);
  }

  private stopMusicLoop(): void {
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private scheduleAhead(): void {
    if (!this.ctx || !this.prefs.soundEnabled || !this.prefs.musicEnabled || !this.unlocked) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.14) {
      this.scheduleStep(this.step, this.nextNoteTime);
      const track = TRACKS[this.mode];
      const sixteenthSec = 60 / track.bpm / 4;
      this.nextNoteTime += sixteenthSec;
      this.step = (this.step + 1) % 16;
    }
  }

  private scheduleStep(stepIndex: number, time: number): void {
    if (!this.ctx || !this.musicGain) return;
    const track = TRACKS[this.mode];
    const stepDur = 60 / track.bpm / 4;

    const leadNote = track.lead[stepIndex];
    if (leadNote > 0) {
      this.scheduleTone(mtof(leadNote), time, stepDur * 0.85, track.leadWave, 0.14 * track.intensity, this.musicGain);
    }

    const bassNote = track.bass[stepIndex];
    if (bassNote > 0) {
      this.scheduleTone(mtof(bassNote), time, stepDur * 0.8, track.bassWave, 0.18 * track.intensity, this.musicGain, 550);
    }

    const arpNote = track.arp[stepIndex];
    if (arpNote > 0) {
      this.scheduleTone(mtof(arpNote), time, stepDur * 0.48, 'triangle', 0.07 * track.intensity, this.musicGain);
    }

    if (stepIndex % 4 === 0) {
      this.scheduleKick(time, this.musicGain);
    }
    if (stepIndex === 4 || stepIndex === 12) {
      this.scheduleNoiseHit(time, 0.09, 1800, 0.12, this.musicGain);
    } else if (stepIndex % 2 === 1) {
      this.scheduleNoiseHit(time, 0.035, 6500, 0.06, this.musicGain);
    }
  }

  private scheduleTone(
    freq: number,
    time: number,
    dur: number,
    wave: OscillatorType,
    vol: number,
    dest: AudioNode,
    lowpassFreq?: number
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    if (lowpassFreq) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(lowpassFreq, time);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private scheduleKick(time: number, dest: AudioNode): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.11);

    gain.gain.setValueAtTime(0.32, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.13);
  }

  private scheduleNoiseHit(
    time: number,
    dur: number,
    highpassFreq: number,
    vol: number,
    dest: AudioNode
  ): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(highpassFreq, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(time);
    src.stop(time + dur + 0.01);
  }

  // Semantic game-event helpers
  playClick(): void {
    this.playSfx('click');
  }

  playGameStart(): void {
    this.playSfx('gameStart');
  }

  playCoin(): void {
    this.playSfx('coin');
  }

  playCorrect(): void {
    this.playSfx('correct');
  }

  playWrong(): void {
    this.playSfx('wrong');
  }

  playCombo(streak = 3): void {
    this.playSfx('combo', streak);
  }

  playLevelUp(): void {
    this.playSfx('levelUp');
  }

  playBossIntro(): void {
    this.playSfx('bossIntro');
  }

  playVictory(): void {
    this.playSfx('victory');
  }

  playGameOver(): void {
    this.playSfx('gameOver');
  }

  playSfx(name: SfxName, comboLevel = 1): void {
    if (!this.prefs.soundEnabled) return;
    this.unlock();
    if (!this.ctx || !this.sfxGain) return;

    const nowMs = performance.now();
    const minCooldown = name === 'click' ? 45 : 70;
    if (nowMs - (this.lastSfxTime[name] ?? 0) < minCooldown) return;
    this.lastSfxTime[name] = nowMs;

    const t = this.ctx.currentTime + 0.005;
    const dest = this.sfxGain;

    switch (name) {
      case 'click': {
        this.scheduleTone(680, t, 0.035, 'square', 0.18, dest);
        this.scheduleTone(1020, t + 0.02, 0.035, 'square', 0.14, dest);
        break;
      }
      case 'gameStart': {
        const notes = [330, 440, 554, 659, 880];
        notes.forEach((f, idx) =>
          this.scheduleTone(f, t + idx * 0.065, 0.09, 'square', 0.22, dest)
        );
        this.scheduleTone(1175, t + 0.34, 0.18, 'triangle', 0.28, dest);
        break;
      }
      case 'coin': {
        this.scheduleTone(987.77, t, 0.07, 'square', 0.22, dest);
        this.scheduleTone(1318.51, t + 0.07, 0.22, 'square', 0.24, dest);
        break;
      }
      case 'correct': {
        this.scheduleTone(523.25, t, 0.08, 'square', 0.22, dest);
        this.scheduleTone(659.25, t + 0.07, 0.08, 'square', 0.22, dest);
        this.scheduleTone(783.99, t + 0.14, 0.16, 'triangle', 0.26, dest);
        break;
      }
      case 'wrong': {
        this.scheduleTone(240, t, 0.14, 'sawtooth', 0.24, dest, 900);
        this.scheduleTone(175, t + 0.12, 0.22, 'sawtooth', 0.25, dest, 700);
        break;
      }
      case 'combo': {
        const shift = Math.min(6, Math.max(0, comboLevel - 2)) * 45;
        [587 + shift, 740 + shift, 880 + shift, 1174 + shift].forEach((f, i) =>
          this.scheduleTone(f, t + i * 0.055, 0.09, 'square', 0.22, dest)
        );
        break;
      }
      case 'levelUp': {
        [523, 659, 784, 1046, 1318, 1568].forEach((f, i) =>
          this.scheduleTone(f, t + i * 0.075, 0.14, 'square', 0.24, dest)
        );
        break;
      }
      case 'bossIntro': {
        this.scheduleTone(440, t, 0.18, 'sawtooth', 0.25, dest, 1400);
        this.scheduleTone(311, t + 0.18, 0.18, 'sawtooth', 0.25, dest, 1200);
        this.scheduleTone(220, t + 0.36, 0.35, 'square', 0.3, dest, 1000);
        this.scheduleKick(t + 0.36, dest);
        break;
      }
      case 'victory': {
        const melody = [523, 659, 784, 1046, 784, 1046, 1318];
        melody.forEach((f, i) =>
          this.scheduleTone(f, t + i * 0.09, i === melody.length - 1 ? 0.35 : 0.11, 'square', 0.24, dest)
        );
        break;
      }
      case 'gameOver': {
        [392, 370, 349, 311].forEach((f, i) =>
          this.scheduleTone(f, t + i * 0.19, i === 3 ? 0.45 : 0.18, 'sawtooth', 0.22, dest, 1100)
        );
        break;
      }
    }
  }
}

export const soundManager = new SoundManager();
