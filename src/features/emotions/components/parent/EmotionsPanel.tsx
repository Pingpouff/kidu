import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2 } from 'lucide-react';
import { db } from '../../../../persistence/db';
import type { ChildProfile, EmotionLevel, ParentSettings } from '../../../../domain/models';
import { translate, translateDynamic, Language } from '../../../../i18n/dictionary';
import { PanelHeader } from '../../../../ui/Panel';
import { ConfirmIconButton } from '../../../../ui/controls';
import { buttonClass, fieldClass } from '../../../../ui/styles';
import { cx } from '../../../../ui/cx';
import { FAMILY_COLORS, strategyById } from '../../domain/catalog';
import { ageLevel } from '../../domain/level';
import { localDate } from '../../domain/checkin';
import { emotionSettings } from '../../domain/settings';
import { calmCount, familyCounts, hardMoments, weekGrid, DayMoment } from '../../domain/trends';
import { emotionRepository } from '../../persistence/emotionRepository';

interface EmotionsPanelProps {
  profiles: ChildProfile[];
  settings: ParentSettings;
  language: Language;
}

const MOMENTS: DayMoment[] = ['morning', 'afternoon', 'evening'];
const SHEETS = ['anger', 'fear', 'sadness', 'jealousy', 'disappointment'] as const;
const lines = (key: string, language: Language) => translateDynamic(key, language).split('\n');

/**
 * Parent Mode → Émotions: gentle trends per child (no score), the child's
 * level and toolbox, the family's own ideas, coaching sheets and when to
 * talk to a professional.
 */
export const EmotionsPanel: React.FC<EmotionsPanelProps> = ({ profiles, settings, language }) => {
  const [childId, setChildId] = useState<string | undefined>(profiles[0]?.id);
  const child = profiles.find((p) => p.id === childId) ?? profiles[0];
  const stored = useLiveQuery(() => (child ? db.emotionLogs.where('childId').equals(child.id).toArray() : []), [child?.id]);
  const logs = useMemo(() => stored ?? [], [stored]);
  const custom = emotionSettings(settings).customStrategies;
  // Calm corners opened from the home screen belong to no child: counted for the family
  const homeCalm = useLiveQuery(
    () => db.emotionLogs.filter((l) => l.kind === 'calm' && !l.childId && l.date >= localDate(Date.now() - 27 * 24 * 60 * 60 * 1000)).count(),
    []
  );

  const today = localDate(Date.now());
  const grid = useMemo(() => weekGrid(logs, today), [logs, today]);
  const from = grid[0][0].date;
  const moments = hardMoments(logs, from);
  const families = familyCounts(logs, from);
  const calm = calmCount(logs, from);
  const hasCheckIns = grid.some((w) => w.some((d) => d.feelings.length > 0));
  const days = translate('parent.emo.days', language).split(',');

  const [newIcon, setNewIcon] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const addCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    await emotionRepository.setCustomStrategies([...custom, { id: `custom_${Date.now().toString(36)}`, icon: newIcon.trim() || '💡', label }]);
    setNewIcon('');
    setNewLabel('');
  };

  const helpfulItems = (child?.emotions?.helpful ?? []).flatMap((id) => {
    const own = custom.find((c) => c.id === id);
    if (own) return [{ id, icon: own.icon, label: own.label }];
    const builtin = strategyById(id);
    return builtin ? [{ id, icon: builtin.icon, label: translateDynamic(`emo.strategy.${id}`, language) }] : [];
  });

  return (
    <div className="flex flex-col gap-8" data-testid="emotions-panel">
      <PanelHeader title={translate('parent.emo.title', language)} description={translate('parent.emo.description', language)} />
      {!!homeCalm && (
        <p className="text-sm text-white/70 -mt-4" data-testid="emotions-home-calm">
          {translate('parent.emo.home_calm', language, { n: homeCalm })}
        </p>
      )}

      {child && (
        <section className="flex flex-col gap-4">
          {profiles.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={p.id === child.id}
                  onClick={() => setChildId(p.id)}
                  data-testid={`emotions-child-${p.id}`}
                  className={cx(
                    'px-4 py-2 rounded-full border text-sm font-bold',
                    p.id === child.id ? 'bg-indigo-600 border-indigo-400/40 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  )}
                >
                  {p.avatar} {p.name}
                </button>
              ))}
            </div>
          )}

          {/* 4 weeks of feelings */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-white/70">{translate('parent.emo.weeks', language)}</h4>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2" data-testid="emotions-calendar">
              {days.map((d, i) => (
                <span key={i} className="text-center text-[11px] font-bold text-white/40">
                  {d}
                </span>
              ))}
              {grid.flat().map((day) => {
                const names = day.feelings.map((f) => translateDynamic(`emo.emotion.${f.emotionId}`, language));
                return (
                  <div
                    key={day.date}
                    data-testid={`day-${day.date}`}
                    title={names.join(', ')}
                    className={cx(
                      'min-h-[3.25rem] rounded-xl border p-1 flex flex-col gap-1',
                      day.date === today ? 'border-indigo-400/60 bg-indigo-500/10' : 'border-white/5 bg-white/[0.03]',
                      day.date > today && 'opacity-30'
                    )}
                  >
                    <span className="text-[10px] text-white/40 leading-none">{Number(day.date.slice(8))}</span>
                    <div className="flex flex-wrap gap-0.5">
                      {day.feelings.slice(0, 4).map((f, i) => (
                        <span
                          key={i}
                          className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-black/20"
                          style={{ backgroundColor: f.color }}
                          aria-label={translateDynamic(`emo.emotion.${f.emotionId}`, language)}
                          role="img"
                        />
                      ))}
                      {day.feelings.length > 4 && <span className="text-[10px] text-white/60">+{day.feelings.length - 4}</span>}
                      {day.calm > 0 && <span className="text-[11px] leading-none" aria-hidden="true">☁️</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {!hasCheckIns && <p className="text-sm text-white/50">{translate('parent.emo.empty', language, { name: child.name })}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-sm font-bold text-white/85" data-testid="emotions-calm-count">
                {translate('parent.emo.calm_count', language, { n: calm })}
              </p>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-white/50">{translate('parent.emo.hard_moments', language)}</span>
                <div className="flex gap-2" data-testid="emotions-moments">
                  {MOMENTS.map((m) => (
                    <span key={m} className="flex-1 text-center rounded-xl bg-white/5 border border-white/10 py-2 text-sm">
                      <span className="block font-black text-lg">{moments[m]}</span>
                      <span className="text-white/60 text-xs">{translateDynamic(`parent.emo.moment.${m}`, language)}</span>
                    </span>
                  ))}
                </div>
              </div>
              {families.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-white/50">{translate('parent.emo.families', language)}</span>
                  <div className="flex flex-wrap gap-1.5" data-testid="emotions-families">
                    {families.map((f) => (
                      <span key={f.family} className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 pl-1.5 pr-3 py-1 text-xs font-bold">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: FAMILY_COLORS[f.family] }} />
                        {translateDynamic(`emo.emotion.${f.family}`, language)} · {f.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
              <span className="text-xs font-bold text-white/50">{translate('parent.emo.helpful', language)}</span>
              {helpfulItems.length === 0 ? (
                <p className="text-sm text-white/50">{translate('parent.emo.helpful_none', language)}</p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm" data-testid="emotions-helpful">
                  {helpfulItems.map((s) => (
                    <li key={s.id}>
                      <span aria-hidden="true">{s.icon}</span> {s.label}
                    </li>
                  ))}
                </ul>
              )}
              <label className="flex flex-col gap-1.5 text-sm text-white/85 mt-auto min-w-0">
                <span>{translate('parent.emo.level', language)}</span>
                <select
                  value={child.emotions?.level ?? 'auto'}
                  data-testid="emotions-level"
                  onChange={(e) =>
                    emotionRepository.setLevel(child.id, e.target.value === 'auto' ? undefined : (Number(e.target.value) as EmotionLevel))
                  }
                  className={fieldClass('md', 'px-3 w-full min-w-0')}
                >
                  <option value="auto">
                    {translate('parent.emo.level.auto', language)} ({translateDynamic(`parent.emo.level.${ageLevel(child.age)}`, language)})
                  </option>
                  {[1, 2, 3].map((l) => (
                    <option key={l} value={l}>
                      {translateDynamic(`parent.emo.level.${l}`, language)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <ConfirmIconButton
                  icon={<Trash2 className="w-4 h-4" />}
                  label={translate('parent.emo.delete_history', language, { name: child.name })}
                  confirmText={translate('parent.emo.delete_confirm', language)}
                  onConfirm={() => emotionRepository.deleteChildLogs(child.id)}
                  data-testid="emotions-delete-history"
                />
                {translate('parent.emo.delete_history', language, { name: child.name })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* The family's own ideas */}
      <section className="flex flex-col gap-3">
        <PanelHeader title={translate('parent.emo.custom.title', language)} description={translate('parent.emo.custom.description', language)} />
        {custom.length > 0 && (
          <ul className="flex flex-col gap-2" data-testid="emotions-custom-list">
            {custom.map((c) => (
              <li key={c.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <span className="text-xl" aria-hidden="true">{c.icon}</span>
                <span className="flex-1 text-sm">{c.label}</span>
                <ConfirmIconButton
                  icon={<Trash2 className="w-4 h-4" />}
                  label={translate('parent.emo.custom.delete', language, { label: c.label })}
                  confirmText={translate('parent.emo.delete_confirm', language)}
                  onConfirm={() => emotionRepository.setCustomStrategies(custom.filter((x) => x.id !== c.id))}
                />
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addCustom} className="flex flex-wrap items-center gap-2" data-testid="emotions-custom-form">
          <input
            value={newIcon}
            onChange={(e) => setNewIcon(e.target.value)}
            maxLength={4}
            aria-label={translate('parent.emo.custom.icon', language)}
            placeholder="🐈"
            className={fieldClass('md', 'w-16 text-center px-2')}
          />
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            maxLength={60}
            aria-label={translate('parent.emo.custom.label', language)}
            placeholder={translate('parent.emo.custom.label', language)}
            className={fieldClass('md', 'flex-1 min-w-[12rem] px-3')}
          />
          <button type="submit" disabled={!newLabel.trim()} className={buttonClass('primary', 'md')}>
            <Plus className="w-4 h-4" />
            {translate('btn.add', language)}
          </button>
        </form>
      </section>

      {/* Coaching sheets */}
      <section className="flex flex-col gap-3" data-testid="emotions-coaching">
        <PanelHeader title={translate('parent.emo.coaching.title', language)} description={translate('parent.emo.coaching.description', language)} />
        <details className="bg-white/5 border border-white/10 rounded-2xl p-4" open>
          <summary className="cursor-pointer font-bold">{translate('parent.emo.coach.steps.title', language)}</summary>
          <ol className="list-decimal pl-5 mt-3 flex flex-col gap-1.5 text-sm text-white/85">
            {lines('parent.emo.coach.steps', language).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
        </details>
        {SHEETS.map((sheet) => (
          <details key={sheet} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <summary className="cursor-pointer font-bold">{translateDynamic(`parent.emo.sheet.${sheet}.title`, language)}</summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 text-sm">
              <div>
                <p className="text-emerald-300 font-bold mb-1">{translate('parent.emo.say', language)}</p>
                <ul className="list-disc pl-5 flex flex-col gap-1 text-white/85">
                  {lines(`parent.emo.sheet.${sheet}.say`, language).map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-rose-300 font-bold mb-1">{translate('parent.emo.avoid', language)}</p>
                <ul className="list-disc pl-5 flex flex-col gap-1 text-white/85">
                  {lines(`parent.emo.sheet.${sheet}.avoid`, language).map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        ))}
      </section>

      {/* When to talk to a professional */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 text-sm" data-testid="emotions-consult">
        <h3 className="text-lg font-bold text-slate-100">{translate('parent.emo.consult.title', language)}</h3>
        <p className="text-white/85">{translate('parent.emo.consult.intro', language)}</p>
        <ul className="list-disc pl-5 flex flex-col gap-1 text-white/85">
          {lines('parent.emo.consult.signs', language).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="text-white/85 font-semibold">{translate('parent.emo.consult.help', language)}</p>
        <p className="text-white/50 text-xs">{translate('parent.emo.consult.disclaimer', language)}</p>
      </section>
    </div>
  );
};
