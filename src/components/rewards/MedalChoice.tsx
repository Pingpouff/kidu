import React, { useEffect, useState } from 'react';
import { getBadge, getUniverse } from '../../domain/badges';
import { translate, Language } from '../../i18n/dictionary';
import { reminderService } from '../../services/ReminderService';
import { fireConfetti, richMotion } from '../../services/effects';
import { CONFETTI_Z } from '../../ui/layers';
import { Overlay } from '../../ui/Overlay';
import { MedalDisc } from './MedalDisc';

interface MedalChoiceProps {
  childName: string;
  offer: string[]; // 3 motifs (badge ids in the data)
  pendingCount: number; // offers waiting, including this one
  language: Language;
  onChoose: (badgeId: string) => Promise<void>;
}

/**
 * A new medal: 3 stars became a medal, the child picks its motif out of
 * three; it goes to the piggy bank. This screen is the medal's reveal (one
 * thing won, not a medal then a badge).
 */
export const MedalChoice: React.FC<MedalChoiceProps> = ({
  childName,
  offer,
  pendingCount,
  language,
  onChoose,
}) => {
  const [chosen, setChosen] = useState<string | null>(null);
  const offerKey = offer.join('|');

  useEffect(() => {
    setChosen(null);
    reminderService.playMedalSound();
    fireConfetti({ particleCount: 90, spread: 100, origin: { x: 0.5, y: 0.35 }, zIndex: CONFETTI_Z.overlay });
    reminderService.triggerVoiceReminder(
      translate('badge.choose_spoken', language, { name: childName }),
      language === 'fr' ? 'fr-FR' : 'en-US'
    );
  }, [offerKey, childName, language]);

  const handleChoose = (badgeId: string) => {
    if (chosen) return;
    setChosen(badgeId);
    reminderService.playPiggyBankSound();
    const badge = getBadge(badgeId);
    if (badge) {
      reminderService.triggerVoiceReminder(
        translate('badge.chosen_spoken', language, { badge: badge.name[language] }),
        language === 'fr' ? 'fr-FR' : 'en-US'
      );
    }
    fireConfetti({ particleCount: 50, spread: 70, origin: { x: 0.5, y: 0.5 }, zIndex: CONFETTI_Z.overlay });
    // Let the "fly to the piggy bank" animation play before saving
    setTimeout(() => onChoose(badgeId), richMotion() ? 900 : 200);
  };

  return (
    <Overlay
      layer="choice"
      aria-label={translate('badges.choose', language)}
      data-testid="medal-choice"
      className="flex flex-col items-center justify-center gap-8 bg-slate-950/90 backdrop-blur-sm select-none p-6"
    >
      <div className="text-center flex flex-col gap-2">
        <p className="text-3xl md:text-5xl font-black text-yellow-300 drop-shadow">
          🏅 {translate('badges.choose', language)}
        </p>
        <p className="text-lg md:text-2xl font-extrabold text-white">{translate('medal.subtitle', language)}</p>
        <p className="text-base md:text-lg text-white/60 font-semibold">
          {translate('badges.choose_hint', language)}
          {pendingCount > 1 && ` (${pendingCount} ${translate('badges.waiting', language)})`}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 md:gap-8">
        {offer.map((badgeId, i) => {
          const badge = getBadge(badgeId);
          if (!badge) return null;
          const universe = getUniverse(badge.universe);
          const isChosen = chosen === badgeId;
          return (
            <button
              key={badgeId}
              onClick={() => handleChoose(badgeId)}
              disabled={chosen !== null}
              data-testid="medal-option"
              aria-label={badge.name[language]}
              style={{ animationDelay: `${i * 150}ms` }}
              className={`w-40 md:w-52 p-5 rounded-3xl bg-white/10 border-2 border-white/20 hover:border-yellow-300 hover:bg-white/15 flex flex-col items-center gap-3 transition-all active:scale-95 ${
                isChosen ? 'animate-chosen border-yellow-300' : chosen ? 'opacity-0 transition-opacity duration-300' : 'animate-card-flip-in'
              }`}
            >
              <MedalDisc badgeId={badgeId} size="lg" />
              <span className="text-lg md:text-xl font-black text-white text-center leading-tight">
                {badge.name[language]}
              </span>
              <span className="text-xs font-bold text-white/50 uppercase tracking-wide">
                {universe.icon} {universe.name[language]}
              </span>
            </button>
          );
        })}
      </div>
    </Overlay>
  );
};
