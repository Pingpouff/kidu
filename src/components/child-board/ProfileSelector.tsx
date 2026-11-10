import React, { useEffect, useMemo, useState } from 'react';
import { ChildProfile, ParentSettings, RoutineSession, TaskDefinition } from '../../domain/models';
import { childSummary, greetingKey, upcomingDeadlines } from '../../domain/summary';
import { ChildCard } from './ChildCard';
import { translate, taskLabel, Language } from '../../i18n/dictionary';
import { Info, Settings } from 'lucide-react';

interface ProfileSelectorProps {
  profiles: ChildProfile[];
  onSelect: (profile: ChildProfile) => void;
  onEnterParentMode: () => void;
  language: Language;
  /** Number of late tasks per child id */
  lateCounts?: Record<string, number>;
  tasks?: TaskDefinition[];
  /** All stored sessions (today's for progress, older ones for streaks) */
  sessions?: RoutineSession[];
  settings?: ParentSettings;
  today?: string;
  /** Opens the "About" window (version, history, install) */
  onShowAbout?: () => void;
  /** Shown under the top bar, e.g. the invitation to install the app */
  banner?: React.ReactNode;
}

/** Re-renders every 30 s so late / upcoming tasks stay up to date. */
function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  onSelect,
  onEnterParentMode,
  language,
  lateCounts = {},
  tasks = [],
  sessions = [],
  settings,
  today,
  onShowAbout,
  banner,
}) => {
  const now = useNow();
  const date = today ?? new Date(now).toISOString().slice(0, 10);
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const timeFormat = useMemo(
    () => new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }),
    [language]
  );

  const summaries = useMemo(
    () => new Map(profiles.map((p) => [p.id, childSummary(now, date, p, sessions, tasks, settings)])),
    [now, date, profiles, sessions, tasks, settings]
  );
  const deadlines = useMemo(
    () => upcomingDeadlines(now, date, profiles, sessions, tasks),
    [now, date, profiles, sessions, tasks]
  );
  const allDone =
    profiles.length > 0 && [...summaries.values()].every((s) => s.status === 'completed' || s.status === 'no_tasks');
  const hasDueTimes = tasks.some((t) => t.dueTime || t.startTime);
  const remindersOff = hasDueTimes && settings?.reminders?.enabled === false;

  const label = (id: string) => {
    const def = byId.get(id);
    return def ? `${def.icon} ${taskLabel(def, language)}` : '';
  };

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain flex flex-col gap-6 p-4 sm:p-8 theme-indigo relative overflow-x-hidden select-none" data-testid="home-screen">
      {/* Background stars / sparkles */}
      <div className="absolute top-10 left-10 text-white/10 text-6xl animate-pulse pointer-events-none">★</div>
      <div className="absolute bottom-20 right-10 text-white/5 text-8xl animate-pulse-slow pointer-events-none">★</div>
      <div className="absolute top-1/3 right-1/4 text-white/10 text-4xl animate-bounce pointer-events-none">✨</div>
      <div className="absolute bottom-1/3 left-1/5 text-white/10 text-5xl animate-pulse pointer-events-none">✨</div>

      {/* Clock + parent mode access */}
      <div className="flex justify-between items-center z-10">
        <div className="text-3xl md:text-4xl font-black text-white/80 tabular-nums" data-testid="home-clock">
          🕰️ {timeFormat.format(now)}
        </div>
        <div className="flex items-center gap-3">
          {onShowAbout && (
            <button
              onClick={onShowAbout}
              aria-label={translate('about.button', language)}
              data-testid="about-button"
              className="p-4 bg-white/5 hover:bg-white/15 text-white/60 hover:text-white/90 border border-white/10 rounded-full transition-all duration-200"
            >
              <Info className="w-8 h-8" />
            </button>
          )}
          <button
            onClick={onEnterParentMode}
            aria-label={translate('btn.parent_mode', language)}
            className="p-4 bg-white/5 hover:bg-white/15 text-white/60 hover:text-white/90 border border-white/10 rounded-full transition-all duration-200"
          >
            <Settings className="w-8 h-8" />
          </button>
        </div>
      </div>

      {banner}

      <div className="flex-1 flex flex-col items-center w-full max-w-5xl mx-auto z-10 gap-8">
        <h1 className="text-3xl md:text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-indigo-300 drop-shadow">
          {translate(greetingKey(new Date(now).getHours()), language)}
        </h1>

        <div className="flex flex-wrap justify-center gap-6 w-full">
          {profiles.map((profile) => {
            const summary = summaries.get(profile.id);
            return (
              <ChildCard
                key={profile.id}
                profile={profile}
                summary={summary}
                lateCount={lateCounts[profile.id] ?? summary?.late.length ?? 0}
                language={language}
                label={label}
                formatTime={(t) => timeFormat.format(t)}
                onSelect={() => onSelect(profile)}
              />
            );
          })}
        </div>

        {/* Tonight: next due times for the whole family */}
        <section
          className="w-full max-w-2xl glass-panel p-4 md:p-5 flex flex-col gap-3"
          data-testid="home-tonight"
          aria-label={translate('home.tonight', language)}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg md:text-xl font-black text-white">🌆 {translate('home.tonight', language)}</h2>
            {remindersOff && (
              <span className="text-xs font-bold text-white/50 bg-white/5 px-2.5 py-1 rounded-full">
                🔕 {translate('home.reminders_off', language)}
              </span>
            )}
          </div>
          {allDone ? (
            <p className="text-base font-bold text-emerald-300">{translate('home.all_done', language)}</p>
          ) : deadlines.length === 0 ? (
            <p className="text-sm font-semibold text-white/50">{translate('home.no_deadline', language)}</p>
          ) : (
            <>
              <p className="text-xs font-extrabold text-white/50 uppercase tracking-wider">
                🔔 {translate('home.next_deadlines', language)}
              </p>
              <ul className="flex flex-col gap-2">
                {deadlines.map((d) => (
                  <li
                    key={`${d.kind}_${d.definitionId}`}
                    data-testid="home-deadline"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                  >
                    <span
                      className={`font-black tabular-nums w-20 shrink-0 ${d.kind === 'start' ? 'text-sky-300' : 'text-amber-300'}`}
                      title={translate(d.kind === 'start' ? 'parent.tasks.start_time' : 'parent.tasks.due_time', language)}
                    >
                      {d.kind === 'start' ? '🚀' : '⏰'} {d.time}
                    </span>
                    <span className="flex-1 min-w-0 truncate font-bold text-white">
                      {label(d.definitionId)}
                      {d.startTime && d.dueTime && (
                        <span className="ml-2 text-xs font-semibold text-white/60">
                          {d.startTime}–{d.dueTime}
                        </span>
                      )}
                    </span>
                    <span className="flex -space-x-1 text-xl" title={d.childIds.map((id) => profiles.find((p) => p.id === id)?.name).join(', ')}>
                      {d.childIds.map((id) => (
                        <span key={id}>{profiles.find((p) => p.id === id)?.avatar}</span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {/* Footer message */}
      <div className="text-center text-white/50 text-sm z-10">
        {translate('home.footer', language)}
      </div>
    </div>
  );
};
