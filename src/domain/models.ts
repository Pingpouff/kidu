export type TaskStatus = 'todo' | 'doing' | 'done';

export interface ChildProfile {
  id: string;
  name: string;
  avatar: string; // Emoji character or icon name, e.g. "🦊", "🐼", "🦁"
  color: 'indigo' | 'purple' | 'rose' | 'emerald' | 'amber'; // Custom themes
  age?: number;
  stars: number; // Cumulative star balance
}

export interface TaskDefinition {
  id: string;
  labelKey: string;     // Translation key, e.g. "task.brush_teeth"
  defaultLabel: string; // Fallback English label
  icon: string;         // Emoji character, e.g. "🪥", "🧸", "📚"
  helperTextKey?: string; // Optional simple description key
  order: number;
}

export interface RoutineTask {
  id: string;
  definitionId: string;
  status: TaskStatus;
  completedAt?: number; // Epoch timestamp
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
  starsPerCompletion: number; // e.g. 1
  weeklyGoal: number; // e.g. 5 stars
}

export interface ParentSettings {
  parentPin: string; // 4-digit code, default "1234"
  language: 'fr' | 'en';
  rewards: RewardSettings;
}
