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
    // v2: the morning phase was added. Existing installs get the default
    // morning tasks once, unless they already have morning tasks.
    this.version(2).stores({}).upgrade(async (tx) => {
      const tasks = tx.table<TaskDefinition, string>('tasks');
      if ((await tasks.count()) === 0) return; // fresh install: seedDatabase handles it
      const hasMorning = (await tasks.toArray()).some((t) => t.category === 'morning');
      if (!hasMorning) {
        await tasks.bulkPut(defaultTasks.filter((t) => t.category === 'morning'));
      }
    });
  }
}

export const db = new RoutineDatabase();

// Default task definitions to seed
export const defaultTasks: TaskDefinition[] = [
  // Morning: getting ready for school
  { id: 'make_bed', labelKey: 'task.make_bed', defaultLabel: 'Make your bed', icon: '🛏️', order: 1, category: 'morning' },
  { id: 'get_dressed', labelKey: 'task.get_dressed', defaultLabel: 'Get dressed', icon: '👖', order: 2, category: 'morning' },
  { id: 'breakfast', labelKey: 'task.breakfast', defaultLabel: 'Have breakfast', icon: '🥣', order: 3, category: 'morning' },
  { id: 'teeth_morning', labelKey: 'task.teeth', defaultLabel: 'Brush teeth', icon: '🪥', order: 4, category: 'morning' },
  { id: 'comb_hair', labelKey: 'task.comb_hair', defaultLabel: 'Comb your hair', icon: '💇', order: 5, category: 'morning' },
  { id: 'shoes_coat', labelKey: 'task.shoes_coat', defaultLabel: 'Put on shoes and coat', icon: '🧥', order: 6, category: 'morning' },
  // After school
  { id: 'unpack_bag', labelKey: 'task.unpack_bag', defaultLabel: 'Empty school bag', icon: '🎒', order: 1, category: 'after_school' },
  { id: 'put_away_shoes', labelKey: 'task.put_away_shoes', defaultLabel: 'Put away shoes and coat', icon: '👟', order: 2, category: 'after_school' },
  { id: 'snack', labelKey: 'task.snack', defaultLabel: 'Afternoon snack', icon: '🍎', order: 3, category: 'after_school' },
  // Example of a personal task: only Léo (5) has homework, not Emma (3)
  { id: 'homework', labelKey: 'task.homework', defaultLabel: 'Homework', icon: '✏️', order: 4, category: 'after_school', assignedTo: ['leo'] },
  { id: 'bath', labelKey: 'task.bath', defaultLabel: 'Take a bath', icon: '🛁', order: 5, category: 'after_school' },
  { id: 'prepare_bag', labelKey: 'task.prepare_bag', defaultLabel: 'Pack school bag for tomorrow', icon: '🖍️', order: 6, category: 'after_school' },
  // Meal
  { id: 'wash_hands', labelKey: 'task.wash_hands', defaultLabel: 'Wash hands', icon: '🧼', order: 1, category: 'meal' },
  { id: 'set_table', labelKey: 'task.set_table', defaultLabel: 'Set the table', icon: '🍴', order: 2, category: 'meal' },
  { id: 'clear_plate', labelKey: 'task.clear_plate', defaultLabel: 'Clear your plate', icon: '🍽️', order: 3, category: 'meal' },
  // Bedtime
  { id: 'toys', labelKey: 'task.toys', defaultLabel: 'Put toys away', icon: '🧸', order: 1, category: 'bedtime' },
  { id: 'lay_out_clothes', labelKey: 'task.lay_out_clothes', defaultLabel: 'Lay out clothes for tomorrow', icon: '👗', order: 2, category: 'bedtime' },
  { id: 'pajamas', labelKey: 'task.pajamas', defaultLabel: 'Put pajamas on', icon: '👕', order: 3, category: 'bedtime' },
  { id: 'toilet', labelKey: 'task.toilet', defaultLabel: 'Go to the toilet', icon: '🚽', order: 4, category: 'bedtime' },
  { id: 'teeth', labelKey: 'task.teeth', defaultLabel: 'Brush teeth', icon: '🪥', order: 5, category: 'bedtime' },
  { id: 'choose_story', labelKey: 'task.choose_story', defaultLabel: 'Choose bedtime story', icon: '📚', order: 6, category: 'bedtime' },
  { id: 'read_story', labelKey: 'task.read_story', defaultLabel: 'Read story', icon: '📖', order: 7, category: 'bedtime' },
  { id: 'cuddle', labelKey: 'task.cuddle', defaultLabel: 'Cuddle / calm time', icon: '🫂', order: 8, category: 'bedtime' },
  { id: 'lights_off', labelKey: 'task.lights_off', defaultLabel: 'Lights off', icon: '🌙', order: 9, category: 'bedtime' },
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
