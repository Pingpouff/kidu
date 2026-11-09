import React from 'react';
import { ChildProfile, TaskCategory, TASK_CATEGORIES, CATEGORY_ICONS } from '../../../domain/models';
import { isValidTimeWindow } from '../../../domain/reminders';
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
        <label className="flex flex-col text-[10px] font-bold text-sky-300/80 uppercase tracking-wide" title={translate('parent.tasks.start_time_hint', language)}>
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
        <span className="text-white/30 pt-4">→</span>
        <label className="flex flex-col text-[10px] font-bold text-amber-300/80 uppercase tracking-wide" title={translate('parent.tasks.due_time_hint', language)}>
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
