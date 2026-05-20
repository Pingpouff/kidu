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
    │   └── routine.ts      # Pure business rules (stateless)
    ├── persistence/
    │   ├── db.ts           # IndexedDB configuration and Dexie schema
    │   └── routineRepository.ts # Persistence and domain coordinator
    ├── services/
    │   └── ReminderService.ts # Audio oscillators and TTS fallback
    ├── i18n/
    │   └── dictionary.ts   # Translations dictionary
    ├── components/
    │   ├── child-board/    # Kid-facing board components
    │   ├── parent-mode/    # Parent settings dashboard components
    │   └── rewards/        # Fanfare and confetti celebrations
    └── tests/
        └── domain.test.ts  # Vitest unit test suite
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
       order: number; // Sorting order
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
