import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { RoutineTask, TaskDefinition } from '../../domain/models';
import { taskLabel, translate, Language } from '../../i18n/dictionary';
import { isValidDuration } from '../../domain/timer';
import { TaskTimer } from './TaskTimer';

interface TaskCardProps {
  task: RoutineTask;
  definition: TaskDefinition;
  language: Language;
  onTap: (task: RoutineTask) => void;
  /** Set right after the task is completed: plays the burst + cheer animation */
  celebration?: { cheer: string; key: number };
  /** The task is past its due time and not done */
  isLate?: boolean;
}

const PARTICLES = ['⭐', '✨', '🌟', '💫', '⭐', '✨', '🌟', '💫'];

/* Stars flying out of the card, with a floating cheer word */
const CompletionBurst: React.FC<{ cheer: string }> = ({ cheer }) => (
  <div className="absolute inset-0 pointer-events-none z-30" aria-hidden="true">
    {PARTICLES.map((emoji, i) => {
      const angle = (i / PARTICLES.length) * 2 * Math.PI;
      const distance = 70 + (i % 2) * 30;
      return (
        <span
          key={i}
          className="particle text-xl md:text-2xl"
          style={{
            '--dx': `${Math.round(Math.cos(angle) * distance)}px`,
            '--dy': `${Math.round(Math.sin(angle) * distance)}px`,
            '--rot': `${i % 2 ? 180 : -180}deg`,
            animationDelay: `${(i % 3) * 40}ms`,
          } as React.CSSProperties}
        >
          {emoji}
        </span>
      );
    })}
    <span className="cheer text-lg md:text-2xl font-black text-yellow-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
      {cheer}
    </span>
  </div>
);

interface TaskCardViewProps {
  task: RoutineTask;
  definition: TaskDefinition;
  language: Language;
  celebration?: { cheer: string; key: number };
  isLate?: boolean;
}

/**
 * What a card shows, without drag behaviour. Memoized: during a drag, dnd-kit
 * re-renders every draggable on each finger move, but the content (emoji,
 * label, times) doesn't change. Also used as the copy under the finger.
 */
const TaskCardView: React.FC<TaskCardViewProps> = React.memo(function TaskCardView({
  task,
  definition,
  language,
  celebration,
  isLate = false,
}) {
  const emojiClass =
    task.status === 'done'
      ? 'text-[28px] sm:text-[36px] lg:text-[44px]'
      : 'text-[56px] sm:text-[64px] md:text-[80px] lg:text-[64px] xl:text-[88px]';
  return (
    <>
      {/* Sparkle or done indicator */}
      {task.status === 'done' && (
        <span className="absolute top-0 right-0 text-sm md:text-base lg:text-lg animate-bounce">✨</span>
      )}
      {/* Expected times: discreet when upcoming, red and wiggling when late */}
      {(definition?.dueTime || definition?.startTime) && task.status !== 'done' && (
        <span
          data-testid={isLate ? 'task-late' : definition.dueTime ? 'task-due' : 'task-start'}
          className={`absolute top-1.5 left-1.5 z-10 text-xs md:text-xs font-black rounded-full px-2 py-0.5 shadow ${
            isLate ? 'bg-rose-500 text-white animate-wiggle' : 'bg-slate-900/85 text-white/80'
          }`}
        >
          {definition.startTime && definition.dueTime && !isLate
            ? `🕒 ${definition.startTime}–${definition.dueTime}`
            : definition.dueTime
              ? `⏰ ${definition.dueTime}`
              : `🚀 ${definition.startTime}`}
        </span>
      )}
      {/* Timed task: the countdown once started, the time allowed before */}
      {isValidDuration(definition?.durationMinutes) ? (
        task.status === 'doing' ? (
          <TaskTimer task={task} definition={definition} language={language} />
        ) : (
          task.status === 'todo' && (
            <span
              data-testid="task-duration"
              title={translate('timer.duration', language, { minutes: definition.durationMinutes! })}
              className="absolute top-1.5 right-1.5 z-10 text-xs md:text-xs font-black rounded-full px-2 py-0.5 shadow bg-slate-900/85 text-emerald-200"
            >
              ⏳ {translate('timer.left', language, { minutes: definition.durationMinutes! })}
            </span>
          )
        )
      ) : (
        task.status === 'doing' && <span className="absolute top-2 right-2 text-sm text-amber-400 font-bold animate-pulse">⏰</span>
      )}

      {celebration && <CompletionBurst key={celebration.key} cheer={celebration.cheer} />}

      {/* Massive emoji icon */}
      <span
        key={celebration?.key}
        className={`${emojiClass} leading-none ${celebration ? 'animate-task-pop inline-block' : ''} drop-shadow select-none`}
      >
        {definition?.icon || '⭐'}
      </span>

      {/* Small helper text label */}
      {task.status !== 'done' && (
        <span className="text-[13px] sm:text-sm xl:text-base leading-tight font-extrabold opacity-80 tracking-wide mt-1.5 sm:mt-2 text-center uppercase line-clamp-2 break-words w-full px-1">
          {taskLabel(definition, language)}
        </span>
      )}
    </>
  );
});

// Status-based card styles
const STATUS_STYLES = {
  todo: 'bg-white/10 border-white/20 hover:border-yellow-400/50 text-white shadow-md active:bg-white/15',
  doing: 'bg-amber-500/20 border-amber-400/30 hover:border-amber-400 text-amber-100 shadow-lg shadow-amber-950/20 active:bg-amber-500/30 animate-pulse-slow',
  done: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-100/70 shadow-sm border-dashed opacity-75 active:bg-emerald-500/20 scale-[0.90] hover:scale-[0.95] hover:opacity-100',
};

/** Card frame (shape, colors) shared by the board card and the copy under the finger. */
function taskCardClass(status: RoutineTask['status']): string {
  const aspect =
    status === 'done'
      ? 'w-full aspect-square rounded-2xl p-1'
      : 'w-full aspect-square sm:aspect-[4/3] lg:aspect-square xl:aspect-[4/3] rounded-3xl p-2 sm:p-2.5';
  return `${aspect} border ${STATUS_STYLES[status] || STATUS_STYLES.todo} flex flex-col items-center justify-center relative`;
}

/**
 * The copy under the finger while dragging (DragOverlay): same look, no
 * second useDraggable. dnd-kit only moves it with a transform.
 */
export const TaskCardGhost: React.FC<TaskCardViewProps> = (props) => (
  <div className="opacity-90 scale-105 rotate-2 shadow-2xl rounded-3xl" data-testid="drag-overlay">
    <div className={taskCardClass(props.task.status)}>
      <div className="relative flex flex-col items-center justify-center w-full h-full">
        <TaskCardView {...props} />
      </div>
    </div>
  </div>
);

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  definition,
  language,
  onTap,
  celebration,
  isLate = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task, definition }
  });

  // The card stays in place while dragged (faded): the copy under the finger is
  // the DragOverlay in RoutineBoard. Moving both, with a CSS transition
  // restarted on every finger move, made drags lag on weak tablets.
  const baseHoverClass = task.status === 'done' ? '' : 'hover:scale-[1.03]';
  const innerAnimClass = task.status === 'done' && !isDragging ? 'animate-pop-shrink' : '';

  // Simple handler to ensure clicking works on desktop/touch
  const handleClick = () => {
    // Avoid triggering tap when dragging
    if (transform && (Math.abs(transform.x) > 5 || Math.abs(transform.y) > 5)) {
      return;
    }
    onTap(task);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ touchAction: 'none' }}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      // Keyboard: Enter / Space move the task like a tap
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap(task);
        }
      }}
      aria-label={`${taskLabel(definition, language)}, ${translate(`task.status.${task.status}`, language)}${isLate ? ' ⏰' : ''}`}
      className={`${taskCardClass(task.status)} cursor-grab active:cursor-grabbing ${baseHoverClass} transition-[transform,opacity,background-color,border-color] duration-300 ${
        isDragging ? 'opacity-30' : ''
      } z-10`}
    >
      <div className={`relative flex flex-col items-center justify-center w-full h-full ${innerAnimClass}`}>
        <TaskCardView task={task} definition={definition} language={language} celebration={celebration} isLate={isLate} />
      </div>
    </div>
  );
};
