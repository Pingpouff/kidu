import React from 'react';
import { translate, Language } from '../../i18n/dictionary';

interface StarMeterProps {
  starProgress: number;
  starsPerMedal: number;
  medalCount: number;
  /** A red card today: a red card sticker on the meter */
  redCard: boolean;
  language: Language;
}

/** Stars collected toward the next medal, then the medal count. Flying stars land on it (ref). */
export const StarMeter = React.forwardRef<HTMLDivElement, StarMeterProps>(function StarMeter(
  { starProgress, starsPerMedal, medalCount, redCard, language },
  ref
) {
  return (
    <div
      ref={ref}
      data-testid="star-meter"
      role="img"
      aria-label={translate('stars.meter_value', language, { stars: starProgress, total: starsPerMedal, medals: medalCount })}
      title={translate('stars.meter', language)}
      className="relative flex items-center gap-1 sm:gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-500/30 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-black text-sm sm:text-base md:text-lg"
    >
      {redCard && (
        <span
          data-testid="star-meter-card"
          aria-hidden="true"
          className="referee-card size-sm is-red absolute -bottom-2 -right-2 rotate-12 animate-card-sticker ring-1 ring-white/60"
        />
      )}
      {Array.from({ length: starsPerMedal }, (_, i) => (
        <span key={i} aria-hidden="true" className={`transition-all duration-300 ${i < starProgress ? '' : 'grayscale opacity-30'}`}>
          ⭐
        </span>
      ))}
      <span aria-hidden="true" className="hidden sm:inline text-white/50 mx-0.5">
        →
      </span>
      <span aria-hidden="true">🏅</span>
      <span key={medalCount} aria-hidden="true" className="animate-counter-bump inline-block" data-testid="medal-count">
        {medalCount}
      </span>
    </div>
  );
});
