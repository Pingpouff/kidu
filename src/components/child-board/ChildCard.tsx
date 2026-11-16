import React from 'react';
import { ChildProfile } from '../../domain/models';
import { ChildSummary } from '../../domain/summary';
import { translate, Language } from '../../i18n/dictionary';
import { childTheme } from '../../ui/theme';
import { Pill } from '../../ui/Pill';
import { cx } from '../../ui/cx';
import { ChildAvatar } from '../common/ChildAvatar';
import { STATUS_ICONS, STATUS_TONES, TIME_ICONS } from '../../ui/statusIcons';

/** A line of the card: a picture first (for children who can't read yet), then the text. */
const Line: React.FC<{ icon: string; tone: string; testId: string; className?: string; children: React.ReactNode }> = ({
  icon,
  tone,
  testId,
  className,
  children,
}) => (
  <p className={cx('flex items-center gap-2 min-w-0', className)} data-testid={testId}>
    <span aria-hidden="true" className={cx('shrink-0 w-10 h-10 rounded-full border flex items-center justify-center text-2xl leading-none', tone)}>
      {icon}
    </span>
    {children}
  </p>
);

/**
 * A child's card on the selection screen, kept simple: avatar and name, what
 * the child is doing (or does next) with the time left on a timed task, what
 * is late or due soon, and a thin progress bar. Rewards live on the board.
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
  const theme = childTheme(profile.color);
  const cardLevel = summary?.cards.level ?? 'none';
  const percent = summary && summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;
  const isDone = summary?.status === 'completed';
  const sep = language === 'fr' ? ' :' : ':';
  const timer = summary?.timer;

  return (
    <button
      onClick={onSelect}
      data-testid={`child-card-${profile.id}`}
      data-card-level={cardLevel}
      className={cx(
        'relative w-full sm:w-[22rem] rounded-3xl border bg-gradient-to-b backdrop-blur-md shadow-xl flex flex-col p-5 gap-3 text-left transform active:scale-95 transition-all duration-300 group',
        theme.card,
        cardLevel === 'yellow' && 'ring-4 ring-yellow-400 shadow-yellow-500/30',
        cardLevel === 'red' && 'ring-4 ring-red-500 shadow-red-500/40'
      )}
    >
      {/* Late tasks badge */}
      {lateCount > 0 && (
        <span
          data-testid="profile-late"
          className="absolute -top-3 -right-3 flex items-center gap-1 bg-rose-500 text-white font-black text-sm px-3 py-1.5 rounded-full shadow-lg animate-wiggle"
        >
          {TIME_ICONS.due} {lateCount}
        </span>
      )}

      {/* Avatar and name */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <ChildAvatar avatar={profile.avatar} className="group-hover:scale-110 transition-transform duration-300" />
          {/* Tonight's yellow / red card, stuck on the avatar */}
          {summary && cardLevel !== 'none' && (
            <span
              data-testid="home-card"
              data-level={cardLevel}
              data-yellow={summary.cards.yellow}
              data-red={summary.cards.red}
              title={[translate(cardLevel === 'red' ? 'cards.banner_red' : 'cards.banner_yellow', language), summary.cards.lastReason]
                .filter(Boolean)
                .join(' · ')}
              className="absolute -bottom-1 -right-2 flex items-end"
            >
              <span className={cx('referee-card size-md rotate-12 animate-card-sticker ring-2 ring-white/70', cardLevel === 'red' ? 'is-red' : 'is-yellow')} />
              {cardLevel === 'yellow' && summary.cards.yellow > 1 && (
                <span className="ml-0.5 text-xs font-black text-yellow-300 drop-shadow">×{summary.cards.yellow}</span>
              )}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-2xl md:text-3xl font-extrabold tracking-wide drop-shadow text-white group-hover:text-yellow-200 transition-colors duration-300 truncate">
            {profile.name}
          </span>
          {(summary?.muted || summary?.period) && (
            <div className="flex flex-wrap gap-1.5">
              {summary.muted && (
                <Pill className="py-0.5 text-sm font-semibold text-white/70 border border-white/20" data-testid="home-child-muted" title={translate('home.muted_child', language)}>
                  🔕
                </Pill>
              )}
              {summary.period && (
                <Pill className="py-0.5 text-sm font-semibold text-cyan-200 border border-cyan-400/30" data-testid="home-period" data-period={summary.period}>
                  {translate(`day.${summary.period}`, language)}
                </Pill>
              )}
            </div>
          )}
        </div>
      </div>

      {summary && (
        <div className="flex flex-col gap-2 text-sm" data-testid="home-progress">
          {/* Now: done, doing (with the time left) or next */}
          {summary.status === 'no_tasks' ? (
            <p className="text-white/70 font-semibold">{translate('home.no_tasks', language)}</p>
          ) : isDone ? (
            <Line icon={STATUS_ICONS.done} tone={STATUS_TONES.done} testId="home-done" className="text-emerald-300 font-bold">
              {summary.completedAt ? `${translate('home.completed_at', language)} ${formatTime(summary.completedAt)}` : translate('home.completed', language)}
            </Line>
          ) : summary.doing.length > 0 ? (
            <Line icon={STATUS_ICONS.doing} tone={STATUS_TONES.doing} testId="home-doing" className="text-white/90 font-semibold">
              <span className="min-w-0 line-clamp-2">
                <span className="text-orange-300 font-bold">{translate('home.doing', language)}{sep}</span> {summary.doing.map(label).join(', ')}
              </span>
              {timer && (
                <span
                  data-testid="home-timer"
                  data-expired={timer.expired ? 'true' : undefined}
                  data-minutes={timer.minutesLeft}
                  className={cx(
                    'shrink-0 ml-auto px-2 py-0.5 rounded-full font-black tabular-nums',
                    timer.expired ? 'bg-rose-500 text-white' : timer.minutesLeft <= 5 ? 'bg-amber-400 text-amber-950' : 'bg-white/15 text-white'
                  )}
                >
                  {timer.expired
                    ? `${TIME_ICONS.timeUp} ${translate('timer.time_up', language)}`
                    : `${TIME_ICONS.timer} ${translate('timer.left', language, { minutes: timer.minutesLeft })}`}
                </span>
              )}
            </Line>
          ) : (
            summary.next && (
              <Line icon={STATUS_ICONS.todo} tone={STATUS_TONES.todo} testId="home-next" className="text-white/90 font-semibold">
                <span className="min-w-0 line-clamp-2">
                  <span className="text-yellow-300 font-bold">{translate('home.next', language)}{sep}</span> {label(summary.next)}
                </span>
              </Line>
            )
          )}

          {/* Reminders */}
          {!isDone && summary.late.length > 0 && (
            <Line icon={TIME_ICONS.due} tone="bg-rose-500 border-rose-400 animate-wiggle" testId="home-late" className="text-rose-300 font-bold">
              <span className="min-w-0 line-clamp-2">
                {translate('home.late', language)}{sep} {summary.late.map(label).join(', ')}
              </span>
            </Line>
          )}
          {!isDone && summary.upcoming && (
            <Line
              icon={summary.upcoming.kind === 'start' ? TIME_ICONS.start : TIME_ICONS.due}
              tone={summary.upcoming.kind === 'start' ? 'bg-sky-500/20 border-sky-500/40' : 'bg-amber-500/15 border-amber-500/30'}
              testId="home-upcoming"
              className="text-amber-200/90 font-semibold"
            >
              <span className="min-w-0 line-clamp-2">
                {translate(summary.upcoming.kind === 'start' ? 'home.starts_at' : 'home.due', language)} {summary.upcoming.time}
                {sep} {label(summary.upcoming.definitionId)}
              </span>
            </Line>
          )}

          {summary.total > 0 && (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={summary.total}
              aria-valuenow={summary.done}
              aria-label={`${summary.done}/${summary.total}`}
              className="mt-1 h-1.5 w-full rounded-full bg-black/30 overflow-hidden"
            >
              <div className={cx('h-full rounded-full transition-all duration-700', isDone ? 'bg-emerald-400' : theme.bar)} style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
      )}
    </button>
  );
};
