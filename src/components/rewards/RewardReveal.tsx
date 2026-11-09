import React, { useEffect } from 'react';
import { translate, Language } from '../../i18n/dictionary';
import { reminderService } from '../../services/ReminderService';
import { fireConfetti } from '../../services/effects';

interface RewardRevealProps {
  icon: string;
  heading: string; // e.g. "New medal!"
  title: string;
  subtitle?: string;
  spoken: string;
  language: Language;
  /** e.g. "1/2" when several rewards are shown in a row */
  position?: string;
  onDismiss: () => void;
}

/**
 * Full-screen reveal of a medal or trophy: spinning gold disc, rays, confetti,
 * fanfare and a spoken announcement (each part follows the parent's settings).
 */
export const RewardReveal: React.FC<RewardRevealProps> = ({
  icon,
  heading,
  title,
  subtitle,
  spoken,
  language,
  position,
  onDismiss,
}) => {
  useEffect(() => {
    reminderService.playMedalSound();
    reminderService.triggerVoiceReminder(spoken, language === 'fr' ? 'fr-FR' : 'en-US');
    fireConfetti({
      particleCount: 80,
      spread: 100,
      startVelocity: 35,
      origin: { x: 0.5, y: 0.45 },
      colors: ['#facc15', '#fde047', '#f59e0b', '#ffffff'],
      zIndex: 120,
    });
  }, [spoken, language]);

  return (
    <div
      onClick={onDismiss}
      role="dialog"
      aria-label={heading}
      data-testid="reward-reveal"
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center gap-6 bg-slate-950/85 backdrop-blur-sm cursor-pointer select-none p-6"
    >
      <p className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-300">
        {heading}
      </p>

      <div className="relative w-56 h-56 md:w-72 md:h-72 flex items-center justify-center">
        <div className="absolute inset-[-30%] medal-rays" aria-hidden="true" />
        <div className="animate-medal-reveal relative w-40 h-40 md:w-52 md:h-52 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 p-2 shadow-2xl shadow-yellow-500/40 ring-4 ring-yellow-200/60">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-500 to-yellow-700 flex items-center justify-center text-7xl md:text-8xl">
            {icon}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center animate-fade-up">
        <h2 className="text-3xl md:text-5xl font-black text-white">{title}</h2>
        {subtitle && (
          <p className="text-base md:text-xl text-white/70 font-semibold max-w-md">{subtitle}</p>
        )}
      </div>

      <p className="mt-4 text-white/40 text-sm md:text-base font-bold uppercase tracking-wide">
        {position ? `${position} · ` : ''}
        {translate('rewards.tap_continue', language)}
      </p>
    </div>
  );
};
