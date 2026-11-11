import React from 'react';
import { Heart, Volume2 } from 'lucide-react';
import { cx } from '../../../ui/cx';
import { translate, translateDynamic, Language } from '../../../i18n/dictionary';
import type { SuggestedStrategy } from '../domain/checkin';

interface StrategyCardProps {
  strategy: SuggestedStrategy;
  language: Language;
  /** In the child's toolbox ("ça m'aide") */
  helpful: boolean;
  /** Chosen during this check-in */
  active?: boolean;
  /** Reads the instruction aloud (and records the strategy as tried) */
  onTry: () => void;
  onToggleHelpful: () => void;
}

const strategyLabel = (s: SuggestedStrategy, language: Language) =>
  s.kind === 'custom' ? s.label : translateDynamic(`emo.strategy.${s.id}`, language);

/** A strategy: tap to hear what to do; the heart puts it in "what helps me". */
export const StrategyCard: React.FC<StrategyCardProps> = ({ strategy, language, helpful, active = false, onTry, onToggleHelpful }) => {
  const label = strategyLabel(strategy, language);
  return (
    <div
      className={cx(
        'flex items-stretch rounded-3xl border transition-colors',
        active ? 'bg-white/15 border-[#9EE6D8]' : 'bg-white/5 border-white/15'
      )}
      data-testid={`strategy-${strategy.id}`}
    >
      <button
        type="button"
        onClick={onTry}
        aria-label={translate('emo.toolbox.listen', language, { label })}
        className="flex-1 min-h-[72px] flex items-center gap-3 px-4 py-3 text-left rounded-l-3xl hover:bg-white/5"
      >
        <span className="text-3xl shrink-0" aria-hidden="true">{strategy.icon}</span>
        <span className="text-lg font-semibold leading-snug">{label}</span>
        <Volume2 className="w-5 h-5 shrink-0 ml-auto text-[#C9C3E6]" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onToggleHelpful}
        aria-pressed={helpful}
        data-testid="strategy-helpful"
        className={cx(
          'shrink-0 w-[5.5rem] flex flex-col items-center justify-center gap-1 rounded-r-3xl border-l border-white/10 text-xs font-bold',
          helpful ? 'text-[#FFB0C0]' : 'text-[#C9C3E6] hover:text-[#F4F1FF]'
        )}
      >
        <Heart className="w-6 h-6" fill={helpful ? 'currentColor' : 'none'} aria-hidden="true" />
        {translate('emo.toolbox.helps', language)}
      </button>
    </div>
  );
};
