import { ChildProfile, TaskDefinition, ParentSettings, HistoryEntry } from './models';

export const BACKUP_APP_ID = 'kidu';
export const BACKUP_VERSION = 1;

export interface BackupData {
  settings: ParentSettings;
  tasks: TaskDefinition[];
  profiles: ChildProfile[];
  history?: HistoryEntry[];
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
  | 'invalid_history';

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
  const { settings, tasks, profiles, history } = data;
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: {
      settings: {
        parentPin: settings.parentPin,
        language: settings.language,
        rewards: { ...settings.rewards },
      },
      tasks: [...tasks].sort((a, b) => a.order - b.order),
      profiles: [...profiles],
      ...(history ? { history: [...history] } : {}),
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
  const { parentPin, language, rewards } = raw;
  if (!isString(parentPin) || !/^\d{4}$/.test(parentPin)) throw new BackupError('invalid_settings');
  if (language !== 'fr' && language !== 'en') throw new BackupError('invalid_settings');
  if (!isNumber(rewards.starsPerCompletion) || !isNumber(rewards.weeklyGoal)) {
    throw new BackupError('invalid_settings');
  }
  return {
    parentPin,
    language,
    rewards: {
      starsPerCompletion: rewards.starsPerCompletion,
      weeklyGoal: rewards.weeklyGoal,
    },
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
      (t.labelKey !== undefined && !isString(t.labelKey))
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
    };
  });
  if (new Set(tasks.map((t) => t.id)).size !== tasks.length) throw new BackupError('invalid_tasks');
  return tasks;
}

function parseProfiles(raw: unknown): ChildProfile[] {
  if (!Array.isArray(raw)) throw new BackupError('invalid_profiles');
  const profiles = raw.map((p): ChildProfile => {
    if (
      !isObject(p) ||
      !isString(p.id) || p.id === '' ||
      !isString(p.name) ||
      !isString(p.avatar) ||
      !PROFILE_COLORS.includes(p.color as ChildProfile['color']) ||
      !isNumber(p.stars) ||
      (p.age !== undefined && !isNumber(p.age))
    ) {
      throw new BackupError('invalid_profiles');
    }
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color as ChildProfile['color'],
      stars: p.stars,
      ...(isNumber(p.age) ? { age: p.age } : {}),
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
    },
  };
}
