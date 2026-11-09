import { translate, Language } from '../../../i18n/dictionary';

/** Days of the week, Monday first (0 = Sunday … 6 = Saturday) */
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
export const SCHOOL_DAYS = [1, 2, 3, 4, 5];

/** Short localized day name ("lun.", "Mon") */
export const dayName = (day: number, language: Language) =>
  new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short' }).format(new Date(2023, 0, 1 + day)); // 2023-01-01 is a Sunday

export const sameDays = (a: number[], b: number[]) => a.length === b.length && b.every((d) => a.includes(d));

/** "Mon → Fri", or the list of days in week order */
export const daysLabel = (days: number[], language: Language) =>
  sameDays(days, SCHOOL_DAYS)
    ? translate('parent.tasks.school_days', language)
    : WEEK.filter((d) => days.includes(d)).map((d) => dayName(d, language)).join(' ');
