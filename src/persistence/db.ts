import Dexie, { type Table } from 'dexie';
import { ChildProfile, TaskDefinition, RoutineSession, HistoryEntry, ParentSettings } from '../domain/models';

export class RoutineDatabase extends Dexie {
  profiles!: Table<ChildProfile, string>;
  tasks!: Table<TaskDefinition, string>;
  sessions!: Table<RoutineSession, string>;
  history!: Table<HistoryEntry, string>;
  settings!: Table<ParentSettings, string>;

  constructor() {
    super('ChildrenEveningRoutineDB');
    this.version(1).stores({
      profiles: 'id, name',
      tasks: 'id, order',
      sessions: 'id, childId, date, isCompleted',
      history: 'id, date, childId',
      settings: 'id'
    });
  }
}

export const db = new RoutineDatabase();

// Default task definitions to seed
export const defaultTasks: TaskDefinition[] = [
  { id: 'toys', labelKey: 'task.toys', defaultLabel: 'Put toys away', icon: '🧸', order: 1 },
  { id: 'pajamas', labelKey: 'task.pajamas', defaultLabel: 'Put pajamas on', icon: '👕', order: 2 },
  { id: 'toilet', labelKey: 'task.toilet', defaultLabel: 'Go to the toilet', icon: '🚽', order: 3 },
  { id: 'teeth', labelKey: 'task.teeth', defaultLabel: 'Brush teeth', icon: '🪥', order: 4 },
  { id: 'choose_story', labelKey: 'task.choose_story', defaultLabel: 'Choose bedtime story', icon: '📚', order: 5 },
  { id: 'read_story', labelKey: 'task.read_story', defaultLabel: 'Read story', icon: '📖', order: 6 },
  { id: 'cuddle', labelKey: 'task.cuddle', defaultLabel: 'Cuddle / calm time', icon: '🫂', order: 7 },
  { id: 'lights_off', labelKey: 'task.lights_off', defaultLabel: 'Lights off', icon: '🌙', order: 8 },
];

// Default parent settings
export const defaultSettings: ParentSettings = {
  parentPin: '1234',
  language: 'fr',
  rewards: {
    starsPerCompletion: 1,
    weeklyGoal: 5,
  },
};

/**
 * Initializes and seeds the database with default data if empty.
 */
export async function seedDatabase() {
  // 1. Settings seeding
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.put({ ...defaultSettings, id: 'current' } as any);
  }

  // 2. Tasks seeding
  const tasksCount = await db.tasks.count();
  if (tasksCount === 0) {
    await db.tasks.bulkPut(defaultTasks);
  }

  // 3. Profiles seeding
  const profilesCount = await db.profiles.count();
  if (profilesCount === 0) {
    const seedProfiles: ChildProfile[] = [
      {
        id: 'leo',
        name: 'Léo',
        avatar: '🦊',
        color: 'indigo',
        age: 5,
        stars: 3,
      },
      {
        id: 'emma',
        name: 'Emma',
        avatar: '🐼',
        color: 'rose',
        age: 3,
        stars: 4,
      },
    ];
    await db.profiles.bulkPut(seedProfiles);
  }
}

/**
 * Helper to fetch settings safely with fallback.
 */
export async function getSettings(): Promise<ParentSettings> {
  const s = await db.settings.get('current');
  return s || defaultSettings;
}

/**
 * Helper to save settings.
 */
export async function saveSettings(settings: ParentSettings) {
  await db.settings.put({ ...settings, id: 'current' } as any);
}
