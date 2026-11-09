import Dexie, { type Table } from 'dexie';
import { ChildProfile, TaskDefinition, RoutineSession, HistoryEntry, ParentSettings, DEFAULT_FEEDBACK } from '../domain/models';
import { DEFAULT_STARS_PER_MEDAL, defaultShop } from '../domain/rewards';

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
  // After school
  { id: 'unpack_bag', labelKey: 'task.unpack_bag', defaultLabel: 'Empty school bag', icon: '🎒', order: 1, category: 'after_school' },
  { id: 'snack', labelKey: 'task.snack', defaultLabel: 'Afternoon snack', icon: '🍎', order: 2, category: 'after_school' },
  // Example of a personal task: only Léo (5) has homework, not Emma (3)
  { id: 'homework', labelKey: 'task.homework', defaultLabel: 'Homework', icon: '✏️', order: 3, category: 'after_school', assignedTo: ['leo'] },
  { id: 'bath', labelKey: 'task.bath', defaultLabel: 'Take a bath', icon: '🛁', order: 4, category: 'after_school' },
  // Meal
  { id: 'wash_hands', labelKey: 'task.wash_hands', defaultLabel: 'Wash hands', icon: '🧼', order: 5, category: 'meal' },
  { id: 'set_table', labelKey: 'task.set_table', defaultLabel: 'Set the table', icon: '🍴', order: 6, category: 'meal' },
  { id: 'clear_plate', labelKey: 'task.clear_plate', defaultLabel: 'Clear your plate', icon: '🍽️', order: 7, category: 'meal' },
  // Bedtime
  { id: 'toys', labelKey: 'task.toys', defaultLabel: 'Put toys away', icon: '🧸', order: 8, category: 'bedtime' },
  { id: 'pajamas', labelKey: 'task.pajamas', defaultLabel: 'Put pajamas on', icon: '👕', order: 9, category: 'bedtime' },
  { id: 'toilet', labelKey: 'task.toilet', defaultLabel: 'Go to the toilet', icon: '🚽', order: 10, category: 'bedtime' },
  { id: 'teeth', labelKey: 'task.teeth', defaultLabel: 'Brush teeth', icon: '🪥', order: 11, category: 'bedtime' },
  { id: 'choose_story', labelKey: 'task.choose_story', defaultLabel: 'Choose bedtime story', icon: '📚', order: 12, category: 'bedtime' },
  { id: 'read_story', labelKey: 'task.read_story', defaultLabel: 'Read story', icon: '📖', order: 13, category: 'bedtime' },
  { id: 'cuddle', labelKey: 'task.cuddle', defaultLabel: 'Cuddle / calm time', icon: '🫂', order: 14, category: 'bedtime' },
  { id: 'lights_off', labelKey: 'task.lights_off', defaultLabel: 'Lights off', icon: '🌙', order: 15, category: 'bedtime' },
];

// Default parent settings
export const defaultSettings: ParentSettings = {
  parentPin: '1234',
  language: 'fr',
  rewards: {
    starsPerCompletion: 1,
    weeklyGoal: 5,
    starsPerMedal: DEFAULT_STARS_PER_MEDAL,
  },
  feedback: { ...DEFAULT_FEEDBACK },
  shop: defaultShop('fr'),
};

/**
 * Initializes and seeds the database with default data if empty.
 */
export async function seedDatabase() {
  // 1. Settings seeding
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.put({ ...defaultSettings, id: 'current' });
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
  await db.settings.put({ ...settings, id: 'current' });
}
