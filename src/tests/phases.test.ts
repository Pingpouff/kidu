import { describe, it, expect } from 'vitest';
import { TaskDefinition } from '../domain/models';
import {
  initSession,
  moveTask,
  sortDefinitions,
  getTaskCategory,
  getRoutinePhases,
  getCurrentPhaseIndex,
  syncSessionWithDefinitions,
} from '../domain/routine';
import { createBackup, parseBackup } from '../domain/backup';

// Deliberately out of order: phase order must win over the `order` field
const definitions: TaskDefinition[] = [
  { id: 'teeth', labelKey: 'task.teeth', defaultLabel: 'Teeth', icon: '🪥', order: 1, category: 'bedtime' },
  { id: 'legacy', labelKey: '', defaultLabel: 'Legacy task', icon: '🧸', order: 2 },
  { id: 'table', labelKey: 'task.set_table', defaultLabel: 'Table', icon: '🍴', order: 3, category: 'meal' },
  { id: 'homework', labelKey: 'task.homework', defaultLabel: 'Homework', icon: '✏️', order: 5, category: 'after_school' },
  { id: 'snack', labelKey: 'task.snack', defaultLabel: 'Snack', icon: '🍎', order: 4, category: 'after_school' },
];

const taskId = (defId: string) => `leo_${defId}_2026-11-09`;

describe('Routine phases', () => {
  it('treats tasks without a category as bedtime tasks', () => {
    expect(getTaskCategory(definitions[1])).toBe('bedtime');
    expect(getTaskCategory(undefined)).toBe('bedtime');
  });

  it('sorts definitions by phase, then by order inside the phase', () => {
    expect(sortDefinitions(definitions).map((d) => d.id)).toEqual([
      'snack', 'homework', 'table', 'teeth', 'legacy',
    ]);
  });

  it('creates sessions with tasks in phase order', () => {
    const session = initSession('leo', '2026-11-09', definitions);
    expect(session.tasks.map((t) => t.definitionId)).toEqual([
      'snack', 'homework', 'table', 'teeth', 'legacy',
    ]);
  });

  it('splits a session into non-empty phases', () => {
    const session = initSession('leo', '2026-11-09', definitions);
    const phases = getRoutinePhases(session, definitions);

    expect(phases.map((p) => p.category)).toEqual(['after_school', 'meal', 'bedtime']);
    expect(phases.map((p) => p.tasks.length)).toEqual([2, 1, 2]);
    expect(phases.every((p) => !p.isCompleted)).toBe(true);
  });

  it('puts the morning phase first', () => {
    const withMorning: TaskDefinition[] = [
      ...definitions,
      { id: 'breakfast', labelKey: 'task.breakfast', defaultLabel: 'Breakfast', icon: '🥣', order: 9, category: 'morning' },
    ];
    const session = initSession('leo', '2026-11-09', withMorning);
    expect(session.tasks[0].definitionId).toBe('breakfast');
    const phases = getRoutinePhases(session, withMorning);
    expect(phases.map((p) => p.category)).toEqual(['morning', 'after_school', 'meal', 'bedtime']);
    expect(phases[getCurrentPhaseIndex(phases)].category).toBe('morning');
  });

  it('skips phases that have no task', () => {
    const bedtimeOnly = definitions.filter((d) => getTaskCategory(d) === 'bedtime');
    const session = initSession('leo', '2026-11-09', bedtimeOnly);
    expect(getRoutinePhases(session, bedtimeOnly).map((p) => p.category)).toEqual(['bedtime']);
  });

  it('moves to the next phase once the current one is done', () => {
    let session = initSession('leo', '2026-11-09', definitions);
    expect(getCurrentPhaseIndex(getRoutinePhases(session, definitions))).toBe(0);

    session = moveTask(session, taskId('snack'), 'done');
    expect(getCurrentPhaseIndex(getRoutinePhases(session, definitions))).toBe(0);

    session = moveTask(session, taskId('homework'), 'done');
    const phases = getRoutinePhases(session, definitions);
    expect(phases[0].isCompleted).toBe(true);
    expect(getCurrentPhaseIndex(phases)).toBe(1);
  });

  it('stays on the last phase when the whole routine is done', () => {
    let session = initSession('leo', '2026-11-09', definitions);
    for (const t of session.tasks) {
      session = moveTask(session, t.id, 'done');
    }
    expect(getCurrentPhaseIndex(getRoutinePhases(session, definitions))).toBe(2);
  });

  it('returns -1 when there is no task at all', () => {
    expect(getCurrentPhaseIndex([])).toBe(-1);
  });

  it('reorders session tasks when a task changes phase', () => {
    const session = initSession('leo', '2026-11-09', definitions);
    const moved = definitions.map((d) => (d.id === 'teeth' ? { ...d, category: 'after_school' as const } : d));
    const synced = syncSessionWithDefinitions(session, moved);
    expect(synced.tasks.map((t) => t.definitionId)).toEqual([
      'teeth', 'snack', 'homework', 'table', 'legacy',
    ]);
  });

  it('keeps categories through a backup round-trip and rejects unknown ones', () => {
    const backup = createBackup({
      settings: { parentPin: '1234', language: 'fr', rewards: { starsPerCompletion: 1, weeklyGoal: 5 } },
      tasks: definitions,
      profiles: [],
    });
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.data.tasks.find((t) => t.id === 'table')?.category).toBe('meal');
    expect(parsed.data.tasks.find((t) => t.id === 'legacy')).not.toHaveProperty('category');

    const invalid = {
      ...backup,
      data: { ...backup.data, tasks: [{ ...definitions[0], category: 'nap' }] },
    };
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow();
  });
});
