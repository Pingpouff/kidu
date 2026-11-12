import type { EarnedTrophy } from './trophies';

export type TaskStatus = 'todo' | 'doing' | 'done';

export interface ChildProfile {
  id: string;
  name: string;
  avatar: string; // Emoji character or icon name, e.g. "🦊", "🐼", "🦁"
  color: 'indigo' | 'purple' | 'rose' | 'emerald' | 'amber'; // Custom themes
  age?: number;
  stars: number; // Total stars ever earned (one per completed task)
  starProgress?: number; // Stars collected toward the next medal (0 .. starsPerMedal - 1)
  medalCount?: number; // Total medals ever earned
  badgeOffers?: string[][]; // Medals waiting for the child to pick a badge (3 badge ids each)
  badges?: OwnedBadge[]; // Piggy bank + album
  trophies?: EarnedTrophy[]; // Unlocked trophies, never removed
  cards?: BehaviorCard[]; // Yellow / red cards given by a parent (whole history)
  emotions?: ChildEmotions; // "Mes émotions": age level override and the strategies that help
}

/* ------------------------------ Mes émotions ------------------------------ */

/** 1: 3-5 years (6 emotions), 2: 6-8 (12), 3: 9-11 (24). See features/emotions/domain/level.ts */
export type EmotionLevel = 1 | 2 | 3;

/** A child's emotion settings, kept on the profile (and in backups). */
export interface ChildEmotions {
  level?: EmotionLevel; // missing = from the child's age
  helpful: string[]; // strategy ids the child marked "ça m'aide", most recent first
}

/** Where the child feels the emotion (check-in, optional step). */
export type BodyZone = 'head' | 'throat' | 'heart' | 'belly' | 'hands' | 'legs';

/**
 * One moment of the emotions space: a check-in ("Météo intérieure") or a
 * calm corner session. No free text: nothing the child would not want a
 * parent to read. No reward is ever attached to it.
 */
export interface EmotionLog {
  id: string;
  childId?: string; // missing: calm corner opened from the home screen
  at: number; // epoch
  date: string; // YYYY-MM-DD (local)
  kind: 'checkin' | 'calm';
  emotionId?: string; // check-in
  intensity?: 1 | 2 | 3; // check-in, from level 2
  bodyZones?: BodyZone[]; // check-in
  strategyIds?: string[]; // strategies chosen afterwards
  breaths?: number; // calm corner: breaths completed
  nextAction?: string; // calm corner: "adult" or a strategy id chosen at the end
}

/** A strategy added by the parent ("aller voir le chat"). */
export interface CustomStrategy {
  id: string;
  icon: string;
  label: string;
}

export interface EmotionSettings {
  enabled: boolean;
  /** Who the child goes to after the calm corner ("Papa ou Maman") */
  adultName: string;
  /** Offer the check-in when the bedtime step is done */
  eveningCheckIn: boolean;
  customStrategies: CustomStrategy[];
}


export type CardColor = 'green' | 'yellow' | 'red';

/**
 * A card given by a parent. Green: a "well done" for a kind or brave gesture,
 * worth one star toward the next medal (`gainedStar`). Yellow / red: for
 * inappropriate behavior. Cards count per evening (`date`): a second yellow
 * the same evening becomes a red. A red card resets the stars collected toward
 * the next medal (`lostProgress` keeps them so a card given by mistake can be
 * withdrawn).
 */
export interface BehaviorCard {
  id: string;
  color: CardColor;
  date: string; // YYYY-MM-DD evening it counts for
  givenAt: number; // epoch
  reason?: string;
  /** Red card triggered automatically by a second yellow */
  fromYellows?: boolean;
  /** Stars toward the next medal taken away by this red card */
  lostProgress?: number;
  /** Green card: the star it gave (taken back if the card is withdrawn) */
  gainedStar?: boolean;
}

/**
 * A medal won by a child (its motif is called a "badge" in the data, for
 * backward compatibility: children only ever see medals). Unspent ones are
 * in the piggy bank; spent ones stay in the album as a souvenir.
 */
export interface OwnedBadge {
  uid: string;
  badgeId: string; // see domain/badges.ts
  earnedAt: number;
  spentAt?: number;
  spentOn?: string; // Label of the shop reward it was exchanged for
}

/**
 * A real-life reward defined by the parent, bought with badges.
 */
export interface ShopItem {
  id: string;
  label: string;
  icon: string;
  cost: number; // in badges
}

/**
 * Routine phases, in the order the child goes through them.
 */
export const TASK_CATEGORIES = ['morning', 'after_school', 'meal', 'bedtime'] as const;
export type TaskCategory = typeof TASK_CATEGORIES[number];

export const CATEGORY_ICONS: Record<TaskCategory, string> = {
  morning: '☀️',
  after_school: '🎒',
  meal: '🍽️',
  bedtime: '🌙',
};

export interface TaskDefinition {
  id: string;
  labelKey: string;     // Translation key, e.g. "task.brush_teeth"
  defaultLabel: string; // Fallback English label
  icon: string;         // Emoji character, e.g. "🪥", "🧸", "📚"
  helperTextKey?: string; // Optional simple description key
  order: number;
  category?: TaskCategory; // Missing on tasks created before categories existed: treated as 'bedtime'
  startTime?: string; // "HH:MM" local time the task is expected to start; one "time to start" reminder if not started
  dueTime?: string; // "HH:MM" expected end time; reminders start when the task isn't done by then
  assignedTo?: string[]; // Child ids. Missing or empty = common task, done by every child
  days?: number[]; // Days of the week (0 = Sunday … 6 = Saturday). Missing or empty = every day
  durationMinutes?: number; // Time allowed once the child starts the task ("doing"); warnings before it runs out
  schedule?: TaskSchedule; // School days only / holidays only. Missing = always
}

/** When a task is planned: on school days, during holidays, or always (missing). */
export type TaskSchedule = 'school' | 'holidays';
export const TASK_SCHEDULES: TaskSchedule[] = ['school', 'holidays'];

/**
 * A period set by a parent (from → to, both included, YYYY-MM-DD), for every
 * child or some of them. `holidays`: no school, the holiday routine applies.
 * `off`: a rest day (sick, outing…): no school either, no reminders, and the
 * day doesn't break a streak.
 */
export interface CalendarPeriod {
  id: string;
  kind: 'holidays' | 'off';
  from: string;
  to: string;
  childIds?: string[]; // missing or empty = every child
}

export interface RoutineTask {
  id: string;
  definitionId: string;
  status: TaskStatus;
  completedAt?: number; // Epoch timestamp
  startedAt?: number; // Epoch the task was moved to "doing" (timed tasks count from it)
  rewarded?: boolean; // Star already given for this task today (no farming by undo/redo)
}

export interface RoutineSession {
  id: string;
  childId: string;
  date: string; // YYYY-MM-DD
  tasks: RoutineTask[];
  isCompleted: boolean; // every step done or skipped, at least one done (isSessionCompleted)
  completedAt?: number; // Epoch timestamp
  skippedPhases?: TaskCategory[]; // steps a parent skipped today (PIN), e.g. a missed morning
}

export interface HistoryEntry {
  id: string; // YYYY-MM-DD_childId
  date: string; // YYYY-MM-DD
  childId: string;
  childName: string;
  totalTasks: number;
  completedTasks: number;
  isCompleted: boolean;
  completedAt?: number;
}

export interface RewardSettings {
  starsPerCompletion: number; // Legacy (stars used to be given per routine), unused
  weeklyGoal: number; // Legacy, unused
  starsPerMedal?: number; // Stars needed for a medal, default 3
}

/**
 * What the app is allowed to play/show; parents can tone it down.
 */
export interface FeedbackSettings {
  sounds: boolean; // Short chimes and jingles
  voice: boolean; // Spoken encouragements and announcements
  songs: boolean; // Longer songs (bedtime song)
  volume: number; // 0 .. 1
  animations: 'full' | 'reduced'; // reduced: no confetti, particles or spinning rays
  /** Visual effects: 'lite' drops blur and looping animations (weak devices); 'auto' detects it. Missing = 'auto' */
  visuals?: VisualsSetting;
}

export type VisualsSetting = 'auto' | 'rich' | 'lite';
export const VISUALS_SETTINGS: VisualsSetting[] = ['auto', 'rich', 'lite'];

/**
 * Reminders for tasks that are not done by their due time.
 */
export interface ReminderSettings {
  enabled: boolean;
  repeatMinutes: number; // Delay between two reminders for the same task
  maxReminders: number; // Total reminders per task and per day
  systemNotifications: boolean; // Also show an OS notification when the app is in the background
  /** Timed tasks: warn when this many minutes are left (e.g. [10, 5]). Missing = DEFAULT_TIMER_WARNINGS */
  timerWarnings?: number[];
}

export const DEFAULT_TIMER_WARNINGS = [10, 5];
/** Choices offered in Settings for the "minutes left" warnings */
export const TIMER_WARNING_CHOICES = [15, 10, 5, 2, 1];

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: true,
  repeatMinutes: 5,
  maxReminders: 3,
  systemNotifications: false,
  timerWarnings: DEFAULT_TIMER_WARNINGS,
};

/** Default emotions settings; `adultName` empty = the translated default ("Papa ou Maman"). */
export const DEFAULT_EMOTIONS: EmotionSettings = {
  enabled: true,
  adultName: '',
  eveningCheckIn: true,
  customStrategies: [],
};

export const DEFAULT_FEEDBACK: FeedbackSettings = {
  sounds: true,
  voice: true,
  songs: true,
  volume: 0.7,
  animations: 'full',
  visuals: 'auto',
};

export interface ParentSettings {
  id?: 'current';
  parentPin: string; // 4-digit code, default "1234"
  language: 'fr' | 'en';
  rewards: RewardSettings;
  feedback?: FeedbackSettings; // default: DEFAULT_FEEDBACK
  shop?: ShopItem[]; // Real-life rewards bought with badges
  reminders?: ReminderSettings; // default: DEFAULT_REMINDERS
  lastBackupAt?: number; // epoch of the last export (not part of backup files)
  emotions?: EmotionSettings; // default: DEFAULT_EMOTIONS
  periods?: CalendarPeriod[]; // Holidays and rest days
  mutedReminders?: MutedReminders; // Reminders stopped for tonight (not part of backup files)
}

/**
 * Reminders a parent stopped for the rest of the day ("they're in bed, they
 * won't do it anymore"). Only counts on `date`: the next day starts normally.
 */
export interface MutedReminders {
  date: string; // YYYY-MM-DD
  childIds?: string[]; // missing = every child
}
