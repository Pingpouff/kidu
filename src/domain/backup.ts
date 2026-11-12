import { TROPHY_IDS, TrophyId, EarnedTrophy } from './trophies';
import { isBadgeId } from './badges';
import { isValidDueTime } from './reminders';
import { isValidDuration } from './timer';
import { isValidPeriod } from './calendar';
import {
  BehaviorCard,
  ChildProfile,
  TaskDefinition,
  ParentSettings,
  HistoryEntry,
  TaskCategory,
  TASK_CATEGORIES,
  OwnedBadge,
  ShopItem,
  FeedbackSettings,
  VISUALS_SETTINGS,
  VisualsSetting,
  EmotionLog,
  EmotionSettings,
  ChildEmotions,
  BodyZone,
  CalendarPeriod,
  TaskSchedule,
  TASK_SCHEDULES,
} from './models';

export const BACKUP_APP_ID = 'kidu';
/** 2: "Mes émotions" (settings.emotions, profile.emotions, emotionLogs). Version 1 files are still read. */
export const BACKUP_VERSION = 2;

export interface BackupData {
  settings: ParentSettings;
  tasks: TaskDefinition[];
  profiles: ChildProfile[];
  history?: HistoryEntry[];
  /** Emotion check-ins and calm corner sessions: exported with the history */
  emotionLogs?: EmotionLog[];
}

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  version: number;
  exportedAt: string; // ISO 8601
  data: BackupData;
}

export type BackupErrorCode =
  | 'invalid_json'
  | 'not_kidu_backup'
  | 'unsupported_version'
  | 'invalid_settings'
  | 'invalid_tasks'
  | 'invalid_profiles'
  | 'invalid_history'
  | 'invalid_emotions';

export class BackupError extends Error {
  constructor(public readonly code: BackupErrorCode) {
    super(`Invalid backup: ${code}`);
    this.name = 'BackupError';
  }
}

const PROFILE_COLORS: ChildProfile['color'][] = ['indigo', 'purple', 'rose', 'emerald', 'amber'];

/**
 * Builds a backup document from the current configuration.
 */
export function createBackup(
  data: BackupData,
  now: Date = new Date()
): BackupFile {
  const { settings, tasks, profiles, history, emotionLogs } = data;
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: {
      settings: {
        parentPin: settings.parentPin,
        language: settings.language,
        rewards: { ...settings.rewards },
        ...(settings.feedback ? { feedback: { ...settings.feedback } } : {}),
        ...(settings.shop ? { shop: settings.shop.map((i) => ({ ...i })) } : {}),
        ...(settings.reminders ? { reminders: { ...settings.reminders } } : {}),
        ...(settings.emotions
          ? { emotions: { ...settings.emotions, customStrategies: settings.emotions.customStrategies.map((c) => ({ ...c })) } }
          : {}),
        ...(settings.periods ? { periods: settings.periods.map((p) => ({ ...p })) } : {}),
      },
      tasks: [...tasks].sort((a, b) => a.order - b.order),
      profiles: [...profiles],
      ...(history ? { history: [...history] } : {}),
      ...(emotionLogs ? { emotionLogs: [...emotionLogs] } : {}),
    },
  };
}

/**
 * Suggested file name for a backup, e.g. "kidu-backup-2026-11-09.json".
 */
export function backupFileName(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `kidu-backup-${y}-${m}-${d}.json`;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function parseSettings(raw: unknown): ParentSettings {
  if (!isObject(raw) || !isObject(raw.rewards)) throw new BackupError('invalid_settings');
  const { parentPin, language, rewards, feedback, shop, reminders, emotions, periods } = raw;
  if (!isString(parentPin) || !/^\d{4}$/.test(parentPin)) throw new BackupError('invalid_settings');
  if (language !== 'fr' && language !== 'en') throw new BackupError('invalid_settings');
  if (!isNumber(rewards.starsPerCompletion) || !isNumber(rewards.weeklyGoal)) {
    throw new BackupError('invalid_settings');
  }
  if (rewards.starsPerMedal !== undefined && (!isNumber(rewards.starsPerMedal) || rewards.starsPerMedal < 1)) {
    throw new BackupError('invalid_settings');
  }
  if (
    feedback !== undefined &&
    (!isObject(feedback) ||
      typeof feedback.sounds !== 'boolean' ||
      typeof feedback.voice !== 'boolean' ||
      typeof feedback.songs !== 'boolean' ||
      !isNumber(feedback.volume) || feedback.volume < 0 || feedback.volume > 1 ||
      (feedback.animations !== 'full' && feedback.animations !== 'reduced') ||
      (feedback.visuals !== undefined && !VISUALS_SETTINGS.includes(feedback.visuals as VisualsSetting)))
  ) {
    throw new BackupError('invalid_settings');
  }
  if (shop !== undefined && !Array.isArray(shop)) throw new BackupError('invalid_settings');
  if (
    reminders !== undefined &&
    (!isObject(reminders) ||
      typeof reminders.enabled !== 'boolean' ||
      typeof reminders.systemNotifications !== 'boolean' ||
      !isNumber(reminders.repeatMinutes) || reminders.repeatMinutes < 1 ||
      !isNumber(reminders.maxReminders) || reminders.maxReminders < 1 ||
      (reminders.timerWarnings !== undefined &&
        (!Array.isArray(reminders.timerWarnings) || !reminders.timerWarnings.every((m) => Number.isInteger(m) && m > 0))))
  ) {
    throw new BackupError('invalid_settings');
  }
  const parsedEmotions = emotions === undefined ? undefined : parseEmotionSettings(emotions);
  if (periods !== undefined && !Array.isArray(periods)) throw new BackupError('invalid_settings');
  const parsedPeriods = periods?.map((p): CalendarPeriod => {
    if (
      !isObject(p) || !isString(p.id) ||
      !isValidPeriod(p as Pick<CalendarPeriod, 'kind' | 'from' | 'to'>) ||
      (p.childIds !== undefined && (!Array.isArray(p.childIds) || !p.childIds.every(isString)))
    ) {
      throw new BackupError('invalid_settings');
    }
    return {
      id: p.id,
      kind: p.kind as CalendarPeriod['kind'],
      from: p.from as string,
      to: p.to as string,
      ...(Array.isArray(p.childIds) && p.childIds.length > 0 ? { childIds: [...new Set(p.childIds as string[])] } : {}),
    };
  });
  const parsedShop = shop?.map((item): ShopItem => {
    if (!isObject(item) || !isString(item.id) || !isString(item.label) || !isString(item.icon) || !isNumber(item.cost) || item.cost < 1) {
      throw new BackupError('invalid_settings');
    }
    return { id: item.id, label: item.label, icon: item.icon, cost: item.cost };
  });
  return {
    parentPin,
    language,
    rewards: {
      starsPerCompletion: rewards.starsPerCompletion,
      weeklyGoal: rewards.weeklyGoal,
      ...(isNumber(rewards.starsPerMedal) ? { starsPerMedal: rewards.starsPerMedal } : {}),
    },
    ...(isObject(feedback)
      ? {
          feedback: {
            sounds: feedback.sounds as boolean,
            voice: feedback.voice as boolean,
            songs: feedback.songs as boolean,
            volume: feedback.volume as number,
            animations: feedback.animations as FeedbackSettings['animations'],
            ...(feedback.visuals !== undefined ? { visuals: feedback.visuals as VisualsSetting } : {}),
            ...(typeof feedback.haptics === 'boolean' ? { haptics: feedback.haptics } : {}),
          },
        }
      : {}),
    ...(parsedShop ? { shop: parsedShop } : {}),
    ...(isObject(reminders)
      ? {
          reminders: {
            enabled: reminders.enabled as boolean,
            repeatMinutes: reminders.repeatMinutes as number,
            maxReminders: reminders.maxReminders as number,
            systemNotifications: reminders.systemNotifications as boolean,
            ...(Array.isArray(reminders.timerWarnings) ? { timerWarnings: [...new Set(reminders.timerWarnings as number[])] } : {}),
          },
        }
      : {}),
    ...(parsedEmotions ? { emotions: parsedEmotions } : {}),
    ...(parsedPeriods ? { periods: parsedPeriods } : {}),
  };
}

function parseTasks(raw: unknown): TaskDefinition[] {
  if (!Array.isArray(raw)) throw new BackupError('invalid_tasks');
  const tasks = raw.map((t): TaskDefinition => {
    if (
      !isObject(t) ||
      !isString(t.id) || t.id === '' ||
      !isString(t.defaultLabel) ||
      !isString(t.icon) ||
      !isNumber(t.order) ||
      (t.labelKey !== undefined && !isString(t.labelKey)) ||
      (t.category !== undefined && !TASK_CATEGORIES.includes(t.category as TaskCategory)) ||
      (t.dueTime !== undefined && !isValidDueTime(t.dueTime)) ||
      (t.startTime !== undefined && !isValidDueTime(t.startTime)) ||
      (t.assignedTo !== undefined && (!Array.isArray(t.assignedTo) || !t.assignedTo.every(isString))) ||
      (t.days !== undefined && (!Array.isArray(t.days) || !t.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6))) ||
      (t.durationMinutes !== undefined && !isValidDuration(t.durationMinutes)) ||
      (t.schedule !== undefined && !TASK_SCHEDULES.includes(t.schedule as TaskSchedule))
    ) {
      throw new BackupError('invalid_tasks');
    }
    return {
      id: t.id,
      labelKey: isString(t.labelKey) ? t.labelKey : '',
      defaultLabel: t.defaultLabel,
      icon: t.icon,
      order: t.order,
      ...(isString(t.helperTextKey) ? { helperTextKey: t.helperTextKey } : {}),
      ...(t.category !== undefined ? { category: t.category as TaskCategory } : {}),
      ...(isValidDueTime(t.startTime) ? { startTime: t.startTime } : {}),
      ...(isValidDueTime(t.dueTime) ? { dueTime: t.dueTime } : {}),
      ...(Array.isArray(t.assignedTo) && t.assignedTo.length > 0 ? { assignedTo: [...new Set(t.assignedTo as string[])] } : {}),
      ...(Array.isArray(t.days) && t.days.length > 0 ? { days: [...new Set(t.days as number[])] } : {}),
      ...(isValidDuration(t.durationMinutes) ? { durationMinutes: t.durationMinutes } : {}),
      ...(t.schedule !== undefined ? { schedule: t.schedule as TaskSchedule } : {}),
    };
  });
  if (new Set(tasks.map((t) => t.id)).size !== tasks.length) throw new BackupError('invalid_tasks');
  return tasks;
}

function parseProfiles(raw: unknown): ChildProfile[] {
  if (!Array.isArray(raw)) throw new BackupError('invalid_profiles');
  const fail = (): never => {
    throw new BackupError('invalid_profiles');
  };
  const optionalNumber = (v: unknown) => (v === undefined || isNumber(v) ? (v as number | undefined) : fail());

  const profiles = raw.map((p): ChildProfile => {
    if (
      !isObject(p) ||
      !isString(p.id) || p.id === '' ||
      !isString(p.name) ||
      !isString(p.avatar) ||
      !PROFILE_COLORS.includes(p.color as ChildProfile['color']) ||
      !isNumber(p.stars)
    ) {
      return fail();
    }
    const age = optionalNumber(p.age);
    const starProgress = optionalNumber(p.starProgress);
    const medalCount = optionalNumber(p.medalCount);

    const trophies = p.trophies === undefined ? undefined : (Array.isArray(p.trophies) ? p.trophies : fail()).map(
      (m: unknown): EarnedTrophy =>
        isObject(m) && TROPHY_IDS.includes(m.id as TrophyId) && isNumber(m.earnedAt)
          ? { id: m.id as TrophyId, earnedAt: m.earnedAt }
          : fail()
    );
    const badgeOffers = p.badgeOffers === undefined ? undefined : (Array.isArray(p.badgeOffers) ? p.badgeOffers : fail()).map(
      (offer: unknown): string[] =>
        Array.isArray(offer) && offer.length > 0 && offer.every(isBadgeId) ? [...offer] : fail()
    );
    const badges = p.badges === undefined ? undefined : (Array.isArray(p.badges) ? p.badges : fail()).map(
      (b: unknown): OwnedBadge => {
        if (
          !isObject(b) || !isString(b.uid) || !isBadgeId(b.badgeId) || !isNumber(b.earnedAt) ||
          (b.spentAt !== undefined && !isNumber(b.spentAt)) ||
          (b.spentOn !== undefined && !isString(b.spentOn))
        ) {
          return fail();
        }
        return {
          uid: b.uid,
          badgeId: b.badgeId,
          earnedAt: b.earnedAt,
          ...(isNumber(b.spentAt) ? { spentAt: b.spentAt } : {}),
          ...(isString(b.spentOn) ? { spentOn: b.spentOn } : {}),
        };
      }
    );

    const emotions = p.emotions === undefined ? undefined : parseChildEmotions(p.emotions, fail);

    const cards = p.cards === undefined ? undefined : (Array.isArray(p.cards) ? p.cards : fail()).map(
      (c: unknown): BehaviorCard => {
        if (
          !isObject(c) || !isString(c.id) || (c.color !== 'green' && c.color !== 'yellow' && c.color !== 'red') ||
          !isString(c.date) || !isNumber(c.givenAt) ||
          (c.reason !== undefined && !isString(c.reason)) ||
          (c.lostProgress !== undefined && !isNumber(c.lostProgress))
        ) {
          return fail();
        }
        return {
          id: c.id,
          color: c.color,
          date: c.date,
          givenAt: c.givenAt,
          ...(isString(c.reason) ? { reason: c.reason } : {}),
          ...(c.fromYellows === true ? { fromYellows: true } : {}),
          ...(isNumber(c.lostProgress) ? { lostProgress: c.lostProgress } : {}),
          ...(c.gainedStar === true ? { gainedStar: true } : {}),
        };
      }
    );

    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color as ChildProfile['color'],
      stars: p.stars,
      ...(age !== undefined ? { age } : {}),
      ...(starProgress !== undefined ? { starProgress } : {}),
      ...(medalCount !== undefined ? { medalCount } : {}),
      ...(badgeOffers ? { badgeOffers } : {}),
      ...(badges ? { badges } : {}),
      ...(trophies ? { trophies } : {}),
      ...(cards ? { cards } : {}),
      ...(emotions ? { emotions } : {}),
    };
  });
  if (new Set(profiles.map((p) => p.id)).size !== profiles.length) throw new BackupError('invalid_profiles');
  return profiles;
}

function parseHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) throw new BackupError('invalid_history');
  return raw.map((h): HistoryEntry => {
    if (
      !isObject(h) ||
      !isString(h.id) ||
      !isString(h.date) ||
      !isString(h.childId) ||
      !isString(h.childName) ||
      !isNumber(h.totalTasks) ||
      !isNumber(h.completedTasks) ||
      typeof h.isCompleted !== 'boolean' ||
      (h.completedAt !== undefined && !isNumber(h.completedAt))
    ) {
      throw new BackupError('invalid_history');
    }
    return {
      id: h.id,
      date: h.date,
      childId: h.childId,
      childName: h.childName,
      totalTasks: h.totalTasks,
      completedTasks: h.completedTasks,
      isCompleted: h.isCompleted,
      ...(isNumber(h.completedAt) ? { completedAt: h.completedAt } : {}),
    };
  });
}

const EMOTION_LEVELS = [1, 2, 3];
const BODY_ZONES: BodyZone[] = ['head', 'throat', 'heart', 'belly', 'hands', 'legs'];
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);

function parseEmotionSettings(raw: unknown): EmotionSettings {
  if (
    !isObject(raw) ||
    typeof raw.enabled !== 'boolean' ||
    !isString(raw.adultName) ||
    typeof raw.eveningCheckIn !== 'boolean' ||
    !Array.isArray(raw.customStrategies)
  ) {
    throw new BackupError('invalid_settings');
  }
  return {
    enabled: raw.enabled,
    adultName: raw.adultName,
    eveningCheckIn: raw.eveningCheckIn,
    customStrategies: raw.customStrategies.map((c) => {
      if (!isObject(c) || !isString(c.id) || !isString(c.icon) || !isString(c.label)) throw new BackupError('invalid_settings');
      return { id: c.id, icon: c.icon, label: c.label };
    }),
  };
}

function parseChildEmotions(raw: unknown, fail: () => never): ChildEmotions {
  if (!isObject(raw) || !isStringArray(raw.helpful)) return fail();
  if (raw.level !== undefined && !EMOTION_LEVELS.includes(raw.level as number)) return fail();
  return {
    helpful: [...raw.helpful],
    ...(raw.level !== undefined ? { level: raw.level as ChildEmotions['level'] } : {}),
  };
}

function parseEmotionLogs(raw: unknown): EmotionLog[] {
  if (!Array.isArray(raw)) throw new BackupError('invalid_emotions');
  const fail = (): never => {
    throw new BackupError('invalid_emotions');
  };
  return raw.map((l): EmotionLog => {
    if (
      !isObject(l) || !isString(l.id) || !isNumber(l.at) || !isString(l.date) ||
      (l.kind !== 'checkin' && l.kind !== 'calm') ||
      (l.childId !== undefined && !isString(l.childId)) ||
      (l.emotionId !== undefined && !isString(l.emotionId)) ||
      (l.intensity !== undefined && ![1, 2, 3].includes(l.intensity as number)) ||
      (l.bodyZones !== undefined && !(Array.isArray(l.bodyZones) && l.bodyZones.every((z) => BODY_ZONES.includes(z as BodyZone)))) ||
      (l.strategyIds !== undefined && !isStringArray(l.strategyIds)) ||
      (l.breaths !== undefined && !isNumber(l.breaths)) ||
      (l.nextAction !== undefined && !isString(l.nextAction))
    ) {
      return fail();
    }
    return {
      id: l.id,
      at: l.at,
      date: l.date,
      kind: l.kind,
      ...(isString(l.childId) ? { childId: l.childId } : {}),
      ...(isString(l.emotionId) ? { emotionId: l.emotionId } : {}),
      ...(l.intensity !== undefined ? { intensity: l.intensity as EmotionLog['intensity'] } : {}),
      ...(l.bodyZones !== undefined ? { bodyZones: [...(l.bodyZones as BodyZone[])] } : {}),
      ...(l.strategyIds !== undefined ? { strategyIds: [...(l.strategyIds as string[])] } : {}),
      ...(isNumber(l.breaths) ? { breaths: l.breaths } : {}),
      ...(isString(l.nextAction) ? { nextAction: l.nextAction } : {}),
    };
  });
}

/**
 * Parses and validates the raw text of a backup file.
 * Throws a BackupError describing the first problem found.
 * Unknown fields are dropped so that only well-formed data reaches the database.
 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('invalid_json');
  }

  if (!isObject(raw) || raw.app !== BACKUP_APP_ID || !isObject(raw.data)) {
    throw new BackupError('not_kidu_backup');
  }
  if (!isNumber(raw.version) || raw.version > BACKUP_VERSION || raw.version < 1) {
    throw new BackupError('unsupported_version');
  }

  const data = raw.data;
  return {
    app: BACKUP_APP_ID,
    version: raw.version,
    exportedAt: isString(raw.exportedAt) ? raw.exportedAt : '',
    data: {
      settings: parseSettings(data.settings),
      tasks: parseTasks(data.tasks),
      profiles: parseProfiles(data.profiles),
      ...(data.history !== undefined ? { history: parseHistory(data.history) } : {}),
      ...(data.emotionLogs !== undefined ? { emotionLogs: parseEmotionLogs(data.emotionLogs) } : {}),
    },
  };
}

/** Remind parents to back up after this many days (or if they never did). */
export const BACKUP_REMINDER_DAYS = 30;
/** Below this many history days, there is little to lose: no reminder yet. */
export const BACKUP_REMINDER_MIN_HISTORY = 3;

/** True when the parent should be reminded to export a backup. */
export function isBackupDue(lastBackupAt: number | undefined, historyCount: number, now: number): boolean {
  if (historyCount < BACKUP_REMINDER_MIN_HISTORY) return false;
  return lastBackupAt === undefined || now - lastBackupAt > BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}
