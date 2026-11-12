import React, { useEffect, useState } from 'react';
import { RoutineTask, TaskDefinition } from '../../domain/models';
import { minutesLeft, timerState } from '../../domain/timer';
import { translate, Language } from '../../i18n/dictionary';
import { cx } from '../../ui/cx';

const TICK_MS = 5_000; // the disc moves in small steps: cheap on old tablets
const R = 15;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * Countdown of a timed task in progress: a disc that empties (like a kitchen
 * timer) and the minutes left. Turns amber then pink as the time runs out.
 */
export const TaskTimer: React.FC<{ task: RoutineTask; definition: TaskDefinition; language: Language }> = ({ task, definition, language }) => {
  const [now, setNow] = useState(() => Date.now());
  const running = task.status === 'doing' && task.startedAt !== undefined;
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [running, task.startedAt]);

  const state = timerState(definition, task, now);
  if (!state) return null;

  if (state.expired) {
    return (
      <span
        data-testid="task-timer"
        data-expired="true"
        role="timer"
        aria-label={translate('timer.time_up', language)}
        title={translate('timer.time_up', language)}
        className="absolute top-1 right-1 z-10 w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center bg-rose-500 text-lg md:text-xl shadow-lg ring-2 ring-white/70 animate-wiggle"
      >
        ⌛
      </span>
    );
  }

  const minutes = minutesLeft(state.remainingMs);
  const color = state.fraction > 0.5 ? '#34d399' : state.fraction > 0.2 ? '#fbbf24' : '#fb7185';
  // A disc that empties, the minutes left in the middle (the label says "N minutes left")
  return (
    <span
      data-testid="task-timer"
      data-minutes={minutes}
      role="timer"
      aria-label={translate('timer.left_aria', language, { minutes })}
      title={translate('timer.left_aria', language, { minutes })}
      className="absolute top-1 right-1 z-10 w-9 h-9 md:w-11 md:h-11 rounded-full bg-slate-900/90 shadow-lg flex items-center justify-center"
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - state.fraction)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span aria-hidden="true" className={cx('relative text-sm md:text-base font-black tabular-nums leading-none', state.fraction > 0.2 ? 'text-white' : 'text-rose-300')}>
        {minutes}
      </span>
    </span>
  );
};
