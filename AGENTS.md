# Developer & AI Agent Documentation (AGENTS.md)

This documentation helps developers and agentic AI systems understand the codebase structure, state management, database schema, and audio synthesis systems.

---

## File Structure

```
├── README.md               # User-facing manual
├── AGENTS.md               # Architecture documentation (This file)
├── package.json            # Scripts & project dependencies
├── tailwind.config.js      # Custom theme presets and animation tokens
├── vite.config.ts          # Vite build config with vite-plugin-pwa
├── index.html              # Entry HTML configured for PWA capabilities
└── src/
    ├── main.tsx            # Main application mounting and SW registration
    ├── App.tsx             # Main client router, DB bindings, and state
    ├── index.css           # Glassmorphism utilities and global styling
    ├── domain/
    │   ├── models.ts       # Type interfaces for data structures
    │   ├── routine.ts      # Pure business rules (stateless)
    │   ├── rewards.ts      # Stars → medals → badge offers, piggy bank & shop rules
    │   ├── badges.ts       # Badge catalog (universes) and offer drawing
    │   ├── summary.ts      # Selection screen overview: per-child summary, upcoming deadlines
    │   ├── treasure.ts     # "My treasure" view model: items, collections, stats, rank
    │   ├── trophies.ts     # Milestone trophies computed from sessions
    │   ├── reminders.ts    # Overdue detection and reminder planning (pure)
    │   └── backup.ts       # Backup file format, creation and validation
    ├── persistence/
    │   ├── db.ts           # IndexedDB configuration and Dexie schema
    │   └── routineRepository.ts # Persistence and domain coordinator
    ├── services/
    │   ├── ReminderService.ts # Synthesized sounds, voice, bedtime song (respects feedback settings)
    │   ├── effects.ts      # Confetti / rich-motion helpers (respects reduced animations)
    │   └── ReminderQueue.ts # Serial queue of reminder announcements
    ├── hooks/
    │   └── useTaskReminders.ts # Clock + overdue detection + queue wiring
    ├── i18n/
    │   └── dictionary.ts   # Translations dictionary
    ├── components/
    │   ├── child-board/    # Kid-facing board components
    │   ├── parent-mode/    # Parent settings dashboard components
    │   └── rewards/        # Fanfare and confetti celebrations
    └── tests/
        ├── domain.test.ts  # Vitest unit test suite
        └── backup.test.ts  # Backup format tests
```

---

## Database Schemas

We use **IndexedDB** via `dexie` for fully client-side, offline-first persistence. The database is initialized as `ChildrenEveningRoutineDB`.

### Tables & Indices

1. **`profiles`**
   - Schema: `&id, name, color`
   - Data Shape:
     ```typescript
     interface ChildProfile {
       id: string;
       name: string;
       avatar: string;
       color: 'indigo' | 'purple' | 'rose' | 'emerald' | 'amber';
       age?: number;
       stars: number;
     }
     ```

2. **`tasks`**
   - Schema: `&id, order`
   - Data Shape:
     ```typescript
     interface TaskDefinition {
       id: string;
       labelKey?: string; // Dictionary key (e.g. 'task.teeth')
       defaultLabel: string; // Fallback label
       icon: string; // Emoji character
       order: number; // Sorting order inside its phase
       category?: 'after_school' | 'meal' | 'bedtime'; // Routine phase, missing = 'bedtime'
       startTime?: string; // "HH:MM" expected start, one "time to start" reminder
       dueTime?: string; // "HH:MM" expected end, reminders when late
       assignedTo?: string[]; // child ids, missing/empty = common to every child
     }
     ```

3. **`sessions`**
   - Schema: `&id, [childId+date]`
   - Data Shape:
     ```typescript
     interface RoutineSession {
       id: string; // composite format: YYYY-MM-DD_childId
       childId: string;
       date: string; // format YYYY-MM-DD
       tasks: RoutineTask[];
       isCompleted: boolean;
       completedAt?: number; // epoch
     }
     ```

4. **`history`**
   - Schema: `&id, childId, date`
   - Data Shape:
     ```typescript
     interface HistoryEntry {
       id: string;
       childId: string;
       childName: string;
       date: string;
       totalTasks: number;
       completedTasks: number;
       isCompleted: boolean;
       completedAt?: number;
     }
     ```

5. **`settings`**
   - Schema: `&id`
   - Data Shape:
     ```typescript
     interface ParentSettings {
       id: 'current';
       parentPin: string; // 4 digits
       language: 'fr' | 'en';
       rewards: {
         starsPerCompletion: number;
         weeklyGoal: number;
       };
     }
     ```

---

## Routine Phases

Tasks belong to one of three fixed phases, run in order: `after_school` → `meal` → `bedtime` (`TASK_CATEGORIES` in `domain/models.ts`).

- `sortDefinitions` orders tasks by phase, then by `order`; sessions are built and synced with it.
- `getRoutinePhases(session, definitions)` returns the non-empty phases; `getCurrentPhaseIndex` returns the first one not completed.
- The child board only shows the current phase's tasks, with a step indicator, a "step complete" banner/sound/voice when a phase ends, and a night-sky overlay during `bedtime`. Overall progress and the final celebration still cover the whole routine.
- In Parent Mode, tasks are grouped by phase and can only be reordered inside their phase. The phase is chosen when creating or editing a task.

---

## Personal Tasks

- `TaskDefinition.assignedTo` lists the children a task belongs to; missing or empty means every child. `isTaskForChild` / `definitionsForChild` (`domain/routine.ts`) are the single source of truth.
- `initSession` and `syncSessionWithDefinitions` only keep the child's tasks, so changing an assignment updates today's sessions (statuses of remaining tasks are kept). `findOverdueTasks` skips children a task is not assigned to.
- `routineRepository.deleteProfile` removes the child from assignments and deletes the tasks that were assigned only to them (`unassignChild`).
- In Parent Mode, `AssigneePicker` (TaskManager) toggles "Every child" or specific children; selecting all children goes back to a common task. Backups keep `assignedTo`.

## Selection Screen Overview

`domain/summary.ts`: `childSummary` (status, done/total, current phase, doing/next task, late tasks, next due time, stars to the next medal, piggy bank badges, pending badge choices, live streak) and `upcomingDeadlines` (next due times grouped by task, children listed together). A child without a session today is previewed with `initSession`. `ProfileSelector` re-renders every 30 s and gets all sessions from `App.tsx`.

## Rewards

All rules are pure functions in `domain/rewards.ts`, persisted by `routineRepository.saveSessionWithRewards` in a single transaction.

- **Stars**: one per task the first time it reaches `done` on a given day. `RoutineTask.rewarded` marks it; the flag survives undo/redo, session resets and task-list syncs, and the repository merges it from the stored session to resist stale UI copies.
- **Medals**: every `settings.rewards.starsPerMedal` stars (default 3). `profile.starProgress` holds the remainder, `profile.medalCount` the total.
- **Badges**: each medal queues an offer of 3 badges from distinct universes (`profile.badgeOffers`, drawn by `drawBadgeOffer`, preferring badges not owned yet). The child picks one (`chooseBadge`) → `profile.badges`.
- **Piggy bank & shop**: unspent badges can be exchanged for `settings.shop` items (`spendBadges`, oldest first, PIN-approved without the hold bypass). Spent badges stay in the album with `spentAt`/`spentOn`.
- **Trophies**: milestone achievements (`domain/trophies.ts`) computed from all the child's sessions, stored in `profile.trophies`.
- **My treasure** (`components/rewards/TreasureView.tsx`, opened from the piggy bank): a chest to open, then a spotlight carousel of every trophy and badge (`treasureItems`: trophies first, one entry per badge kind with copies counted), totals, a rank (`treasureRank`) and per-universe collections (`collectionProgress`). Pure helpers live in `domain/treasure.ts`; extra sounds are `playChestOpenSound`, `playTreasureTapSound`, `playTreasureSwipeSound`.
- `App.tsx` queues full-screen reveals (medals, then trophies) and shows the badge choice while the active profile has pending offers.

## Reminders

- `TaskDefinition.startTime` / `dueTime` (`"HH:MM"`, optional, start before end: `isValidTimeWindow`) and `settings.reminders` (`ReminderSettings`: `enabled`, `repeatMinutes`, `maxReminders`, `systemNotifications`; default `DEFAULT_REMINDERS`).
- `findOverdueTasks` lists, for every child, the tasks past their due time and not done (a child without a session today counts as not started; completed routines are skipped), sorted by due time, child, then routine order.
- `findStartingTasks` lists tasks whose start time has passed and that are still `todo` (until their end time, when late reminders take over); `findReminderTasks` merges both lists by time. Items carry `kind: 'late' | 'start'`; a start is announced only once.
- `planReminders` decides what to announce now from a per-day log (`{ count, lastAt }` per `date_child_task` key): first time overdue, then every `repeatMinutes`, at most `maxReminders`. Tasks of the same child are grouped into one batch.
- `ReminderQueue` plays batches strictly one at a time (banner + chime + voice, waiting for any ongoing speech), merges pending batches of the same child and re-validates each batch against the database right before playing.
- `useTaskReminders` ticks every 30 s, persists the log in `localStorage` (best effort) and is paused during Parent Mode. Reminders only run while the app is open; there is no push server.

## Feedback Settings

`settings.feedback` (`FeedbackSettings`, default `DEFAULT_FEEDBACK`): `sounds`, `voice`, `songs`, `volume` (0–1) and `animations` (`full` | `reduced`). `App.tsx` passes it to `reminderService.configure()` and toggles the `reduce-motion` class on `<html>`; CSS and `services/effects.ts` (`richMotion`, `fireConfetti`) then skip confetti, particles, rays and looping animations. The OS "reduce motion" preference is honoured too.

---

## Responsive Layout

Breakpoints are Tailwind's (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). Full-screen views use `100dvh` so mobile browser bars don't hide content.

- **Child board**: below `sm`, the three columns stack in one vertical scroll with "doing" first (`order-first`), to-do cards in a 2-column grid and done tasks as small tiles; from `sm`, three side-by-side columns (one card per row), and from `lg` two cards per row inside each column. Emoji sizes are set per breakpoint in `TaskCard`; labels wrap on two lines. `e2e/mobile.spec.ts` checks there is no horizontal scroll at phone width.
- **Parent Mode**: below `lg`, a 5-tab bar (icons + short labels, full names as `aria-label`); from `lg`, the sidebar. The "new task" form is folded behind a button; deleting a task takes a second tap.

## Configuration Backup

`domain/backup.ts` defines a versioned JSON format:

```typescript
interface BackupFile {
  app: 'kidu';
  version: number;      // BACKUP_VERSION, currently 1
  exportedAt: string;   // ISO 8601
  data: {
    settings: ParentSettings; // without `id`
    tasks: TaskDefinition[];
    profiles: ChildProfile[];
    history?: HistoryEntry[]; // only when exported with history
  };
}
```

- `parseBackup(text)` validates every field and drops unknown ones; it throws a `BackupError` with a `code` (`invalid_json`, `not_kidu_backup`, `unsupported_version`, `invalid_*`).
- `routineRepository.importBackup` replaces settings, tasks and profiles in a single Dexie transaction, clears `sessions`, and replaces `history` only if present in the file.
- When the format changes, bump `BACKUP_VERSION` and keep `parseBackup` able to read older versions.

---

## State Synchronisation

Reactivity is achieved through `dexie-react-hooks`' `useLiveQuery`. When components invoke CRUD routines (e.g. database updates inside `db.ts` or `routineRepository.ts`), the queries reactively re-evaluate, causing component sub-trees to render instantly without prop drilling or custom React Context.

Example implementation in `App.tsx`:
```typescript
const profiles = useLiveQuery(() => db.profiles.toArray());
const settings = useLiveQuery(() => db.settings.get('current'));
```

---

## Audio Synthesis Details

To prevent bloating loading bundles with static audio assets, `ReminderService` generates sound effects dynamically using the browser-native **Web Audio API**:

- **Bright Chime (Task Done)**: Synthesizes a rapid sequence of high-frequency sine waves (`OscillatorNode`) to produce a sparkling notification tone.
- **Reset Sweep (Task Reset)**: Sweeps a low-frequency oscillator downwards to suggest cancellation.
- **Victory Fanfare (Routine Complete)**: Fires a sequence of overlapping minor/major chord progressions combined with a text-to-speech fallback congratulatory voice synthesis (`window.speechSynthesis`).
- **Interaction Constraints**: Standard browsers block audio contexts before user actions are registered. The service handles this by lazy-initializing the `AudioContext` inside user-triggered onClick/onTouch handlers.
