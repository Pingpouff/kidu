/**
 * ReminderService
 * 
 * Handles kid-friendly auditory feedback (synthesized chimes via Web Audio API)
 * and abstracts notifications/reminders.
 * 
 * Offline-first: Synthetic sounds do not require network calls.
 * Voice-ready: Prepares functions for future voice triggers (Alexa, Home Assistant).
 */

class ReminderService {
  private ctx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      // Create context on demand (since browsers require user interaction)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', delay: number = 0) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Resume context if suspended (common browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    // Smooth ramp-in
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.02);
    // Smooth decay
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }

  /**
   * Sound played when dragging or clicking a task to progress.
   */
  public playMoveSound() {
    this.playTone(330, 0.15, 'triangle'); // E4
    this.playTone(440, 0.15, 'triangle', 0.05); // A4
  }

  /**
   * Sound played when a single task enters "Done" column.
   */
  public playTaskDoneSound() {
    this.playTone(523.25, 0.25, 'sine'); // C5
    this.playTone(659.25, 0.25, 'sine', 0.08); // E5
    this.playTone(783.99, 0.35, 'sine', 0.16); // G5
  }

  /**
   * Sound played when the entire routine session is completed.
   */
  public playRoutineSuccessSound() {
    const tempo = 0.12;
    // Energetic arpeggio (C Major)
    this.playTone(261.63, 0.4, 'sine', 0); // C4
    this.playTone(329.63, 0.4, 'sine', tempo); // E4
    this.playTone(392.00, 0.4, 'sine', tempo * 2); // G4
    this.playTone(523.25, 0.5, 'sine', tempo * 3); // C5
    
    // Additional harmonized sparkles
    this.playTone(659.25, 0.6, 'triangle', tempo * 4); // E5
    this.playTone(783.99, 0.6, 'triangle', tempo * 5); // G5
    this.playTone(1046.50, 0.8, 'sine', tempo * 6); // C6 (high finish)
  }

  /**
   * Sound played when parent resets the session.
   */
  public playResetSound() {
    this.playTone(440, 0.3, 'sine'); // A4
    this.playTone(330, 0.4, 'sine', 0.1); // E4
  }

  /**
   * Triggers a voice message or reminder.
   * Currently, uses the browser's speech synthesis engine as a local fallback.
   * Future roadmap: Webhook call to Alexa/Echo Routine or Home Assistant.
   */
  public triggerVoiceReminder(message: string, lang: 'fr-FR' | 'en-US' = 'fr-FR') {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn("Speech synthesis not supported in this browser.");
      return;
    }

    try {
      // Cancel active speech to avoid queuing delays
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = lang;
      utterance.rate = 0.9; // Slightly slower for children
      utterance.pitch = 1.15; // Soft high pitch

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Speech synthesis error:", err);
    }
  }

  /**
   * Alexa/Echo routine trigger integration interface.
   * This is a boilerplate/stub explaining the future network call.
   */
  public async triggerAlexaRoutine(webhookUrl: string, payload: object): Promise<boolean> {
    console.log("Future Alexa trigger webhook call will post to:", webhookUrl, payload);
    // In production, this would make a POST request to a Home Assistant instance or Alexa Developer skill webhook.
    // fetch(webhookUrl, { method: 'POST', body: JSON.stringify(payload) })
    return true;
  }
}

export const reminderService = new ReminderService();
