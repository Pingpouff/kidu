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
import { ChildProfile, RoutineSession, RoutineTask, TaskDefinition, CATEGORY_ICONS, TaskCategory } from '../../domain/models';
import { getRoutinePhases, getCurrentPhaseIndex } from '../../domain/routine';
import { translate, Language } from '../../i18n/dictionary';
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
}

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
  const nextPhase = currentPhaseIndex >= 0 ? phases[currentPhaseIndex + 1] : undefined;
  const visibleTasks = currentPhase ? currentPhase.tasks : session.tasks;
  const isBedtime = currentPhase?.category === 'bedtime';
  const colon = language === 'fr' ? ' : ' : ': ';

  // Filter tasks into their respective columns
  const todoTasks = visibleTasks.filter((t) => t.status === 'todo');
  const doingTasks = visibleTasks.filter((t) => t.status === 'doing');
  const doneTasks = visibleTasks.filter((t) => t.status === 'done');

  // Find task definition by definition ID
  const getDefinition = (defId: string) => {
    return tasksDefinitions.find((d) => d.id === defId)!;
  };

  // Tap-to-progress: Moves task sequentially
  const handleTaskTap = (task: RoutineTask) => {
    let nextStatus: 'todo' | 'doing' | 'done';
    if (task.status === 'todo') {
      nextStatus = 'doing';
      reminderService.playMoveSound();
    } else if (task.status === 'doing') {
      nextStatus = 'done';
      reminderService.playTaskDoneSound();
    } else {
      nextStatus = 'todo';
      reminderService.playResetSound();
    }

    const updatedTasks = session.tasks.map((t) => {
      if (t.id === task.id) {
        return {
          ...t,
          status: nextStatus,
          completedAt: nextStatus === 'done' ? Date.now() : undefined,
        };
      }
      return t;
    });

    triggerSessionUpdate(updatedTasks);
  };

  // Drag-and-drop end trigger
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const taskId = active.id as string;
    const targetStatus = over.id as 'todo' | 'doing' | 'done';

    const task = session.tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    // Trigger audio cues based on destination
    if (targetStatus === 'done') {
      reminderService.playTaskDoneSound();
    } else if (targetStatus === 'doing') {
      reminderService.playMoveSound();
    } else {
      reminderService.playResetSound();
    }

    const updatedTasks = session.tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: targetStatus,
          completedAt: targetStatus === 'done' ? Date.now() : undefined,
        };
      }
      return t;
    });

    triggerSessionUpdate(updatedTasks);
  };

  // Utility to dispatch session updates and verify completeness
  const triggerSessionUpdate = (updatedTasks: RoutineTask[]) => {
    const wasCompleted = session.isCompleted;
    const isCompleted = updatedTasks.every((t) => t.status === 'done');
    const completedAt = isCompleted ? (session.completedAt || Date.now()) : undefined;

    const updatedSession = {
      ...session,
      tasks: updatedTasks,
      isCompleted,
      completedAt,
    };

    onUpdateSession(updatedSession);

    // Celebrate the task that was just moved to "done"
    const newlyDone = updatedTasks.find(
      (t) => t.status === 'done' && session.tasks.find((old) => old.id === t.id)?.status !== 'done'
    );
    if (newlyDone) {
      const cheer = translate(`cheer.${1 + Math.floor(Math.random() * 6)}`, language);
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
            language === 'fr' ? 'Plus qu\'une étoile pour gagner une médaille !' : 'Just one more star to win a medal!',
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
        language === 'fr'
          ? `Bravo ${profile.name} ! Maintenant : ${nextLabel} !`
          : `Well done ${profile.name}! Now: ${nextLabel}!`,
        language === 'fr' ? 'fr-FR' : 'en-US'
      );
      setPhaseBanner(justCompletedPhase.category);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(() => setPhaseBanner(null), 2500);
    }

    // If session transitions from incomplete to complete, celebrate!
    if (isCompleted && !wasCompleted) {
      reminderService.playRoutineSuccessSound();
      
      // Localized voice prompt praise
      const speechMsg = language === 'fr' 
        ? `Félicitations ${profile.name} ! Tu as terminé ta routine du soir. Bonne nuit !`
        : `Congratulations ${profile.name}! You finished your evening routine. Good night!`;
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
              {/* Star meter: stars collected toward the next medal */}
              <div
                ref={starMeterRef}
                data-testid="star-meter"
                aria-label={translate('stars.meter', language)}
                className="flex items-center gap-1 sm:gap-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-500/30 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full font-black text-sm sm:text-base md:text-lg"
              >
                {Array.from({ length: starsPerMedal }, (_, i) => (
                  <span
                    key={i}
                    className={`transition-all duration-300 ${i < (profile.starProgress ?? 0) ? '' : 'grayscale opacity-30'}`}
                  >
                    ⭐
                  </span>
                ))}
                <span className="hidden sm:inline text-white/50 mx-0.5">→</span>
                <span>🏅</span>
                <span key={profile.medalCount ?? 0} className="animate-counter-bump inline-block" data-testid="medal-count">
                  {profile.medalCount ?? 0}
                </span>
              </div>

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
            {nearMedalHint && (
              <span className="text-xs md:text-sm font-bold text-yellow-200 animate-fade-up [animation-delay:0s]">
                {translate('stars.one_left', language)}
              </span>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={handleResetClick}
              aria-label="reset routine"
              className={`flex items-center gap-2 px-3 py-2 border rounded-full transition-all duration-300 active:scale-95 text-xs font-bold ${
                confirmReset
                  ? 'bg-amber-600/30 border-amber-500/50 text-amber-200 hover:bg-amber-600/40 animate-pulse'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white/95 hover:bg-white/15'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              {confirmReset && (
                <span>{language === 'fr' ? 'Sûr ?' : 'Sure?'}</span>
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
          <div className="flex flex-col items-center gap-1.5 z-10" data-testid="phase-indicator">
            <div className="flex items-center gap-2 sm:gap-3 text-white font-black text-base sm:text-lg md:text-2xl">
              <span className="text-2xl sm:text-3xl md:text-4xl">{CATEGORY_ICONS[currentPhase.category]}</span>
              <span>
                {translate('board.step', language)} {currentPhaseIndex + 1}/{phases.length}{colon}
                {translate(`category.${currentPhase.category}`, language)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm text-white/60 font-bold">
              <div className="flex gap-1.5">
                {phases.map((p, i) => (
                  <span
                    key={p.category}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      p.isCompleted ? 'bg-emerald-400' : i === currentPhaseIndex ? 'bg-yellow-300' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
              <span>
                {nextPhase
                  ? `${translate('board.next', language)}${colon}${translate(`category.${nextPhase.category}`, language)} ${CATEGORY_ICONS[nextPhase.category]}`
                  : translate('board.last_step', language)}
              </span>
            </div>
          </div>
        )}

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
