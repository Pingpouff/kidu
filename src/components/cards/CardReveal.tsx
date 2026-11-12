import React, { useEffect, useState } from 'react';
import { ChildProfile } from '../../domain/models';
import { CardOutcome } from '../../domain/cards';
import { translate, Language } from '../../i18n/dictionary';
import { reminderService } from '../../services/ReminderService';
import { richMotion } from '../../services/effects';
import { Overlay } from '../../ui/Overlay';
import { cx } from '../../ui/cx';
import { useAutoDismiss } from '../../ui/useAutoDismiss';

interface CardRevealProps {
  profile: ChildProfile;
  outcome: CardOutcome;
  reason?: string;
  lostProgress: number;
  language: Language;
  onDismiss: () => void;
  /** `given`: the card was just given (whistle). `reminder`: a quiet reminder of tonight's card that closes by itself. */
  mode?: 'given' | 'reminder';
}

const REMINDER_MS = 5000;

/**
 * The referee moment: the card is raised in front of the child, with a whistle
 * and a spoken sentence. A second yellow shows the yellow, then the red.
 * A green card is a "well done": a star sound instead of the whistle.
 */
export const CardReveal: React.FC<CardRevealProps> = ({ profile, outcome, reason, lostProgress, language, onDismiss, mode = 'given' }) => {
  const isReminder = mode === 'reminder';
  // For a second yellow just given, start on the yellow card and switch to red
  const [showRed, setShowRed] = useState(outcome === 'red' || (isReminder && outcome === 'second_yellow'));

  useEffect(() => {
    const lang = language === 'fr' ? 'fr-FR' : 'en-US';
    if (outcome === 'green') {
      reminderService.playStarSound();
      const spoken = reason
        ? translate('cards.spoken_green_reason', language, { name: profile.name, reason })
        : translate('cards.spoken_green', language, { name: profile.name });
      reminderService.triggerVoiceReminder(spoken, lang);
      return;
    }
    const red = outcome !== 'yellow';
    if (isReminder) {
      // Quiet: no whistle, a short spoken reminder, then it closes by itself
      const key = red ? 'cards.spoken_reminder_red' : 'cards.spoken_reminder_yellow';
      reminderService.triggerVoiceReminder(translate(key, language).replace('{name}', profile.name), lang);
      return; // closes by itself (useAutoDismiss below)
    }
    const key = outcome === 'yellow' ? 'cards.spoken_yellow' : outcome === 'red' ? 'cards.spoken_red' : 'cards.spoken_second';
    reminderService.playWhistleSound(outcome === 'yellow' ? 1 : 2);
    reminderService.triggerVoiceReminder(translate(key, language).replace('{name}', profile.name), lang);
    if (outcome !== 'second_yellow') return;
    const timer = setTimeout(() => setShowRed(true), richMotion() ? 1300 : 0);
    return () => clearTimeout(timer);
    // The reason is only read for a green card, when the card is given
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, profile.name, language, isReminder]);

  // The reminder closes by itself after a few seconds, but not while pressed
  const auto = useAutoDismiss(isReminder ? REMINDER_MS : null, onDismiss, { fullScreen: true });

  const isGreen = outcome === 'green';
  const isRed = showRed;
  const color = isGreen ? 'green' : isRed ? 'red' : 'yellow';
  const title = isGreen
    ? translate('cards.green_title', language)
    : isReminder
    ? translate(isRed ? 'cards.reminder_title_red' : 'cards.reminder_title_yellow', language)
    : outcome === 'second_yellow' && isRed
      ? translate('cards.second_yellow', language)
      : translate(isRed ? 'cards.red' : 'cards.yellow', language);

  return (
    <Overlay
      layer="reveal"
      onClick={onDismiss}
      onClose={onDismiss}
      {...auto.handlers}
      aria-label={title}
      data-testid="card-reveal"
      data-card={color}
      data-mode={mode}
      className={cx(
        'flex flex-col items-center justify-center gap-6 p-6 text-center cursor-pointer select-none backdrop-blur-sm transition-colors duration-500',
        { green: 'bg-emerald-950/90', red: 'bg-red-950/90', yellow: 'bg-yellow-950/85' }[color]
      )}
    >
      <p className="text-lg sm:text-xl font-bold text-white/70">
        {profile.avatar} {profile.name}
      </p>
      <div key={color} className={cx('referee-card animate-card-raise', `is-${color}`)} aria-hidden="true" />
      <h2 className={cx('text-3xl sm:text-5xl font-black', { green: 'text-emerald-200', red: 'text-red-200', yellow: 'text-yellow-200' }[color])}>{title}</h2>
      {reason && <p className="text-lg sm:text-xl font-bold text-white/80">« {reason} »</p>}
      <p className="text-base sm:text-lg font-semibold text-white/70 max-w-md">
        {isGreen
          ? `${translate('cards.green_bravo', language)} ⭐`
          : isRed
          ? `${translate('cards.lost_progress', language)}${lostProgress > 0 ? ` (−${lostProgress} ⭐)` : ''}. ${translate('cards.kept', language)}`
          : translate('cards.warning', language)}
      </p>
      <p className="mt-2 text-white/40 text-sm font-bold uppercase tracking-wide">{translate('rewards.tap_continue', language)}</p>
    </Overlay>
  );
};
