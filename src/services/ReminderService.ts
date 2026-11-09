/**
 * ReminderService
 *
 * Kid-friendly audio feedback, fully synthesized (Web Audio API + speech synthesis):
 * short chimes, jingles, spoken encouragements and an original bedtime song.
 * Everything respects the parent's feedback settings (sounds / voice / songs / volume).
 *
 * Offline-first: no audio files, no network calls.
 */
import { DEFAULT_FEEDBACK, FeedbackSettings } from '../domain/models';

type Lang = 'fr' | 'en';

const ENCOURAGEMENTS: Record<Lang, string[]> = {
  fr: [
    'Bravo {name} !',
    'Trop fort !',
    'Tu es un champion !',
    'Waouh, quelle rapidité !',
    'Et une de plus !',
    'Super travail, {name} !',
    'Tu assures !',
    'Génial, continue comme ça !',
    'Youpi !',
    'Quelle star !',
    'Incroyable, {name} !',
    'Tope là !',
  ],
  en: [
    'Well done, {name}!',
    'Awesome!',
    'You are a champion!',
    'Wow, so fast!',
    'One more done!',
    'Great job, {name}!',
    'You rock!',
    'Brilliant, keep going!',
    'Hooray!',
    'What a star!',
    'Amazing, {name}!',
    'High five!',
  ],
};

/** Original bedtime song: melody (note, beats) and one lyric line per phrase. */
const BEDTIME_SONG = {
  bpm: 92,
  phrases: [
    [[329.63, 1], [392.0, 1], [440.0, 1], [392.0, 1], [329.63, 1], [293.66, 1], [261.63, 2]],
    [[293.66, 1], [329.63, 1], [349.23, 1], [329.63, 1], [293.66, 1], [261.63, 1], [246.94, 2]],
    [[261.63, 1], [329.63, 1], [392.0, 1], [440.0, 1], [392.0, 1], [349.23, 1], [329.63, 2]],
    [[293.66, 1], [261.63, 1], [246.94, 1], [293.66, 1], [261.63, 4]],
  ] as [number, number][][],
  lyrics: {
    fr: [
      'Les étoiles sont allumées,',
      'ma routine est terminée,',
      'je ferme les yeux tout doux,',
      'bonne nuit, bisous partout !',
    ],
    en: [
      'All the stars are shining bright,',
      'I did my routine just right,',
      'close my eyes and snuggle tight,',
      'sweet dreams, everyone, good night!',
    ],
  },
};

class ReminderService {
  private ctx: AudioContext | null = null;
  private settings: FeedbackSettings = { ...DEFAULT_FEEDBACK };
  private songTimers: ReturnType<typeof setTimeout>[] = [];
  private lastEncouragement = -1;

  /** Applies the parent's feedback settings. */
  public configure(settings: FeedbackSettings | undefined) {
    this.settings = { ...DEFAULT_FEEDBACK, ...settings };
    if (!this.settings.voice) this.cancelSpeech();
    if (!this.settings.songs) this.stopSong();
  }

  public get feedback(): FeedbackSettings {
    return this.settings;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      // Create context on demand (since browsers require user interaction)
      const audioWindow = window as Window & typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioCtx = audioWindow.AudioContext || audioWindow.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    delay: number = 0,
    { gain: peak = 0.15, force = false, slideTo }: { gain?: number; force?: boolean; slideTo?: number } = {}
  ) {
    // `force` is used by songs, which have their own switch
    if (!force && !this.settings.sounds) return;
    if (this.settings.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Resume context if suspended (common browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);

    gain.gain.setValueAtTime(0, start);
    // Smooth ramp-in, then decay
    gain.gain.linearRampToValueAtTime(peak * this.settings.volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  }

  /* ----------------------------- Short sounds ----------------------------- */

  /** Task moved to "doing". */
  public playMoveSound() {
    this.playTone(330, 0.15, 'triangle'); // E4
    this.playTone(440, 0.15, 'triangle', 0.05); // A4
  }

  /** Task moved to "done". */
  public playTaskDoneSound() {
    this.playTone(523.25, 0.25, 'sine'); // C5
    this.playTone(659.25, 0.25, 'sine', 0.08); // E5
    this.playTone(783.99, 0.35, 'sine', 0.16); // G5
  }

  /** A star lands in the counter: high twinkle. */
  public playStarSound() {
    this.playTone(1318.51, 0.12, 'sine', 0, { gain: 0.1 }); // E6
    this.playTone(1760.0, 0.25, 'sine', 0.07, { gain: 0.08 }); // A6
  }

  /** A routine phase (e.g. "After school") is completed. */
  public playPhaseCompleteSound() {
    this.playTone(392.0, 0.2, 'triangle'); // G4
    this.playTone(523.25, 0.2, 'triangle', 0.1); // C5
    this.playTone(659.25, 0.2, 'triangle', 0.2); // E5
    this.playTone(783.99, 0.45, 'sine', 0.3); // G5
  }

  /** Medal or trophy unlocked: sparkling fanfare. */
  public playMedalSound() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5 E5 G5 C6 E6
    notes.forEach((freq, i) => this.playTone(freq, 0.3, 'triangle', i * 0.09));
    this.playTone(1567.98, 0.9, 'sine', notes.length * 0.09); // G6 shimmer
  }

  /** A badge drops into the piggy bank: a playful "oink" then a coin clink. */
  public playPiggyBankSound() {
    this.playTone(320, 0.18, 'sawtooth', 0, { gain: 0.06, slideTo: 180 });
    this.playTone(300, 0.2, 'sawtooth', 0.2, { gain: 0.06, slideTo: 160 });
    this.playTone(1975.53, 0.08, 'square', 0.45, { gain: 0.04 }); // clink
    this.playTone(2637.02, 0.25, 'sine', 0.5, { gain: 0.06 });
  }

  /** Badges exchanged for a real reward: cash-register style flourish. */
  public playPurchaseSound() {
    [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => this.playTone(f, 0.18, 'square', i * 0.07, { gain: 0.05 }));
    this.playTone(2093.0, 0.6, 'sine', 0.32, { gain: 0.1 });
  }

  /** Treasure chest opens: wooden creak, then a magical rising sparkle. */
  public playChestOpenSound() {
    this.playTone(140, 0.35, 'sawtooth', 0, { gain: 0.05, slideTo: 260 });
    [659.25, 783.99, 987.77, 1318.51, 1567.98, 1975.53].forEach((f, i) =>
      this.playTone(f, 0.35, 'sine', 0.3 + i * 0.07, { gain: 0.09 })
    );
    this.playTone(2637.02, 1.0, 'sine', 0.75, { gain: 0.06 });
  }

  /** A treasure is tapped in the showcase: short "bling". */
  public playTreasureTapSound() {
    this.playTone(1567.98, 0.12, 'triangle', 0, { gain: 0.08 });
    this.playTone(2093.0, 0.3, 'sine', 0.06, { gain: 0.07 });
  }

  /** Switching to the next/previous treasure: soft whoosh-tick. */
  public playTreasureSwipeSound() {
    this.playTone(600, 0.12, 'triangle', 0, { gain: 0.05, slideTo: 900 });
  }

  /** Reminder for a late task: a gentle "ding-dong", noticeable but not alarming. */
  public playReminderSound() {
    this.playTone(659.25, 0.5, 'sine', 0, { gain: 0.18 }); // E5
    this.playTone(523.25, 0.7, 'sine', 0.35, { gain: 0.18 }); // C5
  }

  /** Whole routine completed. */
  public playRoutineSuccessSound() {
    const tempo = 0.12;
    this.playTone(261.63, 0.4, 'sine', 0); // C4
    this.playTone(329.63, 0.4, 'sine', tempo); // E4
    this.playTone(392.0, 0.4, 'sine', tempo * 2); // G4
    this.playTone(523.25, 0.5, 'sine', tempo * 3); // C5
    this.playTone(659.25, 0.6, 'triangle', tempo * 4); // E5
    this.playTone(783.99, 0.6, 'triangle', tempo * 5); // G5
    this.playTone(1046.5, 0.8, 'sine', tempo * 6); // C6
  }

  /** Parent resets the session. */
  public playResetSound() {
    this.playTone(440, 0.3, 'sine'); // A4
    this.playTone(330, 0.4, 'sine', 0.1); // E4
  }

  /* -------------------------------- Voice -------------------------------- */

  private cancelSpeech() {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  }

  /**
   * Speaks a message (spoken encouragements, announcements).
   * Uses the browser's speech synthesis engine.
   */
  public triggerVoiceReminder(
    message: string,
    lang: 'fr-FR' | 'en-US' = 'fr-FR',
    { force = false, queue = false }: { force?: boolean; queue?: boolean } = {}
  ) {
    if (!force && !this.settings.voice) return;
    if (this.settings.volume <= 0) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      // Cancel active speech to avoid queuing delays
      if (!queue) window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = lang;
      utterance.rate = 0.9; // Slightly slower for children
      utterance.pitch = 1.15; // Soft high pitch
      utterance.volume = this.settings.volume;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis error:', err);
    }
  }

  /** True while the speech engine is talking (encouragement, song…). */
  public isSpeaking(): boolean {
    return typeof window !== 'undefined' && !!window.speechSynthesis?.speaking;
  }

  /**
   * Speaks a message and resolves when it is finished, without interrupting
   * whatever is being said (waits up to `maxWaitMs` for silence first).
   * Resolves immediately when the voice is disabled.
   */
  public async speakAndWait(message: string, language: Lang, maxWaitMs = 15_000): Promise<void> {
    if (!this.settings.voice || this.settings.volume <= 0) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const start = Date.now();
    while (this.isSpeaking() && Date.now() - start < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    await new Promise<void>((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = language === 'fr' ? 'fr-FR' : 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.15;
        utterance.volume = this.settings.volume;
        // Some engines never fire `end`: fall back on an estimate of the speech length
        const fallback = setTimeout(resolve, 1500 + message.length * 90);
        const done = () => {
          clearTimeout(fallback);
          resolve();
        };
        utterance.onend = done;
        utterance.onerror = done;
        window.speechSynthesis.speak(utterance);
      } catch {
        resolve();
      }
    });
  }

  /** Speaks a random encouragement (never twice the same in a row). */
  public encourage(name: string, language: Lang) {
    const pool = ENCOURAGEMENTS[language];
    let index = Math.floor(Math.random() * pool.length);
    if (index === this.lastEncouragement) index = (index + 1) % pool.length;
    this.lastEncouragement = index;
    this.triggerVoiceReminder(pool[index].replace('{name}', name), language === 'fr' ? 'fr-FR' : 'en-US');
  }

  /* -------------------------------- Songs -------------------------------- */

  public get bedtimeLyrics() {
    return BEDTIME_SONG.lyrics;
  }

  /**
   * Plays the original bedtime song: a soft melody with the lyrics spoken
   * phrase by phrase. `onLine` receives the current line index (karaoke),
   * then -1 when the song ends. Returns false when songs are disabled.
   */
  public playBedtimeSong(language: Lang, onLine?: (line: number) => void): boolean {
    if (!this.settings.songs || this.settings.volume <= 0) return false;
    this.stopSong();
    const beat = 60 / BEDTIME_SONG.bpm;
    let offset = 0.2;

    // Each phrase is scheduled when it starts, so stopSong() silences the rest immediately
    BEDTIME_SONG.phrases.forEach((phrase, line) => {
      const phraseStart = offset;
      this.songTimers.push(
        setTimeout(() => {
          onLine?.(line);
          this.triggerVoiceReminder(BEDTIME_SONG.lyrics[language][line], language === 'fr' ? 'fr-FR' : 'en-US', {
            force: true,
            queue: true,
          });
          let noteOffset = 0;
          for (const [freq, beats] of phrase) {
            // Melody + soft octave-below accompaniment
            this.playTone(freq, beats * beat * 0.95, 'sine', noteOffset, { gain: 0.12, force: true });
            this.playTone(freq / 2, beats * beat * 0.95, 'triangle', noteOffset, { gain: 0.05, force: true });
            noteOffset += beats * beat;
          }
        }, phraseStart * 1000)
      );
      offset += phrase.reduce((sum, [, beats]) => sum + beats * beat, 0) + beat; // + breath
    });

    this.songTimers.push(setTimeout(() => {
      this.songTimers = [];
      onLine?.(-1);
    }, offset * 1000));
    return true;
  }

  public stopSong() {
    const wasPlaying = this.songTimers.length > 0;
    this.songTimers.forEach(clearTimeout);
    this.songTimers = [];
    if (wasPlaying) this.cancelSpeech();
  }
}

export const reminderService = new ReminderService();
