import React, { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { ChildProfile, RoutineSession, RoutineTask, TaskDefinition, CATEGORY_ICONS, TaskCategory, TaskStatus } from '../../domain/models';
import { getRoutinePhases, getCurrentPhaseIndex, moveTask, skipPhase, unskipPhase, withCompletion } from '../../domain/routine';
import { PinModal } from '../parent-mode/PinModal';
import { translate, translateDynamic, Language } from '../../i18n/dictionary';
import { BoardColumn } from './BoardColumn';
import { TaskCard } from './TaskCard';
import { ProgressBar } from './ProgressBar';
import { reminderService } from '../../services/ReminderService';
import { PiggyBank } from '../rewards/PiggyBank';
import { ShopItem } from '../../domain/models';
import { unspentBadges } from '../../domain/rewards';
import { fireConfetti, richMotion } from '../../services/effects';
import { ArrowLeft, Settings, RotateCcw } from 'lucide-react';
import { childTheme } from '../../ui/theme';
import { CONFETTI_Z } from '../../ui/layers';
import { useConfirmTap } from '../../ui/useConfirmTap';
import { CardColor } from '../../domain/models';
import { CardOutcome, tonightCardState } from '../../domain/cards';
import { CardBanner } from '../cards/CardBanner';
import { CardGiver } from '../cards/CardGiver';
import { CardReveal } from '../cards/CardReveal';
import { PhaseIndicator } from './PhaseIndicator';
import { StarMeter } from './StarMeter';

interface RoutineBoardProps {
  profile: ChildProfile;
  session: RoutineSession;
  tasksDefinitions: TaskDefinition[];
  language: Language;
  onBack: () => void;
  onUpdateSession: (updatedSession: RoutineSession) => void;
  onEnterParentMode: () => void;
  onRoutineComplete: () => void;
  onResetSession: () => void;
  starsPerMedal: number;
  shop: ShopItem[];
  parentPin: string;
  onBuyShopItem: (itemId: string) => Promise<void>;
  /** Definition ids of this child's tasks that are past their due time */
  lateDefinitionIds?: Set<string>;
  /** A parent gives a yellow / red card (after PIN check) */
  onGiveCard: (color: CardColor, reason?: string) => Promise<{ outcome: CardOutcome; lostProgress: number } | undefined>;
}

/** Tap-to-progress order */
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { todo: 'doing', doing: 'done', done: 'todo' };

/* A star flying from the "done" column to the star meter */
const FlyingStar: React.FC<{ from: DOMRect; to: DOMRect; onDone: () => void }> = ({ from, to, onDone }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== 'function') {
      onDone();
      return;
    }
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 3);
    const animation = el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(1.8)', opacity: 1, offset: 0.2 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.8) rotate(360deg)`, opacity: 1 },
      ],
      { duration: 900, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' }
    );
    animation.onfinish = onDone;
    return () => animation.cancel();
  }, [from, to, onDone]);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="fixed z-flying text-4xl pointer-events-none drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]"
      style={{ left: from.left + from.width / 2, top: from.top + from.height / 3 }}
    >
      ⭐
    </span>
  );
};

export const RoutineBoard: React.FC<RoutineBoardProps> = ({
  profile,
  session,
  tasksDefinitions,
  language,
  onBack,
  onUpdateSession,
  onEnterParentMode,
  onRoutineComplete,
  onResetSession,
  starsPerMedal,
  shop,
  parentPin,
  onBuyShopItem,
  lateDefinitionIds,
  onGiveCard,
}) => {
  // Resetting takes a second tap
  const { armed: confirmReset, tap: handleResetClick } = useConfirmTap(onResetSession);

  // Set up dnd-kit touch-friendly sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 12, // 12px drag distance threshold to distinguish clicks/taps
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 150ms delay for touch devices to allow smooth scrolling
        tolerance: 10,
      },
    })
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Burst + cheer on the card that was just completed
  const [celebration, setCelebration] = useState<{ taskId: string; cheer: string; key: number } | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
  }, []);
  const [showPiggy, setShowPiggy] = useState(false);
  const [showCardGiver, setShowCardGiver] = useState(false);
  // A parent skips the current step, or resumes a skipped one (PIN)
  const [phaseAction, setPhaseAction] = useState<{ kind: 'skip' | 'resume'; category: TaskCategory } | null>(null);
  const [cardReveal, setCardReveal] = useState<{ outcome: CardOutcome; lostProgress: number; reason?: string } | null>(null);
  const tonightCards = tonightCardState(profile, session.date);
  // Every time the board opens with a card tonight, the card is shown again first
  const [cardReminder, setCardReminder] = useState(() => tonightCards.level !== 'none');

  const handleGiveCard = async (color: CardColor, reason?: string) => {
    setShowCardGiver(false);
    const result = await onGiveCard(color, reason);
    if (result) setCardReveal({ ...result, reason: reason?.trim() || undefined });
  };
  const [flyingStars, setFlyingStars] = useState<{ key: number; from: DOMRect; to: DOMRect }[]>([]);
  const [nearMedalHint, setNearMedalHint] = useState(false);
  const starMeterRef = useRef<HTMLDivElement>(null);
  const removeFlyingStar = React.useCallback((key: number) => {
    setFlyingStars((stars) => stars.filter((s) => s.key !== key));
    reminderService.playStarSound();
  }, []);

  // Short banner shown when a phase is completed
  const [phaseBanner, setPhaseBanner] = useState<TaskCategory | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
  }, []);

  const bgTheme = childTheme(profile.color).board;

  // Split the routine into phases; only the current phase is shown on the board
  const phases = getRoutinePhases(session, tasksDefinitions);
  const currentPhaseIndex = getCurrentPhaseIndex(phases);
  const currentPhase = currentPhaseIndex >= 0 ? phases[currentPhaseIndex] : null;
  const visibleTasks = currentPhase ? currentPhase.tasks : session.tasks;
  const isBedtime = currentPhase?.category === 'bedtime';

  // Filter tasks into their respective columns
  const todoTasks = visibleTasks.filter((t) => t.status === 'todo');
  const doingTasks = visibleTasks.filter((t) => t.status === 'doing');
  const doneTasks = visibleTasks.filter((t) => t.status === 'done');

  // Find task definition by definition ID
  const getDefinition = (defId: string) => {
    return tasksDefinitions.find((d) => d.id === defId)!;
  };

  // One path for taps and drags: sound by destination, then the domain move
  const moveTo = (task: RoutineTask, status: TaskStatus) => {
    if (task.status === status) return;
    if (status === 'done') reminderService.playTaskDoneSound();
    else if (status === 'doing') reminderService.playMoveSound();
    else reminderService.playResetSound();
    triggerSessionUpdate(moveTask(session, task.id, status, tasksDefinitions).tasks);
  };

  // Tap-to-progress: todo → doing → done → todo
  const handleTaskTap = (task: RoutineTask) => moveTo(task, NEXT_STATUS[task.status]);

  // Drag-and-drop
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;
    const task = session.tasks.find((t) => t.id === active.id);
    if (task) moveTo(task, over.id as TaskStatus);
  };

  const applyPhaseAction = (action: { kind: 'skip' | 'resume'; category: TaskCategory }) => {
    const changed =
      action.kind === 'skip'
        ? skipPhase(session, action.category, tasksDefinitions)
        : unskipPhase(session, action.category, tasksDefinitions);
    triggerSessionUpdate(changed.tasks, changed);
  };

  // Utility to dispatch session updates and verify completeness
  const triggerSessionUpdate = (updatedTasks: RoutineTask[], base: RoutineSession = session) => {
    const wasCompleted = session.isCompleted;
    const updatedSession = withCompletion({ ...base, tasks: updatedTasks }, tasksDefinitions);
    const isCompleted = updatedSession.isCompleted;

    onUpdateSession(updatedSession);

    // Celebrate the task that was just moved to "done"
    const newlyDone = updatedTasks.find(
      (t) => t.status === 'done' && session.tasks.find((old) => old.id === t.id)?.status !== 'done'
    );
    if (newlyDone) {
      const cheer = translateDynamic(`cheer.${1 + Math.floor(Math.random() * 6)}`, language);
      setCelebration({ taskId: newlyDone.id, cheer, key: Date.now() });
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
      celebrationTimer.current = setTimeout(() => setCelebration(null), 1300);
      fireConfetti({
        particleCount: 30,
        spread: 70,
        startVelocity: 28,
        ticks: 60,
        origin: { x: 0.83, y: 0.4 },
        zIndex: CONFETTI_Z.board,
      });

      // A star is earned only the first time the task is done today
      if (!newlyDone.rewarded) {
        const from = document.querySelector('[data-column="done"]')?.getBoundingClientRect();
        const to = starMeterRef.current?.getBoundingClientRect();
        if (from && to && richMotion()) {
          setFlyingStars((stars) => [...stars, { key: Date.now(), from, to }]);
        } else {
          reminderService.playStarSound();
        }

        const progress = (profile.starProgress ?? 0) + 1;
        const oneLeft = starsPerMedal > 1 && progress === starsPerMedal - 1;
        setNearMedalHint(oneLeft);
        if (oneLeft) {
          reminderService.triggerVoiceReminder(
            translate('board.one_star_left', language),
            language === 'fr' ? 'fr-FR' : 'en-US'
          );
        } else if (progress < starsPerMedal && !isCompleted) {
          reminderService.encourage(profile.name, language);
        }
      }
    }

    // A phase was just completed but the routine goes on: celebrate and announce the next phase
    const updatedPhases = getRoutinePhases(updatedSession, tasksDefinitions);
    const justCompletedPhase = !isCompleted
      ? phases.find((p, i) => !p.isCompleted && updatedPhases[i]?.category === p.category && updatedPhases[i].isCompleted)
      : undefined;
    if (justCompletedPhase) {
      const upcoming = updatedPhases[getCurrentPhaseIndex(updatedPhases)];
      reminderService.playPhaseCompleteSound();
      const nextLabel = translate(`category.${upcoming.category}`, language);
      reminderService.triggerVoiceReminder(
        translate('board.next_phase_spoken', language, { name: profile.name, phase: nextLabel }),
        language === 'fr' ? 'fr-FR' : 'en-US'
      );
      setPhaseBanner(justCompletedPhase.category);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(() => setPhaseBanner(null), 2500);
    }

    // If session transitions from incomplete to complete, celebrate!
    if (isCompleted && !wasCompleted) {
      reminderService.playRoutineSuccessSound();
      
      // Localized voice praise; "good night" only when the day ends with bedtime
      const endsWithBedtime = phases[phases.length - 1]?.category === 'bedtime';
      const speechMsg = translate(endsWithBedtime ? 'board.day_done_spoken_night' : 'board.day_done_spoken', language, {
        name: profile.name,
      });
      reminderService.triggerVoiceReminder(speechMsg, language === 'fr' ? 'fr-FR' : 'en-US');

      // Trigger celebration view
      onRoutineComplete();
    }
  };

  // Calculate overall routine progress percentage (all phases)
  const totalCount = session.tasks.length;
  const doneCount = session.tasks.filter((t) => t.status === 'done').length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Active draggable element for the overlay
  const activeDragTask = session.tasks.find((t) => t.id === activeDragId);
  const activeDragDef = activeDragTask ? getDefinition(activeDragTask.definitionId) : null;

  const isDragging = activeDragId !== null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={`w-full h-[100dvh] flex flex-col justify-between ${bgTheme} overflow-hidden relative select-none`}>
        {/* Night sky overlay during the bedtime phase */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 bedtime-sky ${isBedtime ? 'opacity-100' : 'opacity-0'}`}
        />

        {showCardGiver && (
          <CardGiver
            profile={profile}
            tonight={tonightCards}
            parentPin={parentPin}
            language={language}
            onGive={handleGiveCard}
            onClose={() => setShowCardGiver(false)}
          />
        )}

        {/* Colored frame around the whole board while the child has a card tonight */}
        {tonightCards.level !== 'none' && (
          <div
            aria-hidden="true"
            data-testid="card-frame"
            data-level={tonightCards.level}
            className={`absolute inset-0 z-20 pointer-events-none animate-card-frame card-frame-${tonightCards.level}`}
          />
        )}

        {cardReminder && !cardReveal && tonightCards.level !== 'none' && (
          <CardReveal
            mode="reminder"
            profile={profile}
            outcome={tonightCards.level === 'red' ? 'red' : 'yellow'}
            reason={tonightCards.lastReason}
            lostProgress={tonightCards.lostProgress}
            language={language}
            onDismiss={() => setCardReminder(false)}
          />
        )}

        {cardReveal && (
          <CardReveal
            profile={profile}
            outcome={cardReveal.outcome}
            reason={cardReveal.reason}
            lostProgress={cardReveal.lostProgress}
            language={language}
            onDismiss={() => setCardReveal(null)}
          />
        )}

        {showPiggy && (
          <PiggyBank
            profile={profile}
            shop={shop}
            parentPin={parentPin}
            language={language}
            onBuy={onBuyShopItem}
            onClose={() => setShowPiggy(false)}
          />
        )}

        {phaseAction && (
          <PinModal
            correctPin={parentPin}
            language={language}
            title={translate(phaseAction.kind === 'skip' ? 'board.skip_title' : 'board.resume_title', language, {
              phase: translate(`category.${phaseAction.category}`, language),
            })}
            instruction={translate('board.skip_instruction', language)}
            onClose={() => setPhaseAction(null)}
            onSuccess={() => {
              applyPhaseAction(phaseAction);
              setPhaseAction(null);
            }}
          />
        )}

        {flyingStars.map((star) => (
          <FlyingStar key={star.key} from={star.from} to={star.to} onDone={() => removeFlyingStar(star.key)} />
        ))}

        {/* Phase completed banner */}
        {phaseBanner && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none" role="status" data-testid="phase-banner">
            <div className="glass-panel px-8 py-6 flex flex-col items-center gap-2 animate-bounce border-yellow-400/40">
              <span className="text-6xl">{CATEGORY_ICONS[phaseBanner]}</span>
              <span className="text-2xl font-black text-yellow-300">
                {translate('board.phase_done', language)}
              </span>
            </div>
          </div>
        )}

        <div className="w-full max-w-6xl mx-auto flex flex-col justify-between h-full p-2 sm:p-4 gap-1 sm:gap-2 relative">
        
        {/* Top Header Bar */}
        <header className="flex items-center justify-between gap-1.5 sm:gap-3 z-10">
          <button
            onClick={onBack}
            aria-label={`${translate('btn.back', language)} — ${profile.name}`}
            className="shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-full text-white/80 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-extrabold text-sm md:text-base">
              {profile.avatar}<span className="hidden sm:inline"> {profile.name}</span>
            </span>
          </button>

          <div className="flex flex-col items-center gap-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
              <StarMeter
                ref={starMeterRef}
                starProgress={profile.starProgress ?? 0}
                starsPerMedal={starsPerMedal}
                medalCount={profile.medalCount ?? 0}
                redCard={tonightCards.level === 'red'}
                language={language}
              />

              {/* Piggy bank */}
              <button
                onClick={() => setShowPiggy(true)}
                aria-label={translate('piggy.title', language)}
                className="flex items-center gap-1.5 sm:gap-2 bg-pink-500/15 hover:bg-pink-500/25 text-pink-200 border border-pink-400/30 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-black text-sm sm:text-base md:text-lg transition-all active:scale-95"
              >
                <span key={unspentBadges(profile).length} className="animate-wiggle inline-block">🐷</span>
                <span data-testid="piggy-header-count">{unspentBadges(profile).length}</span>
              </button>
            </div>
            {tonightCards.level === 'red' ? (
              <span data-testid="card-reset-hint" className="text-xs md:text-sm font-black text-red-300">
                🟥 {translate('cards.reset_short', language)}
                {tonightCards.lostProgress > 0 && ` (−${tonightCards.lostProgress} ⭐)`}
              </span>
            ) : (
              nearMedalHint && (
                <span className="text-xs md:text-sm font-bold text-yellow-200 animate-fade-up [animation-delay:0s]">
                  {translate('stars.one_left', language)}
                </span>
              )
            )}
          </div>

          <div className="shrink-0 flex items-center gap-1.5 sm:gap-3">
            {/* Tonight's cards; tapping lets a parent give one (PIN required) */}
            <button
              onClick={() => setShowCardGiver(true)}
              aria-label={translate('cards.give', language)}
              title={translate('cards.tonight', language)}
              data-testid="give-card"
              data-yellow={tonightCards.yellow}
              data-red={tonightCards.red}
              className="flex items-center gap-1 px-2.5 py-2 sm:py-2.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-full transition-all active:scale-95"
            >
              <span className={`w-3 h-4 sm:w-3.5 sm:h-5 rounded-[3px] ${tonightCards.yellow > 0 ? 'bg-yellow-400 shadow shadow-yellow-500/50' : 'border border-yellow-300/40'}`} />
              {tonightCards.yellow > 1 && <span className="text-[10px] font-black text-yellow-300">×{tonightCards.yellow}</span>}
              <span className={`w-3 h-4 sm:w-3.5 sm:h-5 rounded-[3px] ${tonightCards.red > 0 ? 'bg-red-500 shadow shadow-red-500/50' : 'border border-red-400/40'}`} />
            </button>
            <button
              onClick={handleResetClick}
              aria-label={translate('board.reset', language)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-full transition-all duration-300 active:scale-95 text-xs font-bold ${
                confirmReset
                  ? 'bg-amber-600/30 border-amber-500/50 text-amber-200 hover:bg-amber-600/40 animate-pulse'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white/95 hover:bg-white/15'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              {confirmReset && (
                <span>{translate('board.reset_confirm', language)}</span>
              )}
            </button>

            <button
              onClick={onEnterParentMode}
              aria-label={translate('btn.parent_mode', language)}
              className="p-2 sm:p-3 bg-white/5 hover:bg-white/15 text-white/60 hover:text-white/95 border border-white/10 rounded-full transition-all active:scale-95"
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </header>

        {/* Current phase indicator */}
        {currentPhase && phases.length > 1 && (
          <PhaseIndicator
            phases={phases}
            currentIndex={currentPhaseIndex}
            language={language}
            onSkip={(category) => setPhaseAction({ kind: 'skip', category })}
            onResume={(category) => setPhaseAction({ kind: 'resume', category })}
          />
        )}

        <CardBanner
          state={tonightCards}
          language={language}
          onOpen={() => setCardReminder(true)}
        />

        {/* Phones: one scrolling column, "doing" first. Tablets and up: three columns side by side */}
        <main className="flex-1 min-h-0 my-1 sm:my-4 flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 overflow-y-auto sm:overflow-y-hidden overflow-x-hidden sm:justify-center items-stretch py-1 sm:py-2 scrollbar-thin">
          <BoardColumn
            id="todo"
            title={translate('col.todo', language)}
            icon="💤"
            colorTheme="yellow"
            count={todoTasks.length}
            isDragging={isDragging}
            emptyHint="✨"
          >
            {todoTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                definition={getDefinition(t.definitionId)}
                language={language}
                onTap={handleTaskTap}
                celebration={celebration?.taskId === t.id ? celebration : undefined}
                isLate={lateDefinitionIds?.has(t.definitionId)}
              />
            ))}
          </BoardColumn>

          <BoardColumn
            id="doing"
            title={translate('col.doing', language)}
            icon="☀️"
            colorTheme="orange"
            count={doingTasks.length}
            isDragging={isDragging}
            className="order-first sm:order-none"
            emptyHint={`👆 ${translate('board.tap_hint', language)}`}
          >
            {doingTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                definition={getDefinition(t.definitionId)}
                language={language}
                onTap={handleTaskTap}
                celebration={celebration?.taskId === t.id ? celebration : undefined}
                isLate={lateDefinitionIds?.has(t.definitionId)}
              />
            ))}
          </BoardColumn>

          <BoardColumn
            id="done"
            title={translate('col.done', language)}
            icon="🌟"
            colorTheme="emerald"
            count={doneTasks.length}
            isDragging={isDragging}
            emptyHint="✨"
          >
            {doneTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                definition={getDefinition(t.definitionId)}
                language={language}
                onTap={handleTaskTap}
                celebration={celebration?.taskId === t.id ? celebration : undefined}
                isLate={lateDefinitionIds?.has(t.definitionId)}
              />
            ))}
          </BoardColumn>
        </main>

        {/* Bottom Progress Bar */}
        <footer className="w-full max-w-4xl mx-auto px-1 sm:px-4 pb-1 sm:pb-2 z-10">
          <ProgressBar
            progress={progressPct}
            avatar={profile.avatar}
            colorTheme={profile.color}
            label={translate('board.progress', language)}
          />
        </footer>

        {/* Drag Overlay for visual feedback during drags */}
        <DragOverlay dropAnimation={null}>
          {activeDragTask && activeDragDef ? (
            <div className="opacity-90 scale-105 rotate-2 shadow-2xl">
              <TaskCard
                task={activeDragTask}
                definition={activeDragDef}
                language={language}
                onTap={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </div>
  </DndContext>
);
};
