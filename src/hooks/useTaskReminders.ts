import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../persistence/db';
import { ChildProfile, DEFAULT_REMINDERS, ParentSettings, TaskDefinition } from '../domain/models';
import {
  OverdueTask,
  ReminderLog,
  findOverdueTasks,
  planReminders,
  pruneReminderLog,
} from '../domain/reminders';
import { ReminderQueue } from '../services/ReminderQueue';
import { reminderService } from '../services/ReminderService';
import { showSystemNotification } from '../services/notifications';
import { Language, taskLabel } from '../i18n/dictionary';

export interface ReminderAnnouncement {
  childId: string;
  taskKeys: string[];
  tasks: OverdueTask[];
}

const TICK_MS = 30_000;
const MIN_BANNER_MS = 5_000;
const LOG_STORAGE_KEY = 'kidu.reminderLog';

// The log only avoids repeating reminders after a reload: losing it is harmless
const loadLog = (): ReminderLog => {
  try {
    return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) ?? '{}') as ReminderLog;
  } catch {
    return {};
  }
};
const saveLog = (log: ReminderLog) => {
  try {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(log));
  } catch {
    /* storage unavailable: reminders still work for this session */
  }
};

/** Sentence spoken / shown for a child's overdue tasks. */
export function reminderText(childName: string, labels: string[], language: Language): string {
  const list =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} ${language === 'fr' ? 'et' : 'and'} ${labels[labels.length - 1]}`;
  if (language === 'fr') {
    return labels.length === 1
      ? `${childName}, c'est l'heure : ${list} !`
      : `${childName}, il reste ${labels.length} tâches en retard : ${list}.`;
  }
  return labels.length === 1
    ? `${childName}, it's time: ${list}!`
    : `${childName}, ${labels.length} tasks are late: ${list}.`;
}

/**
 * Watches due times, queues reminders for late tasks and plays them one at a time.
 * Returns the announcement currently shown and all overdue tasks (for badges).
 */
export function useTaskReminders({
  settings,
  profiles,
  tasks,
  today,
  language,
  paused = false,
}: {
  settings: ParentSettings | undefined;
  profiles: ChildProfile[] | undefined;
  tasks: TaskDefinition[] | undefined;
  today: string;
  language: Language;
  /** While paused (e.g. Parent Mode), nothing is announced; reminders resume afterwards */
  paused?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [current, setCurrent] = useState<ReminderAnnouncement | null>(null);
  const logRef = useRef<ReminderLog>(pruneReminderLog(loadLog(), today));
  const reminderSettings = { ...DEFAULT_REMINDERS, ...settings?.reminders };

  const sessions = useLiveQuery(() => db.sessions.where('date').equals(today).toArray(), [today]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const overdue = useMemo(
    () => (profiles && tasks && sessions ? findOverdueTasks(now, today, profiles, sessions, tasks) : []),
    [now, today, profiles, tasks, sessions]
  );

  // Latest values for the queue callbacks (which outlive renders)
  const latest = useRef({ language, profiles, tasks, notify: reminderSettings.systemNotifications });
  latest.current = { language, profiles, tasks, notify: reminderSettings.systemNotifications };

  const queueRef = useRef<ReminderQueue<ReminderAnnouncement> | null>(null);
  if (!queueRef.current) {
    queueRef.current = new ReminderQueue<ReminderAnnouncement>({
      merge: (a, b) => {
        const tasksByKey = new Map([...a.tasks, ...b.tasks].map((t) => [t.key, t]));
        const merged = [...tasksByKey.values()].sort((x, y) => x.dueAt - y.dueAt);
        return { childId: a.childId, tasks: merged, taskKeys: merged.map((t) => t.key) };
      },
      // Re-read the database: skip tasks done (or removed) while waiting in the queue
      revalidate: async (announcement) => {
        const [allProfiles, definitions, todaySessions] = await Promise.all([
          db.profiles.toArray(),
          db.tasks.toArray(),
          db.sessions.where('date').equals(today).toArray(),
        ]);
        const stillLate = findOverdueTasks(Date.now(), today, allProfiles, todaySessions, definitions)
          .filter((t) => announcement.taskKeys.includes(t.key));
        return stillLate.length > 0
          ? { childId: announcement.childId, tasks: stillLate, taskKeys: stillLate.map((t) => t.key) }
          : null;
      },
      play: async (announcement) => {
        const { language: lang, profiles: kids, tasks: defs, notify } = latest.current;
        const child = kids?.find((p) => p.id === announcement.childId);
        const labels = announcement.tasks.map((t) => taskLabel(defs?.find((d) => d.id === t.definitionId), lang));
        const text = reminderText(child?.name ?? '', labels, lang);
        const shownAt = Date.now();

        if (notify && typeof document !== 'undefined' && document.hidden) {
          void showSystemNotification(`⏰ ${child?.avatar ?? ''} ${child?.name ?? ''}`.trim(), {
            body: text,
            tag: `kidu-${announcement.childId}`,
          });
        }

        reminderService.playReminderSound();
        await new Promise((resolve) => setTimeout(resolve, 900));
        await reminderService.speakAndWait(text, lang);
        // Keep the banner readable even without voice
        const remaining = MIN_BANNER_MS - (Date.now() - shownAt);
        if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      },
      onCurrentChange: setCurrent,
    });
  }

  useEffect(() => {
    queueRef.current?.resume();
    return () => queueRef.current?.stop();
  }, []);

  // Plan reminders each time the overdue list or the clock changes
  const settingsKey = JSON.stringify(reminderSettings);
  useEffect(() => {
    if (paused) {
      queueRef.current?.clear();
      return;
    }
    const { batches, log } = planReminders(overdue, pruneReminderLog(logRef.current, today), now, JSON.parse(settingsKey));
    logRef.current = log;
    if (batches.length > 0) saveLog(log);
    for (const batch of batches) {
      queueRef.current?.enqueue({ childId: batch.childId, tasks: batch.tasks, taskKeys: batch.tasks.map((t) => t.key) });
    }
  }, [overdue, now, today, settingsKey, paused]);

  return {
    current,
    overdue,
    dismissCurrent: () => setCurrent(null),
  };
}
