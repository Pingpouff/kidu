import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { CalendarPeriod, ChildProfile } from '../../domain/models';
import { isValidPeriod, upcomingPeriods } from '../../domain/calendar';
import { translate, Language } from '../../i18n/dictionary';
import { ConfirmIconButton } from '../../ui/controls';
import { PanelHeader } from '../../ui/Panel';
import { buttonClass, chipClass, fieldClass } from '../../ui/styles';
import { AssigneePicker } from './tasks/TaskFields';

interface CalendarPanelProps {
  periods: CalendarPeriod[];
  profiles: ChildProfile[];
  language: Language;
  today: string; // YYYY-MM-DD
  onSave: (periods: CalendarPeriod[]) => Promise<void>;
}

const KIND_ICONS: Record<CalendarPeriod['kind'], string> = { holidays: '🏖️', off: '😴' };

const newId = () => `period_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

/** A rest day for every child, today only. */
const isRestToday = (p: CalendarPeriod, today: string) => p.kind === 'off' && p.from === today && p.to === today && !p.childIds?.length;

/**
 * Holidays and rest days (Tasks tab). Holidays hide the "school" tasks and show
 * the "holidays" ones; a rest day also stops reminders and keeps streaks.
 */
export const CalendarPanel: React.FC<CalendarPanelProps> = ({ periods, profiles, language, today, onSave }) => {
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<CalendarPeriod['kind']>('holidays');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [childIds, setChildIds] = useState<string[]>([]);

  const list = upcomingPeriods(periods, today);
  const restToday = periods.find((p) => isRestToday(p, today));
  const invalid = !isValidPeriod({ kind, from, to });
  const dateFormat = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const formatDate = (date: string) => dateFormat.format(new Date(`${date}T12:00:00`));

  const toggleRestToday = () =>
    onSave(restToday ? periods.filter((p) => p.id !== restToday.id) : [...periods, { id: newId(), kind: 'off', from: today, to: today }]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    await onSave([...periods, { id: newId(), kind, from, to, ...(childIds.length ? { childIds } : {}) }]);
    setShowForm(false);
    setChildIds([]);
  };

  return (
    <section className="flex flex-col gap-3" data-testid="calendar-panel">
      <PanelHeader
        title={`📅 ${translate('parent.calendar.title', language)}`}
        className="items-center"
        action={
          !showForm && (
            <button type="button" onClick={() => setShowForm(true)} data-testid="open-period-form" className={buttonClass('secondary', 'md', 'shrink-0 gap-1.5 px-3 py-2')}>
              <Plus className="w-4 h-4" />
              {translate('parent.calendar.add', language)}
            </button>
          )
        }
      />
      <p className="text-xs text-white/50 leading-relaxed -mt-1">{translate('parent.calendar.description', language)}</p>

      <button
        type="button"
        onClick={toggleRestToday}
        aria-pressed={!!restToday}
        data-testid="rest-today"
        className={chipClass(!!restToday, false) + ' w-fit'}
      >
        😴 {translate(restToday ? 'parent.calendar.rest_today_on' : 'parent.calendar.rest_today', language)}
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="relative flex flex-col gap-3 bg-white/5 p-3 sm:p-4 rounded-2xl border border-indigo-500/30" data-testid="period-form">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            aria-label={translate('btn.close', language)}
            className="absolute -top-3 -right-2 w-8 h-8 rounded-full bg-slate-800 border border-white/15 text-white/70 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={translate('parent.calendar.kind', language)}>
            {(['holidays', 'off'] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={chipClass(kind === k, false)}>
                {KIND_ICONS[k]} {translate(`parent.calendar.kind.${k}`, language)}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/50">{translate(`parent.calendar.kind_hint.${kind}`, language)}</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold text-white/50 uppercase tracking-wide">
              {translate('parent.calendar.from', language)}
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  if (to < e.target.value) setTo(e.target.value);
                }}
                aria-invalid={invalid}
                data-testid="period-from"
                className={fieldClass('md', 'px-2')}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-white/50 uppercase tracking-wide">
              {translate('parent.calendar.to', language)}
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                aria-invalid={invalid}
                data-testid="period-to"
                className={fieldClass('md', 'px-2')}
              />
            </label>
          </div>
          <AssigneePicker profiles={profiles} value={childIds} onChange={setChildIds} language={language} />
          {invalid && (
            <p className="text-xs font-bold text-rose-300" role="alert">
              {translate('parent.calendar.invalid', language)}
            </p>
          )}
          <button type="submit" disabled={invalid} className={buttonClass('primary', 'md', 'w-fit')} data-testid="save-period">
            <Plus className="w-4 h-4" />
            {translate('btn.add', language)}
          </button>
        </form>
      )}

      {list.length === 0 ? (
        <p className="text-sm text-white/60">{translate('parent.calendar.empty', language)}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((p) => {
            const children = profiles.filter((c) => p.childIds?.includes(c.id));
            const current = p.from <= today && today <= p.to;
            return (
              <li key={p.id} data-testid="period-row" data-kind={p.kind} className="flex items-center gap-3 p-2.5 sm:p-3 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-2xl shrink-0" aria-hidden="true">
                  {KIND_ICONS[p.kind]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm flex flex-wrap items-center gap-x-2">
                    {translate(`parent.calendar.kind.${p.kind}`, language)}
                    {current && (
                      <span className="text-xs font-black uppercase tracking-wide text-emerald-300">{translate('parent.calendar.now', language)}</span>
                    )}
                  </p>
                  <p className="text-xs text-white/60">
                    {p.from === p.to ? formatDate(p.from) : `${formatDate(p.from)} → ${formatDate(p.to)}`}
                    {' · '}
                    {children.length > 0 ? children.map((c) => `${c.avatar} ${c.name}`).join(', ') : translate('parent.tasks.everyone', language)}
                  </p>
                </div>
                <ConfirmIconButton
                  label={translate('parent.calendar.delete', language)}
                  confirmText={translate('btn.confirm_delete', language)}
                  icon={<Trash2 className="w-4 h-4" />}
                  onConfirm={() => onSave(periods.filter((x) => x.id !== p.id))}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
