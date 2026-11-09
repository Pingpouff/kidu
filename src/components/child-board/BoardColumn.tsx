import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface BoardColumnProps {
  id: 'todo' | 'doing' | 'done';
  title: string;
  icon: string;
  colorTheme: 'yellow' | 'orange' | 'emerald';
  children: React.ReactNode;
  count: number;
  isDragging?: boolean;
  /** Shown in the empty drop area */
  emptyHint?: string;
  className?: string;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  id,
  title,
  icon,
  colorTheme,
  children,
  count,
  isDragging = false,
  emptyHint = '✨',
  className = '',
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  // Theme configuration for headers
  const headerThemes = {
    yellow: {
      bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      glow: 'shadow-yellow-500/10',
      border: 'border-yellow-500/20',
    },
    orange: {
      bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      glow: 'shadow-amber-500/10',
      border: 'border-amber-500/20',
    },
    emerald: {
      bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      glow: 'shadow-emerald-500/10',
      border: 'border-emerald-500/20',
    },
  };

  const theme = headerThemes[colorTheme];

  // Glowing highlights when dragging over
  const glowThemes = {
    yellow: 'border-yellow-400 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.25)] scale-[1.01]',
    orange: 'border-amber-400 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.25)] scale-[1.01]',
    emerald: 'border-emerald-400 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.25)] scale-[1.01]',
  };

  const overlayClass = isOver 
    ? glowThemes[colorTheme] 
    : isDragging 
      ? 'border-dashed border-white/20' 
      : theme.border;

  return (
    <div
      ref={setNodeRef}
      data-column={id}
      className={`flex-none sm:flex-1 flex flex-col min-w-0 sm:min-w-[200px] sm:h-full rounded-3xl border bg-black/20 ${overlayClass} ${theme.glow} transition-all duration-300 ${className}`}
    >
      {/* Column Header */}
      <div className={`flex items-center justify-between gap-2 px-3 py-2 sm:p-4 border-b ${theme.border} rounded-t-3xl bg-black/10`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-2xl sm:text-3xl select-none leading-none">{icon}</span>
          <h2 className="text-base lg:text-xl font-extrabold tracking-wide text-white drop-shadow-sm uppercase whitespace-nowrap truncate">
            {title}
          </h2>
        </div>
        <span className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm bg-white/10 text-white/80 border border-white/10`}>
          {count}
        </span>
      </div>

      {/* Droppable Card Area */}
      <div className={`sm:flex-1 sm:overflow-y-auto p-2.5 sm:p-4 scrollbar-thin ${
        count === 0
          ? 'flex'
          : id === 'done'
            ? 'grid grid-cols-5 sm:grid-cols-3 gap-2 sm:gap-2.5 content-start'
            : 'grid grid-cols-2 sm:grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3 content-start'
      }`}>
        {count === 0 ? (
          <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-2xl p-3 sm:p-6 text-center min-h-[3.5rem]">
            <span className={`select-none ${emptyHint === '✨' ? 'text-white/10 text-3xl sm:text-4xl' : 'text-white/45 text-sm sm:text-base font-bold'}`}>
              {emptyHint}
            </span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
