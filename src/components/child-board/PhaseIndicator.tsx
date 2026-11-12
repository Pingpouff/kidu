import React from 'react';
import { CATEGORY_ICONS, TaskCategory } from '../../domain/models';
import { RoutinePhase } from '../../domain/routine';
import { translate, Language } from '../../i18n/dictionary';

interface PhaseIndicatorProps {
  phases: RoutinePhase[];
  currentIndex: number;
  language: Language;
  /** A parent skips the current step (the board asks for the PIN) */
  onSkip: (category: TaskCategory) => void;
  /** A parent resumes a skipped step */
  onResume: (category: TaskCategory) => void;
}

const dotState = (phase: RoutinePhase, isCurrent: boolean) =>
  phase.isSkipped ? 'skipped' : phase.isCompleted ? 'done' : isCurrent ? 'current' : 'todo';

const DOT_LABEL = { skipped: 'board.skipped', done: 'board.step_done', current: 'board.step_current', todo: 'board.step_todo' } as const;

const DOT_CLASS = {
  skipped: 'bg-transparent border border-white/50',
  done: 'bg-emerald-400',
  current: 'bg-yellow-300',
  todo: 'bg-white/20',
} as const;

const chip = 'tap-target min-h-[36px] px-3 py-1 rounded-full border border-white/15 bg-white/5 text-white/80 hover:text-white hover:bg-white/15';

/** "Step 2/4: After school", one dot per step, and the parent's skip / resume buttons. */
export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({ phases, currentIndex, language, onSkip, onResume }) => {
  const current = phases[currentIndex];
  const next = phases[currentIndex + 1];
  const colon = language === 'fr' ? ' : ' : ': ';
  const phaseName = (c: TaskCategory) => translate(`category.${c}`, language);

  return (
    <div className="flex flex-col items-center gap-1.5 z-10" data-testid="phase-indicator">
      <div className="flex items-center gap-2 sm:gap-3 text-white font-black text-base sm:text-lg md:text-2xl">
        <span className="text-2xl sm:text-3xl md:text-4xl" aria-hidden="true">
          {CATEGORY_ICONS[current.category]}
        </span>
        <span>
          {translate('board.step', language)} {currentIndex + 1}/{phases.length}
          {colon}
          {phaseName(current.category)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs md:text-sm text-white/70 font-bold">
        <div className="flex gap-1.5" role="list">
          {phases.map((p, i) => {
            const state = dotState(p, i === currentIndex);
            return (
              <span
                key={p.category}
                role="listitem"
                data-testid="phase-dot"
                data-state={state}
                aria-label={`${phaseName(p.category)}${colon}${translate(DOT_LABEL[state], language)}`}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${DOT_CLASS[state]}`}
              />
            );
          })}
        </div>
        <span>
          {next
            ? `${translate('board.next', language)}${colon}${phaseName(next.category)} ${CATEGORY_ICONS[next.category]}`
            : translate('board.last_step', language)}
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm font-bold">
        {!current.isCompleted && !current.isSkipped && (
          <button type="button" data-testid="skip-phase" onClick={() => onSkip(current.category)} className={chip}>
            ⏭ {translate('board.skip_phase', language)}
          </button>
        )}
        {phases
          .filter((p) => p.isSkipped)
          .map((p) => (
            <button key={p.category} type="button" data-testid="resume-phase" onClick={() => onResume(p.category)} className={chip}>
              ↺ {translate('board.resume_phase', language, { phase: phaseName(p.category) })}
            </button>
          ))}
      </div>
    </div>
  );
};
