import React, { useEffect, useRef, useState } from 'react';
import { ChildProfile } from '../../domain/models';
import { CardOutcome } from '../../domain/cards';
import { translate, Language } from '../../i18n/dictionary';
import { reminderService } from '../../services/ReminderService';
import { richMotion } from '../../services/effects';
import { Overlay } from '../../ui/Overlay';
import { cx } from '../../ui/cx';

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
 */
export const CardReveal: React.FC<CardRevealProps> = ({ profile, outcome, reason, lostProgress, language, onDismiss, mode = 'given' }) => {
  const isReminder = mode === 'reminder';
  // For a second yellow just given, start on the yellow card and switch to red
  const [showRed, setShowRed] = useState(outcome === 'red' || (isReminder && outcome === 'second_yellow'));
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const lang = language === 'fr' ? 'fr-FR' : 'en-US';
    const red = outcome !== 'yellow';
    if (isReminder) {
      // Quiet: no whistle, a short spoken reminder, then it closes by itself
      const key = red ? 'cards.spoken_reminder_red' : 'cards.spoken_reminder_yellow';
      reminderService.triggerVoiceReminder(translate(key, language).replace('{name}', profile.name), lang);
      const timer = setTimeout(() => dismissRef.current(), REMINDER_MS);
      return () => clearTimeout(timer);
    }
    const key = outcome === 'yellow' ? 'cards.spoken_yellow' : outcome === 'red' ? 'cards.spoken_red' : 'cards.spoken_second';
    reminderService.playWhistleSound(outcome === 'yellow' ? 1 : 2);
    reminderService.triggerVoiceReminder(translate(key, language).replace('{name}', profile.name), lang);
    if (outcome !== 'second_yellow') return;
    const timer = setTimeout(() => setShowRed(true), richMotion() ? 1300 : 0);
    return () => clearTimeout(timer);
  }, [outcome, profile.name, language, isReminder]);

  const isRed = showRed;
  const title = isReminder
    ? translate(isRed ? 'cards.reminder_title_red' : 'cards.reminder_title_yellow', language)
    : outcome === 'second_yellow' && isRed
      ? translate('cards.second_yellow', language)
      : translate(isRed ? 'cards.red' : 'cards.yellow', language);

  return (
    <Overlay
      layer="reveal"
      onClick={onDismiss}
      onClose={onDismiss}
      aria-label={title}
      data-testid="card-reveal"
      data-card={isRed ? 'red' : 'yellow'}
      data-mode={mode}
      className={cx(
        'flex flex-col items-center justify-center gap-6 p-6 text-center cursor-pointer select-none backdrop-blur-sm transition-colors duration-500',
        isRed ? 'bg-red-950/90' : 'bg-yellow-950/85'
      )}
    >
      <p className="text-lg sm:text-xl font-bold text-white/70">
        {profile.avatar} {profile.name}
      </p>
      <div key={isRed ? 'red' : 'yellow'} className={cx('referee-card animate-card-raise', isRed ? 'is-red' : 'is-yellow')} aria-hidden="true" />
      <h2 className={cx('text-3xl sm:text-5xl font-black', isRed ? 'text-red-200' : 'text-yellow-200')}>{title}</h2>
      {reason && <p className="text-lg sm:text-xl font-bold text-white/80">« {reason} »</p>}
      <p className="text-base sm:text-lg font-semibold text-white/70 max-w-md">
        {isRed
          ? `${translate('cards.lost_progress', language)}${lostProgress > 0 ? ` (−${lostProgress} ⭐)` : ''}. ${translate('cards.kept', language)}`
          : translate('cards.warning', language)}
      </p>
      <p className="mt-2 text-white/40 text-sm font-bold uppercase tracking-wide">{translate('rewards.tap_continue', language)}</p>
    </Overlay>
  );
};
