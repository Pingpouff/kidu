import React from 'react';
import { TonightCardState } from '../../domain/cards';
import { translate, Language } from '../../i18n/dictionary';
import { cx } from '../../ui/cx';

/**
 * Banner shown on the child's board all evening after a card: which card,
 * why, and (for a red) that the stars went back to zero. Tapping it shows the
 * card again in big. Green cards get their own pill next to it.
 */
export const CardBanner: React.FC<{ state: TonightCardState; language: Language; onOpen: () => void; onOpenGreen?: () => void }> = ({
  state,
  language,
  onOpen,
  onOpenGreen,
}) => {
  if (state.level === 'none' && state.green === 0) return null;
  const red = state.level === 'red';
  const parts = [
    translate(red ? 'cards.banner_red' : 'cards.banner_yellow', language) + (!red && state.yellow > 1 ? ` ×${state.yellow}` : ''),
    state.lastReason,
    red ? translate('cards.reset_short', language) : undefined,
  ].filter(Boolean);
  const greenText = [
    translate('cards.banner_green', language) + (state.green > 1 ? ` ×${state.green}` : ''),
    state.lastGreenReason,
  ].filter(Boolean);

  return (
    <div className="z-10 mx-auto w-full max-w-xl flex items-center justify-center gap-2 min-w-0">
      {state.green > 0 && (
        <button
          type="button"
          onClick={onOpenGreen}
          data-testid="card-banner-green"
          className={cx(
            'min-w-0 flex items-center gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-black text-sm sm:text-base shadow-lg active:scale-95 transition-transform',
            'bg-emerald-500 text-emerald-950 shadow-emerald-900/40 ring-2 ring-emerald-200/70',
            state.level === 'none' ? 'w-full' : 'shrink'
          )}
        >
          <span className="referee-card size-sm is-green shrink-0 -rotate-12 ring-1 ring-emerald-900/40" aria-hidden="true" />
          <span className="truncate">{greenText.join(' · ')}</span>
        </button>
      )}
      {state.level !== 'none' && (
        <button
          type="button"
          onClick={onOpen}
          data-testid="card-banner"
          data-level={state.level}
          className={cx(
            'flex-1 min-w-0 flex items-center gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-black text-sm sm:text-base shadow-lg active:scale-95 transition-transform',
            red ? 'bg-red-600 text-white shadow-red-900/50 ring-2 ring-red-300/60' : 'bg-yellow-400 text-yellow-950 shadow-yellow-900/40 ring-2 ring-yellow-200/70'
          )}
        >
          <span className={cx('referee-card size-sm shrink-0 rotate-12', red ? 'is-red ring-1 ring-white/70' : 'is-yellow ring-1 ring-yellow-900/40')} aria-hidden="true" />
          <span className="truncate">{parts.join(' · ')}</span>
        </button>
      )}
    </div>
  );
};
