import React from 'react';
import { X } from 'lucide-react';
import { ChildProfile, TaskDefinition } from '../../domain/models';
import { Language, taskLabel, translate } from '../../i18n/dictionary';
import { ReminderAnnouncement, SNOOZE_MINUTES } from '../../hooks/useTaskReminders';
import { useSwipeDismiss } from '../../ui/useSwipeDismiss';
import { mergeHandlers } from '../../ui/mergeHandlers';

interface ReminderBannerProps {
  announcement: ReminderAnnouncement;
  profile: ChildProfile | undefined;
  definitions: TaskDefinition[];
  language: Language;
  /** Hides it and stops the voice (swipe, ✕, tap) */
  onDismiss: () => void;
  /** "Later": this child's reminders wait a few minutes */
  onSnooze?: () => void;
  /** A parent stops this child's reminders for tonight (PIN asked by the caller) */
  onMute?: () => void;
}

const ACTION =
  'min-h-[40px] flex items-center gap-1.5 px-3 rounded-full text-sm font-black hover:bg-amber-950/15 active:bg-amber-950/25 transition-colors';

/**
 * Shown while a reminder is announced, above every screen. Works like an
 * Android heads-up notification: swipe it sideways or tap ✕ to dismiss (the
 * voice stops too), "Later" snoozes this child's reminders, and a parent can
 * stop them for tonight.
 */
export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  announcement,
  profile,
  definitions,
  language,
  onDismiss,
  onSnooze,
  onMute,
}) => {
  const swipe = useSwipeDismiss(onDismiss);
  return (
    <div className="fixed top-3 inset-x-0 z-banner flex justify-center px-4 pointer-events-none">
      <div
        role="alert"
        data-testid="reminder-banner"
        {...mergeHandlers(swipe.handlers)}
        style={swipe.style}
        className="pointer-events-auto max-w-xl w-full flex flex-col rounded-3xl bg-amber-500 text-amber-950 shadow-2xl shadow-amber-900/40 border-2 border-amber-200 animate-fade-up [animation-delay:0s] overflow-hidden select-none"
      >
        <div className="flex items-start">
          <button type="button" onClick={onDismiss} className="flex-1 min-w-0 flex items-start gap-3 sm:gap-4 p-3 sm:p-4 pr-1 pb-2 text-left">
            <span className="text-3xl sm:text-5xl animate-wiggle inline-block" aria-hidden="true">
              ⏰
            </span>
            <span className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="font-black text-base sm:text-lg md:text-xl">
                {profile ? `${profile.avatar} ${profile.name}` : ''} — {translate('reminders.time_for', language)}
              </span>
              {announcement.tasks.map((task) => {
                const def = definitions.find((d) => d.id === task.definitionId);
                return (
                  <span key={task.key} className="flex items-center gap-2 font-bold text-sm sm:text-base md:text-lg">
                    <span className="text-xl sm:text-2xl">{def?.icon}</span>
                    <span className="truncate">{taskLabel(def, language)}</span>
                    <span className="ml-auto shrink-0 text-sm font-black bg-amber-950/15 rounded-full px-2 py-0.5" data-testid={`reminder-${task.kind ?? 'late'}`}>
                      {task.kind === 'start'
                        ? `🚀 ${translate('reminders.start', language)} ${task.dueTime}`
                        : task.kind === 'warning'
                          ? `⏳ ${translate('reminders.minutes_left', language, { minutes: task.minutesLeft ?? 0 })}`
                          : task.kind === 'timeup'
                            ? `⌛ ${translate('reminders.time_up', language)}`
                            : `⏰ ${task.dueTime}`}
                    </span>
                  </span>
                );
              })}
            </span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={translate('btn.close', language)}
            data-testid="reminder-close"
            className="shrink-0 m-2 w-11 h-11 rounded-full flex items-center justify-center hover:bg-amber-950/15 active:bg-amber-950/25"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {(onSnooze || onMute) && (
          <div className="flex flex-wrap justify-end gap-1 px-3 pb-2.5 pt-1 border-t border-amber-950/10">
            {onSnooze && (
              <button type="button" onClick={onSnooze} data-testid="reminder-snooze" className={ACTION}>
                🕙 {translate('reminders.snooze', language, { minutes: SNOOZE_MINUTES })}
              </button>
            )}
            {onMute && (
              <button type="button" onClick={onMute} data-testid="reminder-mute" className={ACTION}>
                🔕 {translate('reminders.mute_tonight', language)}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
