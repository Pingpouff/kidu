import React from 'react';
import { ChildProfile, TaskDefinition } from '../../domain/models';
import { Language, taskLabel, translate } from '../../i18n/dictionary';
import { ReminderAnnouncement } from '../../hooks/useTaskReminders';

interface ReminderBannerProps {
  announcement: ReminderAnnouncement;
  profile: ChildProfile | undefined;
  definitions: TaskDefinition[];
  language: Language;
  onDismiss: () => void;
}

/**
 * Banner shown while a reminder is being announced, above every screen.
 */
export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  announcement,
  profile,
  definitions,
  language,
  onDismiss,
}) => (
  <div className="fixed top-3 inset-x-0 z-[95] flex justify-center px-4 pointer-events-none">
    <button
      role="alert"
      data-testid="reminder-banner"
      onClick={onDismiss}
      className="pointer-events-auto max-w-xl w-full flex items-start gap-4 p-4 rounded-3xl bg-amber-500/95 text-amber-950 shadow-2xl shadow-amber-900/40 border-2 border-amber-200 text-left animate-fade-up [animation-delay:0s]"
    >
      <span className="text-5xl animate-wiggle inline-block">⏰</span>
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="font-black text-lg md:text-xl">
          {profile ? `${profile.avatar} ${profile.name}` : ''} — {translate('reminders.time_for', language)}
        </span>
        {announcement.tasks.map((task) => {
          const def = definitions.find((d) => d.id === task.definitionId);
          return (
            <span key={task.key} className="flex items-center gap-2 font-bold text-base md:text-lg">
              <span className="text-2xl">{def?.icon}</span>
              <span className="truncate">{taskLabel(def, language)}</span>
              <span className="ml-auto shrink-0 text-sm font-black bg-amber-950/15 rounded-full px-2 py-0.5" data-testid={`reminder-${task.kind ?? 'late'}`}>
                {task.kind === 'start' ? `🚀 ${translate('reminders.start', language)} ${task.dueTime}` : `⏰ ${task.dueTime}`}
              </span>
            </span>
          );
        })}
      </span>
    </button>
  </div>
);
