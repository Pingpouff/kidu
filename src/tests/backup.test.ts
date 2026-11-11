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

  it('keeps the display setting (lite / rich / auto) and rejects unknown values', () => {
    const feedback = { sounds: true, voice: false, songs: true, volume: 0.5, animations: 'full' as const };
    const withVisuals = createBackup({ settings: { ...settings, feedback: { ...feedback, visuals: 'lite' } }, tasks, profiles });
    expect(parseBackup(JSON.stringify(withVisuals)).data.settings.feedback?.visuals).toBe('lite');

    // Backups made before the setting existed stay valid
    const older = createBackup({ settings: { ...settings, feedback }, tasks, profiles });
    expect(parseBackup(JSON.stringify(older)).data.settings.feedback).not.toHaveProperty('visuals');

    const invalid = createBackup({ settings: { ...settings, feedback: { ...feedback, visuals: 'fancy' as 'lite' } }, tasks, profiles });
    expect(errorCode(() => parseBackup(JSON.stringify(invalid)))).toBe('invalid_settings');
  });

  it('keeps "Mes émotions": settings, the child toolbox and the emotion logs (version 2)', () => {
    const withEmotions = createBackup({
      settings: { ...settings, emotions: { enabled: true, adultName: 'Maman', eveningCheckIn: false, customStrategies: [{ id: 'cat', icon: '🐈', label: 'Voir le chat' }] } },
      tasks,
      profiles: [{ ...profiles[0], emotions: { level: 1, helpful: ['draw'] } }],
      history,
      emotionLogs: [
        { id: 'e1', at: 1, date: '2026-11-11', kind: 'calm', breaths: 4, nextAction: 'adult' },
        { id: 'e2', at: 2, date: '2026-11-11', kind: 'checkin', childId: 'leo', emotionId: 'anger', intensity: 3, bodyZones: ['hands'], strategyIds: ['jumps'] },
      ],
    });
    expect(withEmotions.version).toBe(2);
    expect(parseBackup(JSON.stringify(withEmotions))).toEqual(withEmotions);
  });

  it('still reads version 1 backups', () => {
    const v1 = { ...createBackup({ settings, tasks, profiles }), version: 1 };
    const parsed = parseBackup(JSON.stringify(v1));
    expect(parsed.version).toBe(1);
    expect(parsed.data.profiles[0].name).toBe('Léo');
    expect(parsed.data).not.toHaveProperty('emotionLogs');
  });

  it('rejects malformed emotion data', () => {
    const base = createBackup({ settings, tasks, profiles });
    const withData = (data: object) => JSON.stringify({ ...base, data: { ...base.data, ...data } });
    expect(errorCode(() => parseBackup(withData({ emotionLogs: [{ id: 'x', at: 1, date: 'd', kind: 'party' }] })))).toBe('invalid_emotions');
    expect(errorCode(() => parseBackup(withData({ emotionLogs: [{ id: 'x', at: 1, date: 'd', kind: 'checkin', bodyZones: ['tail'] }] })))).toBe('invalid_emotions');
    expect(errorCode(() => parseBackup(withData({ profiles: [{ ...profiles[0], emotions: { level: 7, helpful: [] } }] })))).toBe('invalid_profiles');
    expect(errorCode(() => parseBackup(withData({ settings: { ...base.data.settings, emotions: { enabled: 'yes' } } })))).toBe('invalid_settings');
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
