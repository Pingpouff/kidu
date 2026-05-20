import React, { useState } from 'react';
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
import { ChildProfile, RoutineSession, RoutineTask, TaskDefinition } from '../../domain/models';
import { translate, Language } from '../../i18n/dictionary';
import { BoardColumn } from './BoardColumn';
import { TaskCard } from './TaskCard';
import { ProgressBar } from './ProgressBar';
import { reminderService } from '../../services/ReminderService';
import { ArrowLeft, Settings, RotateCcw } from 'lucide-react';

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
}

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
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const handleResetClick = () => {
    if (confirmReset) {
      setConfirmReset(false);
      onResetSession();
    } else {
      setConfirmReset(true);
      setTimeout(() => {
        setConfirmReset(false);
      }, 3000);
    }
  };

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

  // Background style based on child color theme
  const backgrounds = {
    indigo: 'theme-indigo',
    purple: 'theme-purple',
    rose: 'theme-rose',
    emerald: 'theme-emerald',
    amber: 'theme-amber',
  };

  const bgTheme = backgrounds[profile.color] || backgrounds.indigo;

  // Filter tasks into their respective columns
  const todoTasks = session.tasks.filter((t) => t.status === 'todo');
  const doingTasks = session.tasks.filter((t) => t.status === 'doing');
  const doneTasks = session.tasks.filter((t) => t.status === 'done');

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

  // Calculate routine progress percentage
  const totalCount = session.tasks.length;
  const doneCount = doneTasks.length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Active draggable element for the overlay
  const activeDragTask = session.tasks.find((t) => t.id === activeDragId);
  const activeDragDef = activeDragTask ? getDefinition(activeDragTask.definitionId) : null;

  const isDragging = activeDragId !== null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={`w-full h-screen flex flex-col justify-between ${bgTheme} overflow-hidden relative select-none`}>
        <div className="w-full max-w-6xl mx-auto flex flex-col justify-between h-full p-4 gap-2">
        
        {/* Top Header Bar */}
        <header className="flex items-center justify-between z-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-full text-white/80 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-extrabold text-sm md:text-base">
              {profile.avatar} {profile.name}
            </span>
          </button>

          {/* Sparkly Star count display */}
          <div className="flex items-center gap-2 bg-yellow-400/20 text-yellow-300 border border-yellow-500/30 px-5 py-2 rounded-full font-black tracking-wider text-base md:text-lg animate-float">
            <span>⭐</span>
            <span>{profile.stars}</span>
          </div>

          <div className="flex items-center gap-3">
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
              className="p-3 bg-white/5 hover:bg-white/15 text-white/60 hover:text-white/95 border border-white/10 rounded-full transition-all active:scale-95"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main className="flex-1 my-4 flex gap-4 md:gap-6 overflow-x-auto overflow-y-hidden justify-center items-stretch py-2">
          <BoardColumn
            id="todo"
            title={translate('col.todo', language)}
            icon="💤"
            colorTheme="yellow"
            count={todoTasks.length}
            isDragging={isDragging}
          >
            {todoTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                definition={getDefinition(t.definitionId)}
                language={language}
                onTap={handleTaskTap}
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
          >
            {doingTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                definition={getDefinition(t.definitionId)}
                language={language}
                onTap={handleTaskTap}
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
          >
            {doneTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                definition={getDefinition(t.definitionId)}
                language={language}
                onTap={handleTaskTap}
              />
            ))}
          </BoardColumn>
        </main>

        {/* Bottom Progress Bar */}
        <footer className="w-full max-w-4xl mx-auto px-4 pb-2 z-10">
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
