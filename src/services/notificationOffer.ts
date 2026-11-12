import { DEFAULT_REMINDERS, ParentSettings, TaskDefinition } from '../domain/models';
import { notificationStatus } from './notifications';

const DISMISSED_KEY = 'kidu.notificationOfferDismissed';

const dismissed = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

/** The offer was answered ("Turn on" or "Not now"): it won't come back (best effort). */
export function rememberNotificationOffer() {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    /* storage unavailable: the offer may come back */
  }
}

/**
 * Asking for the notification permission when it becomes useful (Android
 * guideline), not up front: the first time a parent saves a task with a start
 * time, an end time or a duration, while system notifications are still off
 * and the browser can still ask (not refused, supported).
 */
export function shouldOfferNotifications(task: Partial<TaskDefinition>, settings: ParentSettings): boolean {
  const timed = !!(task.startTime || task.dueTime || task.durationMinutes);
  const reminders = { ...DEFAULT_REMINDERS, ...settings.reminders };
  const status = notificationStatus();
  return timed && reminders.enabled && !reminders.systemNotifications && (status === 'default' || status === 'granted') && !dismissed();
}
