import React from 'react';
import { translate, Language } from '../../../i18n/dictionary';
import { chipClass } from '../../../ui/styles';
import { WEEK, SCHOOL_DAYS, dayName, sameDays } from './days';

/**
 * Days the task is planned. Empty = every day; choosing all seven days comes back to "every day".
 */
interface DayPickerProps {
  value: number[];
  onChange: (days: number[]) => void;
  language: Language;
  compact?: boolean;
}

export const DayPicker: React.FC<DayPickerProps> = ({ value, onChange, language, compact = false }) => {
  const toggle = (day: number) => {
    const next = value.includes(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange(next.length === 7 ? [] : WEEK.filter((d) => next.includes(d)));
  };
  const chip = (active: boolean) => chipClass(active, compact);
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={translate('parent.tasks.days', language)} data-testid="day-picker">
      <span className="text-xs font-bold text-white/50">{translate('parent.tasks.days', language)}</span>
      <button type="button" aria-pressed={value.length === 0} onClick={() => onChange([])} className={chip(value.length === 0)}>
        {translate('parent.tasks.every_day', language)}
      </button>
      <button type="button" aria-pressed={sameDays(value, SCHOOL_DAYS)} onClick={() => onChange(SCHOOL_DAYS)} className={chip(sameDays(value, SCHOOL_DAYS))}>
        {translate('parent.tasks.school_days', language)}
      </button>
      {WEEK.map((d) => (
        <button key={d} type="button" aria-pressed={value.includes(d)} onClick={() => toggle(d)} className={chip(value.includes(d))}>
          {dayName(d, language)}
        </button>
      ))}
    </div>
  );
};
