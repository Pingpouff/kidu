import React from 'react';
import { ChildProfile, CATEGORY_ICONS } from '../../domain/models';
import { ChildSummary } from '../../domain/summary';
import { translate, Language } from '../../i18n/dictionary';
import { childTheme } from '../../ui/theme';
import { Pill } from '../../ui/Pill';
import { ChildAvatar } from '../common/ChildAvatar';

/**
 * A child's card on the selection screen: avatar, stars, tonight's progress,
 * what is in progress / next / late / due, and rewards.
 */
export interface ChildCardProps {
  profile: ChildProfile;
  summary?: ChildSummary;
  lateCount: number;
  language: Language;
  label: (definitionId: string) => string;
  formatTime: (epoch: number) => string;
  onSelect: () => void;
}

export const ChildCard: React.FC<ChildCardProps> = ({ profile, summary, lateCount, language, label, formatTime, onSelect }) => {
  const theme = childTheme(profile.color).card;
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
        <ChildAvatar avatar={profile.avatar} className="group-hover:scale-110 transition-transform duration-300" />
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-2xl md:text-3xl font-extrabold tracking-wide drop-shadow text-white group-hover:text-yellow-200 transition-colors duration-300 truncate">
            {profile.name}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <Pill className="py-0.5 text-sm font-semibold text-yellow-300 border border-yellow-500/20">⭐ {profile.stars}</Pill>
            {(summary?.streak ?? 0) >= 2 && (
              <Pill
                className="py-0.5 text-sm font-semibold text-orange-300 border border-orange-500/20"
                title={`${summary!.streak} ${translate('home.streak', language)}`}
                data-testid="home-streak"
              >
                🔥 {summary!.streak}
              </Pill>
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
                  className={`h-full rounded-full transition-all duration-700 ${isDone ? 'bg-emerald-400' : childTheme(profile.color).bar}`}
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
                  {summary.upcoming.kind === 'start'
                    ? `🚀 ${translate('home.starts_at', language)} ${summary.upcoming.time}`
                    : `🔔 ${translate('home.due', language)} ${summary.upcoming.time}`}
                  {sep} {label(summary.upcoming.definitionId)}
                </p>
              )}
            </div>
          )}

          {/* Rewards */}
          <div className="flex flex-wrap gap-1.5 text-xs font-bold">
            <Pill className="text-yellow-200">
              🏅 {translate('home.medal_in', language)} {summary.starsToMedal} ⭐
            </Pill>
            {summary.piggyBadges > 0 && (
              <Pill className="text-pink-200" title={translate('home.piggy', language)}>
                🐷 {summary.piggyBadges}
              </Pill>
            )}
            {summary.pendingBadgeChoices > 0 && (
              <Pill className="bg-yellow-400 text-amber-950 animate-pulse" data-testid="home-badge-pending">
                🎁 {translate('home.badge_to_choose', language)}
              </Pill>
            )}
          </div>
        </>
      )}
    </button>
  );
};
