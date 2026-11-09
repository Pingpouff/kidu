import { describe, it, expect } from 'vitest';
import { ChildProfile, TaskDefinition, ParentSettings, HistoryEntry } from '../domain/models';
import { createBackup, parseBackup, backupFileName, BackupError, BACKUP_VERSION } from '../domain/backup';

const settings: ParentSettings = {
  id: 'current',
  parentPin: '4321',
  language: 'en',
  rewards: { starsPerCompletion: 2, weeklyGoal: 7 },
};

const tasks: TaskDefinition[] = [
  { id: 'teeth', labelKey: 'task.teeth', defaultLabel: 'Teeth', icon: '🪥', order: 2 },
  { id: 'toys', labelKey: 'task.toys', defaultLabel: 'Toys', icon: '🧸', order: 1 },
];

const profiles: ChildProfile[] = [
  { id: 'leo', name: 'Léo', avatar: '🦊', color: 'indigo', age: 5, stars: 3 },
];

const history: HistoryEntry[] = [
  {
    id: '2026-11-08_leo',
    date: '2026-11-08',
    childId: 'leo',
    childName: 'Léo',
    totalTasks: 2,
    completedTasks: 2,
    isCompleted: true,
    completedAt: 1762628400000,
  },
];

const errorCode = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    return err instanceof BackupError ? err.code : 'unexpected';
  }
  return 'no_error';
};

describe('Configuration backup', () => {
  it('creates a backup with sorted tasks and without the settings id', () => {
    const backup = createBackup({ settings, tasks, profiles }, new Date('2026-11-09T10:00:00Z'));

    expect(backup.app).toBe('kidu');
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.exportedAt).toBe('2026-11-09T10:00:00.000Z');
    expect(backup.data.tasks.map((t) => t.id)).toEqual(['toys', 'teeth']);
    expect(backup.data.settings).not.toHaveProperty('id');
    expect(backup.data).not.toHaveProperty('history');
  });

  it('round-trips through JSON, including history', () => {
    const backup = createBackup({ settings, tasks, profiles, history });
    const parsed = parseBackup(JSON.stringify(backup));

    expect(parsed).toEqual(backup);
  });

  it('builds a dated file name', () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe('kidu-backup-2026-01-05.json');
  });

  it('rejects malformed JSON and foreign files', () => {
    expect(errorCode(() => parseBackup('{not json'))).toBe('invalid_json');
    expect(errorCode(() => parseBackup('{"foo": 1}'))).toBe('not_kidu_backup');
    expect(errorCode(() => parseBackup('[]'))).toBe('not_kidu_backup');
  });

  it('rejects backups from a newer version', () => {
    const backup = { ...createBackup({ settings, tasks, profiles }), version: BACKUP_VERSION + 1 };
    expect(errorCode(() => parseBackup(JSON.stringify(backup)))).toBe('unsupported_version');
  });

  it('rejects invalid settings, tasks, profiles and history', () => {
    const base = createBackup({ settings, tasks, profiles, history });
    const withData = (data: object) => JSON.stringify({ ...base, data: { ...base.data, ...data } });

    expect(errorCode(() => parseBackup(withData({ settings: { ...base.data.settings, parentPin: '12' } })))).toBe('invalid_settings');
    expect(errorCode(() => parseBackup(withData({ tasks: [{ id: 'x' }] })))).toBe('invalid_tasks');
    expect(errorCode(() => parseBackup(withData({ tasks: [tasks[0], tasks[0]] })))).toBe('invalid_tasks');
    expect(errorCode(() => parseBackup(withData({ profiles: [{ ...profiles[0], color: 'black' }] })))).toBe('invalid_profiles');
    expect(errorCode(() => parseBackup(withData({ history: 'nope' })))).toBe('invalid_history');
  });

  it('drops unknown fields', () => {
    const base = createBackup({ settings, tasks, profiles });
    const polluted = {
      ...base,
      data: { ...base.data, profiles: [{ ...profiles[0], isAdmin: true }] },
    };
    const parsed = parseBackup(JSON.stringify(polluted));
    expect(parsed.data.profiles[0]).not.toHaveProperty('isAdmin');
  });
});
