import React from 'react';
import { childTheme, ChildColor } from '../../ui/theme';

interface ProgressBarProps {
  progress: number; // 0 to 100
  avatar: string; // Emoji character of the active child
  colorTheme: ChildColor;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  avatar,
  colorTheme,
}) => {
  // Theme gradients for progress fill

  const fillGradient = childTheme(colorTheme).progress;

  // Safe percentage bounded [0, 100]
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full bg-black/30 border border-white/10 rounded-full p-2 backdrop-blur-md relative shadow-inner">
      {/* Path Line Track */}
      <div className="w-full h-8 bg-white/5 rounded-full overflow-hidden relative">
        {/* Fill Progress */}
        <div
          style={{ width: `${pct}%` }}
          className={`h-full bg-gradient-to-r ${fillGradient} shadow-lg rounded-full transition-all duration-700 ease-out`}
        />

        {/* Path dots/milestones */}
        <div className="absolute inset-0 flex justify-between items-center px-6 pointer-events-none">
          <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
          <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
          <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
          <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
          <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
        </div>
      </div>

      {/* Sliding Kid Avatar Indicator */}
      <div
        style={{
          left: `calc(${pct}% - 24px + (24px - ${pct / 100 * 40}px))`,
          transition: 'left 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)', // Snappy spring feel
        }}
        className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center pointer-events-none"
      >
        <div className="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-3xl border-2 border-white animate-float ring-4 ring-black/10 select-none">
          {avatar}
        </div>
      </div>

      {/* Goal Star Marker (Finish Line) */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl border border-yellow-500/30 transition-colors duration-500 ${
            pct === 100
              ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50 scale-110 border-yellow-300'
              : 'bg-yellow-950/40 opacity-70'
          }`}
        >
          {pct === 100 ? '🌟' : '⭐'}
        </div>
      </div>
    </div>
  );
};
