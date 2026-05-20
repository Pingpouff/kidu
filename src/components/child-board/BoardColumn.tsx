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
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  id,
  title,
  icon,
  colorTheme,
  children,
  count,
  isDragging = false,
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
      className={`flex-1 flex flex-col min-w-[200px] h-full rounded-3xl border bg-black/20 ${overlayClass} ${theme.glow} transition-all duration-300`}
    >
      {/* Column Header */}
      <div className={`flex items-center justify-between p-4 border-b ${theme.border} rounded-t-3xl bg-black/10`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl select-none leading-none">{icon}</span>
          <h2 className="text-lg md:text-xl font-extrabold tracking-wide text-white drop-shadow-sm uppercase">
            {title}
          </h2>
        </div>
        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-white/10 text-white/80 border border-white/10`}>
          {count}
        </span>
      </div>

      {/* Droppable Card Area */}
      <div className={`flex-1 overflow-y-auto p-4 scrollbar-thin ${
        id === 'done' 
          ? 'grid grid-cols-3 gap-2.5 content-start' 
          : 'flex flex-col gap-4'
      }`}>
        {count === 0 ? (
          <div className="flex-1 flex items-center justify-center border border-dashed border-white/5 rounded-2xl p-6 text-center">
            <span className="text-white/10 text-4xl select-none">✨</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
