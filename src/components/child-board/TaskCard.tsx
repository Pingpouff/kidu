import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { RoutineTask, TaskDefinition } from '../../domain/models';
import { translate, Language } from '../../i18n/dictionary';

interface TaskCardProps {
  task: RoutineTask;
  definition: TaskDefinition;
  language: Language;
  onTap: (task: RoutineTask) => void;
  /** Set right after the task is completed: plays the burst + cheer animation */
  celebration?: { cheer: string; key: number };
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

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  definition,
  language,
  onTap,
  celebration,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task, definition }
  });

  // Calculate coordinates for CSS transform
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        touchAction: 'none',
      }
    : {
        touchAction: 'none',
      };

  // Status-based card styles
  const statusStyles = {
    todo: 'bg-white/10 border-white/20 hover:border-yellow-400/50 text-white shadow-md active:bg-white/15',
    doing: 'bg-amber-500/20 border-amber-400/30 hover:border-amber-400 text-amber-100 shadow-lg shadow-amber-950/20 active:bg-amber-500/30 animate-pulse-slow',
    done: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-100/70 shadow-sm border-dashed opacity-75 active:bg-emerald-500/20 scale-[0.90] hover:scale-[0.95] hover:opacity-100',
  };

  const cardTheme = statusStyles[task.status] || statusStyles.todo;
  const baseHoverClass = task.status === 'done' ? '' : 'hover:scale-[1.03]';
  const innerAnimClass = task.status === 'done' && !isDragging ? 'animate-pop-shrink' : '';
  const cardAspectClass = task.status === 'done' ? 'w-full aspect-square rounded-2xl p-1' : 'w-full aspect-[3/2] md:aspect-[16/10] rounded-3xl p-2.5';

  const emojiStyle = {
    fontSize: task.status === 'done'
      ? 'clamp(32px, 4.5vw, 75px)'
      : 'clamp(64px, 12vw, 220px)',
    lineHeight: '1',
  };

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
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`${cardAspectClass} border ${cardTheme} flex flex-col items-center justify-center relative cursor-grab active:cursor-grabbing transform ${baseHoverClass} transition-all duration-300 ${
        isDragging ? 'opacity-50 scale-105 rotate-2 z-50 shadow-2xl' : 'z-10'
      }`}
    >
      <div className={`relative flex flex-col items-center justify-center w-full h-full ${innerAnimClass}`}>
        {/* Sparkle or done indicator */}
        {task.status === 'done' && (
          <span className="absolute top-0 right-0 text-sm md:text-base lg:text-lg animate-bounce">✨</span>
        )}
        {task.status === 'doing' && (
          <span className="absolute top-2 right-2 text-sm text-amber-400 font-bold animate-pulse">⏰</span>
        )}

        {celebration && <CompletionBurst key={celebration.key} cheer={celebration.cheer} />}

        {/* Massive emoji icon */}
        <span
          key={celebration?.key}
          style={emojiStyle}
          className={`${celebration ? 'animate-task-pop inline-block' : ''} drop-shadow select-none group-hover:scale-110 transition-transform duration-200`}
        >
          {definition?.icon || '⭐'}
        </span>

        {/* Small helper text label */}
        {task.status !== 'done' && (
          <span className="text-xs md:text-base lg:text-lg font-extrabold opacity-80 tracking-wider mt-3 text-center uppercase truncate w-full px-1">
            {definition?.labelKey ? translate(definition.labelKey, language) : (definition?.defaultLabel || '')}
          </span>
        )}
      </div>
    </div>
  );
};
