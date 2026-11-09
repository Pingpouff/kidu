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
}

/**
 * A badge won by a child. Unspent badges are in the piggy bank;
 * spent ones stay in the album as a souvenir.
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
export const TASK_CATEGORIES = ['after_school', 'meal', 'bedtime'] as const;
export type TaskCategory = typeof TASK_CATEGORIES[number];

export const CATEGORY_ICONS: Record<TaskCategory, string> = {
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
}

export interface RoutineTask {
  id: string;
  definitionId: string;
  status: TaskStatus;
  completedAt?: number; // Epoch timestamp
  rewarded?: boolean; // Star already given for this task today (no farming by undo/redo)
}

export interface RoutineSession {
  id: string;
  childId: string;
  date: string; // YYYY-MM-DD
  tasks: RoutineTask[];
  isCompleted: boolean;
  completedAt?: number; // Epoch timestamp
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
}

export const DEFAULT_FEEDBACK: FeedbackSettings = {
  sounds: true,
  voice: true,
  songs: true,
  volume: 0.7,
  animations: 'full',
};

export interface ParentSettings {
  id?: 'current';
  parentPin: string; // 4-digit code, default "1234"
  language: 'fr' | 'en';
  rewards: RewardSettings;
  feedback?: FeedbackSettings; // default: DEFAULT_FEEDBACK
  shop?: ShopItem[]; // Real-life rewards bought with badges
}
