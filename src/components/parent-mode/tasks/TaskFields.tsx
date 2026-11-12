import React from 'react';
import { ChildProfile, TaskCategory, TaskSchedule, TASK_CATEGORIES, TASK_SCHEDULES, CATEGORY_ICONS } from '../../../domain/models';
import { isValidTimeWindow } from '../../../domain/reminders';
import { isValidDuration, MAX_DURATION_MINUTES } from '../../../domain/timer';
import { translate, Language } from '../../../i18n/dictionary';
import { chipClass } from '../../../ui/styles';

/* Phase selector shared by the creation and edit forms */
interface CategorySelectProps {
  value: TaskCategory;
  onChange: (category: TaskCategory) => void;
  language: Language;
  className: string;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({ value, onChange, language, className }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as TaskCategory)}
    aria-label={translate('parent.tasks.category', language)}
    className={className}
  >
    {TASK_CATEGORIES.map((category) => (
      <option key={category} value={category}>
        {CATEGORY_ICONS[category]} {translate(`category.${category}`, language)}
      </option>
    ))}
  </select>
);

/** Expected start and end times, with a warning when the start is not before the end. */
interface TimeWindowInputsProps {
  start: string;
  end: string;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  language: Language;
  inputClassName: string;
}

export const TimeWindowInputs: React.FC<TimeWindowInputsProps> = ({ start, end, onStart, onEnd, language, inputClassName }) => {
  const invalid = !isValidTimeWindow(start || undefined, end || undefined);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <label className="flex flex-col text-xs font-bold text-sky-300/80 uppercase tracking-wide" title={translate('parent.tasks.start_time_hint', language)}>
          🚀 {translate('parent.tasks.start_short', language)}
          <input
            type="time"
            value={start}
            onChange={(e) => onStart(e.target.value)}
            aria-label={translate('parent.tasks.start_time', language)}
            aria-invalid={invalid}
            className={`${inputClassName} ${invalid ? '!border-rose-500' : ''}`}
          />
        </label>
        <span className="text-white/60 pt-4">→</span>
        <label className="flex flex-col text-xs font-bold text-amber-300/80 uppercase tracking-wide" title={translate('parent.tasks.due_time_hint', language)}>
          ⏰ {translate('parent.tasks.end_short', language)}
          <input
            type="time"
            value={end}
            onChange={(e) => onEnd(e.target.value)}
            aria-label={translate('parent.tasks.due_time', language)}
            aria-invalid={invalid}
            className={`${inputClassName} ${invalid ? '!border-rose-500' : ''}`}
          />
        </label>
      </div>
      {invalid && (
        <p className="text-xs font-bold text-rose-300" role="alert" data-testid="time-window-error">
          {translate('parent.tasks.window_invalid', language)}
        </p>
      )}
    </div>
  );
};

/**
 * Who does the task: every child (default) or only some of them.
 * Selecting every child explicitly comes back to a common task.
 */
interface AssigneePickerProps {
  profiles: ChildProfile[];
  value: string[]; // empty = every child
  onChange: (ids: string[]) => void;
  language: Language;
  compact?: boolean;
}

export const AssigneePicker: React.FC<AssigneePickerProps> = ({ profiles, value, onChange, language, compact = false }) => {
  const known = value.filter((id) => profiles.some((p) => p.id === id));
  const toggle = (id: string) => {
    const next = known.includes(id) ? known.filter((x) => x !== id) : [...known, id];
    onChange(next.length === profiles.length ? [] : next);
  };
  const chip = (active: boolean) => chipClass(active, compact);
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={translate('parent.tasks.assigned_to', language)}>
      <span className="text-xs font-bold text-white/50">{translate('parent.tasks.assigned_to', language)}</span>
      <button type="button" aria-pressed={known.length === 0} onClick={() => onChange([])} className={chip(known.length === 0)}>
        👨‍👩‍👧 {translate('parent.tasks.everyone', language)}
      </button>
      {profiles.map((p) => (
        <button key={p.id} type="button" aria-pressed={known.includes(p.id)} onClick={() => toggle(p.id)} className={chip(known.includes(p.id))}>
          <span>{p.avatar}</span>
          {p.name}
        </button>
      ))}
    </div>
  );
};

/**
 * Time allowed once the child starts the task, in minutes (empty = not timed).
 * "Minutes left" warnings are a global reminder setting.
 */
interface DurationInputProps {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  inputClassName: string;
}

export const DurationInput: React.FC<DurationInputProps> = ({ value, onChange, language, inputClassName }) => {
  const invalid = value !== '' && !isValidDuration(Number(value));
  return (
    <label
      className="flex flex-col text-xs font-bold text-emerald-300/80 uppercase tracking-wide"
      title={translate('parent.tasks.duration_hint', language)}
    >
      ⏳ {translate('parent.tasks.duration_short', language)}
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DURATION_MINUTES}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          aria-label={translate('parent.tasks.duration', language)}
          aria-invalid={invalid}
          data-testid="task-duration-input"
          className={`${inputClassName} w-20 ${invalid ? '!border-rose-500' : ''}`}
        />
        <span className="normal-case text-white/50">min</span>
      </span>
    </label>
  );
};

/** School days only, holidays only, or always (default). */
interface SchedulePickerProps {
  value: TaskSchedule | undefined;
  onChange: (schedule: TaskSchedule | undefined) => void;
  language: Language;
  compact?: boolean;
}

export const SchedulePicker: React.FC<SchedulePickerProps> = ({ value, onChange, language, compact = false }) => {
  const chip = (active: boolean) => chipClass(active, compact);
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={translate('parent.tasks.schedule', language)} data-testid="schedule-picker">
      <span className="text-xs font-bold text-white/50">{translate('parent.tasks.schedule', language)}</span>
      <button type="button" aria-pressed={!value} onClick={() => onChange(undefined)} className={chip(!value)}>
        {translate('parent.tasks.schedule.always', language)}
      </button>
      {TASK_SCHEDULES.map((s) => (
        <button key={s} type="button" aria-pressed={value === s} onClick={() => onChange(s)} className={chip(value === s)}>
          {translate(`parent.tasks.schedule.${s}`, language)}
        </button>
      ))}
    </div>
  );
};
