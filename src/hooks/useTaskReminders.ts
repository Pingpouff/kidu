import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../persistence/db';
import { ChildProfile, DEFAULT_REMINDERS, ParentSettings, TaskDefinition } from '../domain/models';
import {
  OverdueTask,
  ReminderContext,
  ReminderLog,
  findOverdueTasks,
  findReminderTasks,
  isMuted,
  planReminders,
  pruneReminderLog,
} from '../domain/reminders';
import { ReminderQueue } from '../services/ReminderQueue';
import { reminderService } from '../services/ReminderService';
import { showSystemNotification } from '../services/notifications';
import { Language, taskLabel, translate } from '../i18n/dictionary';

export interface ReminderAnnouncement {
  childId: string;
  taskKeys: string[];
  tasks: OverdueTask[];
}

const TICK_MS = 30_000;
const MIN_BANNER_MS = 5_000;
const LOG_STORAGE_KEY = 'kidu.reminderLog';
const SNOOZE_STORAGE_KEY = 'kidu.reminderSnooze';
/** "Later": a child's reminders wait this long (like an Android notification's snooze) */
export const SNOOZE_MINUTES = 10;

/** Until when each child's reminders are snoozed (epoch per child id). */
type SnoozeMap = Record<string, number>;
const loadSnooze = (): SnoozeMap => {
  try {
    return JSON.parse(localStorage.getItem(SNOOZE_STORAGE_KEY) ?? '{}') as SnoozeMap;
  } catch {
    return {};
  }
};
const saveSnooze = (snooze: SnoozeMap) => {
  try {
    localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(snooze));
  } catch {
    /* storage unavailable: the snooze lasts for this session */
  }
};

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

const joinLabels = (labels: string[], language: Language) =>
  labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(', ')} ${translate('list.and', language)} ${labels[labels.length - 1]}`;

/** Timed tasks in a reminder: about to run out (with the minutes left) or run out. */
export interface TimerLabels {
  warnings: { label: string; minutes: number }[];
  timeUp: string[];
}

/**
 * Sentence spoken / shown for a child's reminder: late tasks (`labels`),
 * tasks whose start time has come (`startLabels`) and timed tasks (`timers`).
 */
export function reminderText(
  childName: string,
  labels: string[],
  language: Language,
  startLabels: string[] = [],
  timers: TimerLabels = { warnings: [], timeUp: [] }
): string {
  const fr = language === 'fr';
  const parts: string[] = [];
  if (labels.length > 0) {
    const list = joinLabels(labels, language);
    if (fr) {
      parts.push(labels.length === 1 ? `c'est l'heure : ${list} !` : `il reste ${labels.length} tâches en retard : ${list}.`);
    } else {
      parts.push(labels.length === 1 ? `it's time: ${list}!` : `${labels.length} tasks are late: ${list}.`);
    }
  }
  if (startLabels.length > 0) {
    const list = joinLabels(startLabels, language);
    const prefix = labels.length > 0 ? (fr ? 'Et ' : 'And ') : '';
    parts.push(fr ? `${prefix}c'est le moment de commencer : ${list} !` : `${prefix}time to start: ${list}!`);
  }
  // Sentences after the first one start with a capital letter
  const add = (text: string) => parts.push(parts.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text);
  for (const { label, minutes } of timers.warnings) {
    add(translate(minutes === 1 ? 'reminders.spoken_warning_one' : 'reminders.spoken_warning', language, { minutes, task: label }));
  }
  if (timers.timeUp.length > 0) {
    add(translate('reminders.spoken_time_up', language, { task: joinLabels(timers.timeUp, language) }));
  }
  // "Léo, c'est l'heure…" — the first part follows the name in lower case
  return `${childName}, ${parts.join(' ')}`;
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
  const [snoozed, setSnoozed] = useState<SnoozeMap>(loadSnooze);
  const snoozedRef = useRef(snoozed);
  snoozedRef.current = snoozed;
  const isSnoozed = (childId: string, at: number) => (snoozedRef.current[childId] ?? 0) > at;
  const reminderSettings = { ...DEFAULT_REMINDERS, ...settings?.reminders };

  const sessions = useLiveQuery(() => db.sessions.where('date').equals(today).toArray(), [today]);
  // Rest days (no reminder), holidays (no school tasks) and "minutes left" warnings
  const contextKey = JSON.stringify({
    periods: settings?.periods ?? [],
    timerWarnings: reminderSettings.timerWarnings,
    muted: settings?.mutedReminders,
  });
  const context = useMemo((): ReminderContext => JSON.parse(contextKey), [contextKey]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // Everything to announce (late, time to start, timed tasks)
  const toAnnounce = useMemo(
    () => (profiles && tasks && sessions ? findReminderTasks(now, today, profiles, sessions, tasks, context) : []),
    [now, today, profiles, tasks, sessions, context]
  );
  // Late tasks (for badges): past their end time, or their time allowed has run out
  const overdue = useMemo(() => {
    const late = profiles && tasks && sessions ? findOverdueTasks(now, today, profiles, sessions, tasks, context) : [];
    const seen = new Set(late.map((t) => `${t.childId}_${t.definitionId}`));
    const timeUp = toAnnounce.filter((t) => t.kind === 'timeup' && !seen.has(`${t.childId}_${t.definitionId}`));
    return [...late, ...timeUp];
  }, [now, today, profiles, tasks, sessions, context, toAnnounce]);

  // Latest values for the queue callbacks (which outlive renders)
  const latest = useRef({ language, profiles, tasks, notify: reminderSettings.systemNotifications, context });
  latest.current = { language, profiles, tasks, notify: reminderSettings.systemNotifications, context };

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
        if (isSnoozed(announcement.childId, Date.now())) return null;
        const stillLate = findReminderTasks(Date.now(), today, allProfiles, todaySessions, definitions, latest.current.context)
          .filter((t) => announcement.taskKeys.includes(t.key));
        return stillLate.length > 0
          ? { childId: announcement.childId, tasks: stillLate, taskKeys: stillLate.map((t) => t.key) }
          : null;
      },
      play: async (announcement) => {
        const { language: lang, profiles: kids, tasks: defs, notify } = latest.current;
        const child = kids?.find((p) => p.id === announcement.childId);
        const labelOf = (definitionId: string) => taskLabel(defs?.find((d) => d.id === definitionId), lang);
        const ofKind = (kind: string) => announcement.tasks.filter((t) => (t.kind ?? 'late') === kind);
        const late = ofKind('late').map((t) => labelOf(t.definitionId));
        const toStart = ofKind('start').map((t) => labelOf(t.definitionId));
        const text = reminderText(child?.name ?? '', late, lang, toStart, {
          warnings: ofKind('warning').map((t) => ({ label: labelOf(t.definitionId), minutes: t.minutesLeft ?? 0 })),
          timeUp: ofKind('timeup').map((t) => labelOf(t.definitionId)),
        });
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
    // Snoozed children wait: their reminders are planned again once the snooze is over
    const due = toAnnounce.filter((t) => !isSnoozed(t.childId, now));
    const { batches, log } = planReminders(due, pruneReminderLog(logRef.current, today), now, JSON.parse(settingsKey));
    logRef.current = log;
    if (batches.length > 0) saveLog(log);
    for (const batch of batches) {
      queueRef.current?.enqueue({ childId: batch.childId, tasks: batch.tasks, taskKeys: batch.tasks.map((t) => t.key) });
    }
  }, [toAnnounce, now, today, settingsKey, paused, snoozed]);

  // The clock ticks every 30 s: wake up right when a snooze ends
  useEffect(() => {
    const ends = Object.values(snoozed).filter((until) => until > Date.now());
    if (ends.length === 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(...ends) - Date.now() + 50);
    return () => window.clearTimeout(timer);
  }, [snoozed]);

  // A parent stopped this child's reminders: the announcement on screen stops now
  useEffect(() => {
    if (current && isMuted(context.muted, today, current.childId)) {
      reminderService.stopSpeaking();
      setCurrent(null);
    }
  }, [current, context, today]);

  return {
    current,
    overdue,
    /** Hides the announcement and stops its voice (like swiping a notification away) */
    dismissCurrent: () => {
      reminderService.stopSpeaking();
      setCurrent(null);
    },
    /** "Later": this child's reminders wait SNOOZE_MINUTES */
    snooze: (childId: string, minutes = SNOOZE_MINUTES) => {
      reminderService.stopSpeaking();
      setCurrent((c) => (c?.childId === childId ? null : c));
      const next = { ...Object.fromEntries(Object.entries(snoozedRef.current).filter(([, until]) => until > Date.now())), [childId]: Date.now() + minutes * 60_000 };
      snoozedRef.current = next;
      saveSnooze(next);
      setSnoozed(next);
    },
  };
}
