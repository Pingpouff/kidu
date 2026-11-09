import React, { useEffect, useMemo, useState } from 'react';
import { ChildProfile, CATEGORY_ICONS, ParentSettings, RoutineSession, TaskDefinition } from '../../domain/models';
import { childSummary, ChildSummary, upcomingDeadlines } from '../../domain/summary';
import { translate, taskLabel, Language } from '../../i18n/dictionary';
import { Settings } from 'lucide-react';

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
}

const COLOR_THEMES: Record<ChildProfile['color'], string> = {
  indigo: 'from-indigo-500/30 to-indigo-900/40 border-indigo-500/40 hover:border-indigo-400 hover:shadow-indigo-500/20',
  purple: 'from-purple-500/30 to-purple-900/40 border-purple-500/40 hover:border-purple-400 hover:shadow-purple-500/20',
  rose: 'from-rose-500/30 to-rose-900/40 border-rose-500/40 hover:border-rose-400 hover:shadow-rose-500/20',
  emerald: 'from-emerald-500/30 to-emerald-900/40 border-emerald-500/40 hover:border-emerald-400 hover:shadow-emerald-500/20',
  amber: 'from-amber-500/30 to-amber-900/40 border-amber-500/40 hover:border-amber-400 hover:shadow-amber-500/20',
};

const BAR_COLORS: Record<ChildProfile['color'], string> = {
  indigo: 'bg-indigo-400',
  purple: 'bg-purple-400',
  rose: 'bg-rose-400',
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
};

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
  const hasDueTimes = tasks.some((t) => t.dueTime);
  const remindersOff = hasDueTimes && settings?.reminders?.enabled === false;

  const label = (id: string) => {
    const def = byId.get(id);
    return def ? `${def.icon} ${taskLabel(def, language)}` : '';
  };

  return (
    <div className="min-h-screen flex flex-col gap-6 p-4 sm:p-8 theme-indigo relative overflow-x-hidden select-none">
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
        <button
          onClick={onEnterParentMode}
          aria-label={translate('btn.parent_mode', language)}
          className="p-4 bg-white/5 hover:bg-white/15 text-white/60 hover:text-white/90 border border-white/10 rounded-full transition-all duration-200"
        >
          <Settings className="w-8 h-8" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center w-full max-w-5xl mx-auto z-10 gap-8">
        <h1 className="text-3xl md:text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-indigo-300 drop-shadow">
          {language === 'fr' ? 'Bonsoir ! Qui se prépare ? 🌟' : 'Good evening! Who is getting ready? 🌟'}
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
                    key={`${d.dueTime}_${d.definitionId}`}
                    data-testid="home-deadline"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                  >
                    <span className="font-black text-amber-300 tabular-nums w-14">{d.dueTime}</span>
                    <span className="flex-1 min-w-0 truncate font-bold text-white">{label(d.definitionId)}</span>
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
      <div className="text-center text-white/30 text-sm z-10">
        {language === 'fr' ? 'Application Routine Enfant' : 'Kids Routine Companion App'}
      </div>
    </div>
  );
};

interface ChildCardProps {
  profile: ChildProfile;
  summary?: ChildSummary;
  lateCount: number;
  language: Language;
  label: (definitionId: string) => string;
  formatTime: (epoch: number) => string;
  onSelect: () => void;
}

const ChildCard: React.FC<ChildCardProps> = ({ profile, summary, lateCount, language, label, formatTime, onSelect }) => {
  const theme = COLOR_THEMES[profile.color] || COLOR_THEMES.indigo;
  const percent = summary && summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;
  const isDone = summary?.status === 'completed';
  const sep = language === 'fr' ? ' :' : ':';

  const statusLine = () => {
    if (!summary) return null;
    switch (summary.status) {
      case 'no_tasks':
        return translate('home.no_tasks', language);
      case 'completed':
        return summary.completedAt
          ? `🌙 ${translate('home.completed_at', language)} ${formatTime(summary.completedAt)}`
          : `🌙 ${translate('home.completed', language)}`;
      case 'not_started':
        return `🚀 ${translate('home.not_started', language)}`;
      default:
        return summary.phase
          ? `${CATEGORY_ICONS[summary.phase.category]} ${translate('board.step', language)} ${summary.phase.index + 1}/${summary.phase.count} · ${translate(`category.${summary.phase.category}`, language)}`
          : null;
    }
  };

  return (
    <button
      onClick={onSelect}
      data-testid={`child-card-${profile.id}`}
      className={`relative w-full sm:w-[22rem] rounded-3xl border bg-gradient-to-b ${theme} backdrop-blur-md shadow-xl flex flex-col p-5 gap-3 text-left transform active:scale-95 transition-all duration-300 group`}
    >
      {/* Late tasks badge */}
      {lateCount > 0 && (
        <span
          data-testid="profile-late"
          className="absolute -top-3 -right-3 flex items-center gap-1 bg-rose-500 text-white font-black text-sm px-3 py-1.5 rounded-full shadow-lg animate-wiggle"
        >
          ⏰ {lateCount}
        </span>
      )}

      {/* Avatar, name, stars */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-white/10 rounded-full flex items-center justify-center text-5xl md:text-6xl shadow-inner group-hover:scale-110 transition-transform duration-300">
          {profile.avatar}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-2xl md:text-3xl font-extrabold tracking-wide drop-shadow text-white group-hover:text-yellow-200 transition-colors duration-300 truncate">
            {profile.name}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <span className="flex items-center gap-1 bg-black/20 px-2.5 py-0.5 rounded-full text-sm font-semibold text-yellow-300 border border-yellow-500/20">
              ⭐ {profile.stars}
            </span>
            {(summary?.streak ?? 0) >= 2 && (
              <span
                className="flex items-center gap-1 bg-black/20 px-2.5 py-0.5 rounded-full text-sm font-semibold text-orange-300 border border-orange-500/20"
                title={`${summary!.streak} ${translate('home.streak', language)}`}
                data-testid="home-streak"
              >
                🔥 {summary!.streak}
              </span>
            )}
          </div>
        </div>
      </div>

      {summary && (
        <>
          {/* Progress */}
          <div className="flex flex-col gap-1.5" data-testid="home-progress">
            <div className="flex items-center justify-between gap-2 text-sm font-bold">
              <span className={isDone ? 'text-emerald-300' : 'text-white/80'}>{statusLine()}</span>
              {summary.total > 0 && (
                <span className="text-white/60 tabular-nums shrink-0">
                  {summary.done}/{summary.total}
                </span>
              )}
            </div>
            {summary.total > 0 && (
              <div className="h-2.5 w-full rounded-full bg-black/30 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isDone ? 'bg-emerald-400' : BAR_COLORS[profile.color] ?? 'bg-indigo-400'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}
          </div>

          {/* What's happening now */}
          {!isDone && summary.total > 0 && (
            <div className="flex flex-col gap-1 text-sm">
              {summary.doing.length > 0 ? (
                <p className="text-white/80 font-semibold truncate" data-testid="home-doing">
                  <span className="text-orange-300 font-bold">▶ {translate('home.doing', language)}{sep}</span>{' '}
                  {summary.doing.map(label).join(', ')}
                </p>
              ) : (
                summary.next && (
                  <p className="text-white/80 font-semibold truncate" data-testid="home-next">
                    <span className="text-white/50 font-bold">{translate('home.next', language)}{sep}</span> {label(summary.next)}
                  </p>
                )
              )}
              {summary.late.length > 0 && (
                <p className="text-rose-300 font-bold truncate" data-testid="home-late">
                  ⏰ {translate('home.late', language)}{sep} {summary.late.map(label).join(', ')}
                </p>
              )}
              {summary.upcoming && (
                <p className="text-amber-200/90 font-semibold truncate" data-testid="home-upcoming">
                  🔔 {translate('home.due', language)} {summary.upcoming.dueTime}{sep} {label(summary.upcoming.definitionId)}
                </p>
              )}
            </div>
          )}

          {/* Rewards */}
          <div className="flex flex-wrap gap-1.5 text-xs font-bold">
            <span className="px-2.5 py-1 rounded-full bg-black/20 text-yellow-200">
              🏅 {translate('home.medal_in', language)} {summary.starsToMedal} ⭐
            </span>
            {summary.piggyBadges > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-black/20 text-pink-200" title={translate('home.piggy', language)}>
                🐷 {summary.piggyBadges}
              </span>
            )}
            {summary.pendingBadgeChoices > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-yellow-400 text-amber-950 animate-pulse" data-testid="home-badge-pending">
                🎁 {translate('home.badge_to_choose', language)}
              </span>
            )}
          </div>
        </>
      )}
    </button>
  );
};
