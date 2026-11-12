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
    │   ├── cards.ts        # Green / yellow / red cards (pure rules)
    │   ├── timer.ts        # Timed tasks: countdown from "doing", "minutes left" warnings
    │   ├── calendar.ts     # Holidays and rest days (periods), school / holidays tasks
    │   ├── treasure.ts     # "My treasure" view model: items, collections, stats, rank
    │   ├── trophies.ts     # Milestone trophies computed from sessions
    │   ├── reminders.ts    # Overdue detection and reminder planning (pure)
    │   ├── backup.ts       # Backup file format, creation and validation
    │   ├── changelog.ts    # App version, bilingual changelog, "what's new" selection
    │   └── parentGate.ts   # PIN lock-out, grown-up question, PIN format
    ├── persistence/
    │   ├── db.ts           # IndexedDB configuration and Dexie schema
    │   └── routineRepository.ts # Persistence and domain coordinator
    ├── services/
    │   ├── ReminderService.ts # Synthesized sounds, voice, bedtime song (respects feedback settings)
    │   ├── effects.ts      # Confetti / rich-motion helpers (respects reduced animations)
    │   ├── ReminderQueue.ts # Serial queue of reminder announcements
    │   ├── storage.ts      # Persistent storage request / status
    │   ├── install.ts      # Install invitation: beforeinstallprompt, iOS detection, dismissal
    │   ├── swUpdate.ts     # Applying a service worker update (reload logic)
    │   └── appUpdate.ts    # Service worker registration, update prompt, last seen version
    ├── hooks/
    │   └── useTaskReminders.ts # Clock + overdue detection + queue wiring
    ├── ui/                 # UI kit (generic, no domain logic)
    │   ├── cx.ts           # Class joiner + tailwind-merge (last class wins)
    │   ├── theme.ts        # Child color themes (single table)
    │   ├── layers.ts       # Named stacking layers (z-index tokens) + confetti z
    │   ├── styles.ts       # fieldClass / buttonClass / iconButtonClass / chipClass
    │   ├── controls.tsx    # IconButton, ConfirmIconButton
    │   ├── useConfirmTap.ts # Two-tap confirmation hook
    │   ├── Overlay.tsx     # Overlay (full-screen layer) and Modal (centered panel)
    │   ├── Panel.tsx       # PanelHeader for Parent Mode sections
    │   └── Pill.tsx        # Small rounded labels
    ├── i18n/
    │   └── dictionary.ts   # Translations dictionary
    ├── components/
    │   ├── app/            # Update banner and "What's new" window
    │   ├── child-board/    # Kid-facing board (RoutineBoard, PhaseIndicator, StarMeter, TaskCard…)
    │   ├── parent-mode/    # Parent dashboard; settings/ (Backup, App, Danger zone) and tasks/ (fields, DayPicker, SortableTaskRow)
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
       category?: 'morning' | 'after_school' | 'meal' | 'bedtime'; // Routine phase, missing = 'bedtime'
       startTime?: string; // "HH:MM" expected start, one "time to start" reminder
       dueTime?: string; // "HH:MM" expected end, reminders when late
       assignedTo?: string[]; // child ids, missing/empty = common to every child
       days?: number[]; // 0 = Sunday … 6 = Saturday, missing/empty = every day
       durationMinutes?: number; // time allowed once started ("doing"), 1–180
       schedule?: 'school' | 'holidays'; // missing = always
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

Tasks belong to one of four fixed phases, run in order: `morning` → `after_school` → `meal` → `bedtime` (`TASK_CATEGORIES` in `domain/models.ts`). A day's session holds every phase; the board shows the first phase neither done nor skipped.

- Default morning tasks: get dressed, breakfast, brush teeth, shoes & coat. Existing databases get them once through the Dexie `version(2)` upgrade in `persistence/db.ts` (skipped if a morning task already exists).
- Each phase has a "finish it 10 times" trophy (`morning_10`, `after_school_10`, …).

- `sortDefinitions` orders tasks by phase, then by `order`; sessions are built and synced with it.
- `getRoutinePhases(session, definitions)` returns the non-empty phases (with `isCompleted` / `isSkipped`); `getCurrentPhaseIndex` returns the first one neither completed nor skipped.
- **Skipping a step**: a parent can skip the current step from the board ("Passer l'étape", PIN) or resume a skipped one; `RoutineSession.skippedPhases`, `skipPhase` / `unskipPhase`. A skipped step raises no reminder and isn't proposed on the selection screen.
- **Day completed**: `isSessionCompleted` — every step done or skipped, and at least one done. `withCompletion` recomputes `isCompleted` / `completedAt`; every session change goes through it (`moveTask`, `syncSessionWithDefinitions`, the board). Streaks and routine trophies use it, so a skipped morning doesn't break a streak; per-phase trophies only count steps really done.
- **History**: every session change upserts its history entry, so partial days show up (e.g. 9/12). A day with nothing done has no entry (a reset removes it).
- The child board only shows the current phase's tasks, with a step indicator, a "step complete" banner/sound/voice when a phase ends, and a night-sky overlay during `bedtime`. Overall progress and the final celebration still cover the whole routine.
- In Parent Mode, tasks are grouped by phase and can only be reordered inside their phase. The phase is chosen when creating or editing a task.

---

## Personal Tasks

- `TaskDefinition.assignedTo` lists the children a task belongs to; missing or empty means every child. `isTaskForChild` / `definitionsForChild` (`domain/routine.ts`) are the single source of truth.
- `initSession` and `syncSessionWithDefinitions` only keep the child's tasks, so changing an assignment updates today's sessions (statuses of remaining tasks are kept). `findOverdueTasks` skips children a task is not assigned to.
- `routineRepository.deleteProfile` removes the child from assignments and deletes the tasks that were assigned only to them (`unassignChild`).
- In Parent Mode, `AssigneePicker` (TaskManager) toggles "Every child" or specific children; selecting all children goes back to a common task. Backups keep `assignedTo`.

## Days of the Week

- `TaskDefinition.days` limits a task to some days (`weekdayOf`, `isTaskForDay`, `definitionsForChildOn` in `domain/routine.ts`). Sessions, syncs and reminders only include the tasks planned that day.
- `DayPicker` (TaskManager): "Every day", "Mon → Fri" or single days; choosing all seven comes back to every day. Default school tasks (empty bag, homework, pack bag) are Monday–Friday.
- e2e: `e2e/fixtures.ts` moves the browser clock back to Friday when the suite runs on a weekend, so specs always see a school day. Specs import `test` / `expect` from `./fixtures`.

## Holidays and Rest Days

`settings.periods: CalendarPeriod[]` (`{ id, kind: 'holidays' | 'off', from, to, childIds? }`, dates included, no `childIds` = every child), rules in `domain/calendar.ts` (`dayContext` → `{ holidays, off }`). Edited in Parent Mode → Tasks (`CalendarPanel`: "rest day today" quick toggle, add a period, list of current / upcoming ones) and saved by `routineRepository.savePeriods`, which drops periods ended more than 60 days ago and re-syncs today's sessions.

- `TaskDefinition.schedule`: `school` (hidden in holidays and on rest days), `holidays` (only then), missing = always (`isTaskForSchedule`; `SchedulePicker` in TaskManager). `isTaskForChildOn` / `definitionsForChildOn(…, periods)` combine child, weekday and schedule; `initSession` / `syncSessionWithDefinitions` take `periods`. The default bag / homework tasks are `school` (Dexie `version(4)` upgrade for existing installs).
- A rest day (`off`) is also a no-school day, raises no reminder (`ReminderContext.periods` in every `find*Tasks`), shows nothing in `upcomingDeadlines`, and is neutral for streaks: `currentStreak` / `liveStreak` / `computeTrophyStats` take an `isNeutral` day test, so an off day between two completed routines doesn't break the streak (it doesn't count either). The child can still tick tasks and earn stars.
- `ChildSummary.period` and the board's `dayKind` show "🏖️ Vacances" / "😴 Jour de repos" pills. Backups keep `periods` and `schedule`.

## Selection Screen Overview

`domain/summary.ts`: `childSummary` (status, done/total, current phase, doing/next task, late tasks, next due time, stars to the next medal, piggy bank badges, pending badge choices, live streak) and `upcomingDeadlines` (next due times grouped by task, children listed together). A child without a session today is previewed with `initSession`. `ProfileSelector` re-renders every 30 s and gets all sessions from `App.tsx`.

## Rewards

All rules are pure functions in `domain/rewards.ts`, persisted by `routineRepository.saveSessionWithRewards` in a single transaction.

- **Stars**: one per task the first time it reaches `done` on a given day. `RoutineTask.rewarded` marks it; the flag survives undo/redo, session resets and task-list syncs, and the repository merges it from the stored session to resist stale UI copies.
- **Medals — the one reward the child wins** (1.10.0): every `settings.rewards.starsPerMedal` stars (default 3). `profile.starProgress` holds the remainder, `profile.medalCount` the total. Each medal queues a choice of 3 **motifs** from distinct universes (`profile.badgeOffers`, `drawBadgeOffer`); the child picks one (`MedalChoice`, `chooseBadge`) → `profile.badges`. Children and parents only ever see "médaille": in the data and code a medal's motif is still called a badge (`badges`, `badgeOffers`, `domain/badges.ts`) so stored data and backups didn't change. `MedalDisc` draws a medal (universe disc, gold rim, ribbon). Never write "badge" in user-facing copy.
- **Piggy bank & shop**: unspent medals can be exchanged for `settings.shop` items (`spendBadges`, oldest first, PIN-approved without the "forgot the PIN" question). Spent medals stay in the album with `spentAt`/`spentOn`.
- **Trophies**: 23 milestones (`domain/trophies.ts`, `TROPHY_IDS`) computed by `computeTrophyStats(sessions, definitions, profile)`: first step / routine, streaks 3 and 7, 10 and 30 routines, 10 of each step, lightning, early bird, medals 1 / 10 / 25 / 50 and stars 100 / 500 (from the profile), perfect week (Monday → Sunday all completed), full day (every step done, none skipped, ≥ 2 steps), weekend, comeback (a completed routine after ≥ 2 days without one), early night (bedtime finished before 8 pm). Stored in `profile.trophies`, never taken back. No trophy is ever tied to "Mes émotions".
- **My treasure** (`components/rewards/TreasureView.tsx`, opened from the piggy bank): a chest to open, then a spotlight for the treasure the child taps, **"Mes trophées"** (`trophyShowcase`: every trophy, earned ones in gold with their date, the others as silhouettes with their hint) and, apart, **"Mes médailles"** (`medalTotals`: won / in the piggy bank / exchanged, a shelf of motifs, per-universe collections `collectionProgress`). Rank: `treasureRank`. Pure helpers live in `domain/treasure.ts`; extra sounds are `playChestOpenSound`, `playTreasureTapSound`, `playTreasureSwipeSound`.
- `App.tsx`: a new medal shows `MedalChoice` first (it is the medal's reveal: medal sound, confetti); then the full-screen `RewardReveal`s of the trophies it unlocked. There is no separate "new medal" reveal anymore.

## Green, Yellow and Red Cards

Pure rules in `domain/cards.ts`, stored on the profile (`profile.cards: BehaviorCard[]`, whole history, kept in backups).

- A parent gives a card from the child's board (cards button in the header → `CardGiver`: color, optional reason → PIN check without the "forgot the PIN" question). Green comes first and is preselected, with its own reasons (`GREEN_CARD_REASONS`).
- **Green** (1.11.0): a "well done", **+1 star** toward the next medal through `addStars` (`domain/rewards.ts`, shared with task stars), so it can complete a medal (then `MedalChoice` shows). `gainedStar` marks it; withdrawing it takes the star back (a medal it completed is kept). Green cards never count toward the yellow → red rule, and `tonightCardState.level` ignores them (`green` count and `lastGreenReason` apart). `CardReveal outcome="green"` plays the star sound instead of the whistle; the board shows a green pill next to `CardBanner` (tap → reveal again), the home card a small green card; there is no green frame and no reminder when the board opens.
- **Yellow**: a warning, no effect. **Red**: `starProgress` goes back to 0 (stored in `lostProgress`); stars, medals, badges and trophies are never taken.
- A second yellow the same evening (`date`) adds an automatic red (`fromYellows`). Cards count per evening: the next one starts clean.
- `CardReveal` shows the card with a whistle (`playWhistleSound`) and a spoken sentence (all following the feedback settings).
- Parent Mode → History lists recent cards (`CardHistory`); `withdrawCard` removes a card given by mistake (with the red it triggered) and gives the stars back, up to just below a medal.
- **Visible all evening** (`tonightCardState(profile, date)`: level `none`/`yellow`/`red`, counts, last reason, stars lost): a colored frame around the board (`card-frame-*`), a `CardBanner` under the step indicator (tap → `CardReveal` again), a red card stuck on the star counter with "stars back to zero" after a red, and `CardReveal mode="reminder"` (no whistle, short voice, closes after 5 s) every time the board opens. On the selection screen, the card is stuck on the child's avatar, the child card gets a yellow/red ring and shows the reason (`ChildSummary.cards`). Everything disappears the next evening.

## Mes émotions (emotions space)

A separate module in `src/features/emotions/` (domain, persistence, art, components), lazy-loaded from `App.tsx`. It only depends on profiles, settings, i18n, `ReminderService` and the UI kit. Design and research notes: version B of the art direction — the Owl shows the child's emotion, the Cloud is the guide and leads breathing.

- **Guardrails** (keep them in every change): no stars, medals or rewards for emotions; short sessions that always end with a real-life action (a grown-up first) — a springboard, not a pacifier; every emotion is welcome (no "bad" color, anger is coral, not alarm red); nothing diagnostic; no free text in logs (privacy); it must stay smooth in lite display.
- **Data**: Dexie `version(3)` table `emotionLogs` (`EmotionLog`: `kind` `checkin` | `calm`, optional `childId` — the calm corner opened from the home screen has none). `profile.emotions` (`level` override, `helpful` strategy ids), `settings.emotions` (`EmotionSettings`, defaults `DEFAULT_EMOTIONS`, read through `emotionSettings()`). Backups are version 2 (`emotionLogs` exported with the history; version 1 files are still read). Deleting a child deletes their logs.
- **Domain**: `catalog.ts` (emotions by family and age level — 6 / 12 / 24 —, strategies with a minimum level), `level.ts` (`ageLevel`: < 6 → 1, 6-8 → 2, ≥ 9 → 3, unknown → 2), `checkin.ts` (`suggestStrategies`: helpful first, then the parent's own, then level defaults; `makeCalmLog`).
- **Calm corner** (`CalmCorner.tsx`, 1.7.0): opened without PIN from the home screen (`calm-button`) and the board header. Spoken intro, 4 breaths (`INHALE_MS` 4 s / `EXHALE_MS` 6 s, soft chimes `playSoftChime`, spoken cues on the first breath only), then "Next, in real life": go and see `adultName` first, then 2 suggestions; "one more breath" once; closes by itself 20 s after a choice. Reminders are paused while it is open. One `calm` log per session (none if no breath was taken).
- **How I feel** (`EmotionsHub.tsx` → `CheckInFlow.tsx`, 1.8.0): `emotions-button-<id>` under each `ChildCard` opens the child's hub (check-in, calm corner, toolbox). Steps: emotion grid for the child's level (`Owl` per family, belly in the emotion's color, soft moon) → intensity (level ≥ 2) → body zones (optional, "Passer") → reply: pleasant = savour and tell someone; unpleasant = validation sentence (`emo.checkin.validate.<family>`), 2 `StrategyCard`s and a link to the calm corner. The log is created at the first step (`makeCheckIn`) and updated at each step.
- **Toolbox** (`Toolbox.tsx`): every strategy of the level plus the parent's own; the heart ("Ça m'aide") toggles `profile.emotions.helpful` (`emotionRepository.toggleHelpful`), shown first and suggested first.
- **Evening invitation**: on the board once the `bedtime` phase is completed, if `settings.emotions.eveningCheckIn`, no check-in today for the child and not dismissed tonight (`eveningInvite.ts`, localStorage best effort). "Je montre…" opens the hub directly on the check-in.
- **Parent space** (`components/parent/EmotionsPanel.tsx`, Parent Mode tab "Émotions", hidden when the space is off; 1.9.0): per child, `weekGrid` (4 weeks Monday → Sunday, a dot per check-in in the emotion's color, ☁️ for calm corners), `hardMoments` (unpleasant check-ins by morning / afternoon / evening), `familyCounts`, `calmCount` (`domain/trends.ts`, no score), what helps them, the level select (`emotionRepository.setLevel`, auto = from age) and "delete the history" (two taps). Calm corners from the home screen (no child) are counted for the family. Family ideas: `emotionRepository.setCustomStrategies` (removing one also removes it from every toolbox; the Settings form keeps the stored list). Coaching sheets and "when to talk to a professional" are `parent.emo.*` texts.
- **Art**: `Owl.tsx` (6 family expressions from the DA, moon `full` | `soft` | `none`), `OwlGlyph.tsx` (still, for buttons). `Cloud.tsx` is driven by `phase` (CSS transitions, in step with the timer); its wind (`.emo-wind`, tapered ribbons, puffs, leaf) is hidden in lite display and reduced motion, the breathing cloud stays. `CloudGlyph.tsx` is the still icon. Styles: `.emo-*` at the end of `index.css`.
- **Copy**: `emo.*` keys (fr + en, tested for parity). Child-facing texts are reviewed by the parent before each release.

## Reminders

- `TaskDefinition.startTime` / `dueTime` (`"HH:MM"`, optional, start before end: `isValidTimeWindow`) and `settings.reminders` (`ReminderSettings`: `enabled`, `repeatMinutes`, `maxReminders`, `systemNotifications`; default `DEFAULT_REMINDERS`).
- `findOverdueTasks` lists, for every child, the tasks past their due time and not done (a child without a session today counts as not started; completed routines are skipped), sorted by due time, child, then routine order.
- `findStartingTasks` lists tasks whose start time has passed and that are still `todo` (until their end time, when late reminders take over); `findReminderTasks` merges both lists by time. Items carry `kind: 'late' | 'start'`; a start is announced only once.
- `planReminders` decides what to announce now from a per-day log (`{ count, lastAt }` per `date_child_task` key): first time overdue, then every `repeatMinutes`, at most `maxReminders`. Tasks of the same child are grouped into one batch.
- `ReminderQueue` plays batches strictly one at a time (banner + chime + voice, waiting for any ongoing speech), merges pending batches of the same child and re-validates each batch against the database right before playing.
- **Timed tasks** (1.11.0, `domain/timer.ts`): `TaskDefinition.durationMinutes`; the time allowed counts from `RoutineTask.startedAt`, set by `moveTask` when a task goes to `doing` (kept when done, cleared back to todo, kept by syncs). `findTimerTasks` gives a `warning` (only the closest threshold passed, `minutesLeft`) from `settings.reminders.timerWarnings` (default `[10, 5]`, choices `TIMER_WARNING_CHOICES`, `warningsFor` drops thresholds ≥ the duration), then `timeup` once it runs out. Keys include `startedAt`, so a restarted task gets fresh reminders. Warnings play once, `timeup` repeats like `late`; time-up tasks also count as late for badges. On the board, `TaskTimer` (doing card) draws a draining disc updated every 5 s; a todo card shows the duration.
- **Stopped for tonight** (1.11.0): `settings.mutedReminders` (`{ date, childIds? }`, no ids = every child, only counts on `date`, not in backups). `muteReminders` / `isMuted` / `mutedChildren` in `domain/reminders.ts`; `ReminderContext.muted` removes those children from every `find*Tasks` (no banner, no voice, no late badge or ⏰ marker). Set with the PIN from the reminder banner ("Arrêter pour ce soir", that child) or the home screen's "Ce soir" section (everyone), through `routineRepository.muteReminders`; "Réactiver" (`unmuteReminders`, no PIN). The announcement on screen stops at once.
- **Asking for notifications in context** (1.12.1): after a parent saves a task with a start / end time or a duration, `shouldOfferNotifications` (`services/notificationOffer.ts`) opens `NotificationOffer` once (system notifications off, permission still askable); the permission prompt runs in the "Activer" tap. Answered = `localStorage['kidu.notificationOfferDismissed']`. e2e fixtures answer it up front (`test.use({ notificationOffer: true })` to test it; headless Chromium reports "denied", so that spec stubs `Notification`).
- `useTaskReminders` ticks every 30 s, persists the log in `localStorage` (best effort) and is paused during Parent Mode. Reminders only run while the app is open; there is no push server.

## Feedback Settings

`settings.feedback` (`FeedbackSettings`, default `DEFAULT_FEEDBACK`): `sounds`, `voice`, `songs`, `volume` (0–1) and `animations` (`full` | `reduced`). `App.tsx` passes it to `reminderService.configure()` and toggles the `reduce-motion` class on `<html>`; CSS and `services/effects.ts` (`richMotion`, `fireConfetti`) then skip confetti, particles, rays and looping animations. The OS "reduce motion" preference is honoured too.

**Lite display** (`feedback.visuals`: `auto` | `rich` | `lite`, missing = `auto`): `services/performance.ts` — `isLowEndDevice()` (`navigator.deviceMemory` ≤ 2 GB, fallback ≤ 2 cores) and `resolveVisuals()`. `App.tsx` toggles the `lite` class on `<html>`; the `.lite` block at the end of `index.css` removes every `backdrop-filter`, stops looping animations (`animate-pulse`, `animate-bounce`, `bedtime-sky`…), clears drop shadows (`--tw-drop-shadow`, other filters kept) and gives dialogs a solid background; `fireConfetti` throws a third of the particles. Built for old tablets (Galaxy Tab A 9.7, Adreno 306), where blur and endless animations kept the GPU repainting. New looping decorations must be added to the `.lite` (and `.reduce-motion`) lists. The Outfit font is self-hosted (`@fontsource/outfit`, imported in `main.tsx`, `woff2` precached by the service worker).

---

## UI Kit

Styles live in Tailwind classes, shared through `src/ui/` instead of being copied:

- **Child colors**: `childTheme(color)` returns every class tied to a child's color (board background, card, bars, celebration, Parent Mode row). Add a color in `CHILD_THEMES` (+ its `.theme-*` background in `index.css`).
- **Layers**: full-screen views use `<Overlay layer="…">` (`overlay` < `treasure` < `flying` < `banner` < `dialog` < `choice` < `reveal`, tokens in `tailwind.config.js`). Overlays are rendered in a portal on `<body>` (an ancestor with `backdrop-filter`/`transform`, like `glass-panel`, would otherwise trap `position: fixed`), lock the page scroll, and Escape closes only the top one. A scrollable area inside a `max-h` flex panel needs `min-h-0`. `<Modal>` is an Overlay with a centered glass panel and a close button (piggy bank, PIN pad). Confetti canvases use `CONFETTI_Z`.
- **Parent Mode controls**: `fieldClass(size, extra, { editing })` for inputs/selects (`lg` creation forms, `md` settings, `sm` inline row editing), `buttonClass(variant, size, extra)`, `IconButton` (edit / success / neutral) and `ConfirmIconButton` for anything destructive (second tap within 3 s). `PanelHeader` for section titles.
- **Child-facing pieces**: `ChildAvatar`, `Pill`, `ChildCard`, `TaskCard`, `BadgeDisc`.
- **Toasts** behave like Android notifications / Material snackbars: `useSwipeDismiss` / `<Swipeable>` (swipe sideways past 80 px or fling to dismiss; a real swipe cancels the click), `useAutoDismiss(ms, onDismiss, { fullScreen })` (auto-close that waits while pressed, hovered or focused — only pressed for full-screen views, which always have the pointer and take the focus), `mergeHandlers`. Used by `ReminderBanner` (swipe, ✕, tap, "Dans 10 min" → `useTaskReminders().snooze`, 10 min per child in `localStorage['kidu.reminderSnooze']`, "Arrêter pour ce soir"; dismissing stops the voice), `PhaseBanner`, the card reminder (`CardReveal mode="reminder"`), `AppUpdateBanner`, `InstallBanner` and the evening invitation. New toasts must offer a way to dismiss them.
- **Android Back** (`services/backStack.ts`): `useBackHandler(active, onBack | null)`; every `Overlay` registers itself (Back = its `onClose`, or nothing when it has none, e.g. a choice to make), `App.tsx` registers the board and Parent Mode (Back → home). A single "guard" history entry sits on top while any level is open, so StrictMode's double effects can't make the count drift; it is removed (`history.back()`, popstate ignored) once the last level closes from the UI.
- **Touch and text (Material)**: interactive controls are ≥ 48 px, or get the `.tap-target` utility (a 48 × 48 `::after` hit area) when they must look smaller — `buttonClass`, `iconButtonClass`, `chipClass` and fields include it / a min height. No text under 12 px (13 px for task labels), no `text-white/30|40` for text. Pinch zoom is allowed (`touch-action: manipulation` only removes double-tap zoom); every pressed button lightens (`:active` state layer in `index.css`).
- **Parent Mode navigation**: bottom bar below `lg` with 5 destinations at most (`BAR_MAX`), the others in the "Plus" bottom sheet; sidebar from `lg`. e2e: `openParentTab(page, name)`.
- **Android integration**: manifest `shortcuts` (`?open=calm`, `?open=parent`, handled once in `App.tsx`), `screenshots` (`public/screenshots`, not precached), `theme-color` follows the screen (`childTheme().statusBar`), `<html lang>` follows the language, `reminderService.haptic('tap' | 'success' | 'alert')` (`feedback.haptics`). Reminder notifications carry `actions` (snooze / mute): `public/sw-notifications.js` posts them to the page (or reopens it with `?reminderAction=`), `onReminderAction` in `services/notifications.ts`.
- `cx()` merges classes with tailwind-merge, so an `extra` class overrides the component's default for the same property (`cx('px-4', 'px-2')` → `px-2`).

## Responsive Layout

Breakpoints are Tailwind's (`sm` 640, `md` 768, `lg` 1024, `xl` 1280). Full-screen views use `100dvh` so mobile browser bars don't hide content.

- **Child board**: below `sm`, the three columns stack in one vertical scroll with "doing" first (`order-first`), to-do cards in a 2-column grid and done tasks as small tiles; from `sm`, three side-by-side columns (one card per row), and from `lg` two cards per row inside each column. Emoji sizes are set per breakpoint in `TaskCard`; labels wrap on two lines. `e2e/mobile.spec.ts` checks there is no horizontal scroll at phone width.
- **Parent Mode**: below `lg`, a 5-tab bar (icons + short labels, full names as `aria-label`); from `lg`, the sidebar. The "new task" form is folded behind a button; deleting a task takes a second tap.

## Parent Mode Access

- `PinModal` checks the PIN client-side. Rules live in `domain/parentGate.ts`: 3 wrong attempts (`MAX_PIN_ATTEMPTS`) lock every PIN pad for 30 s (`PIN_LOCK_MS`); the guard is module-level in `PinModal.tsx`, so closing and reopening the pad doesn't reset it.
- `allowForgotPin` (only `App.tsx`, to enter Parent Mode) shows "Code oublié ?": a grown-up multiplication (`makeChallenge`) replaces the PIN. Shop purchases and cards always require the PIN. There is no long-press bypass anymore.
- Parent Mode shows a warning while the PIN is still the default `1234`; the settings field is a password field validated with `isValidPin`.

## Translations

- `translate(key, lang, vars?)` only accepts keys of the French dictionary (`TranslationKey`), so a typo doesn't compile; template keys such as `` `category.${c}` `` type-check when every value exists. Use `translateDynamic` for keys only known at runtime (`cheer.${n}`, stored `labelKey`s).
- `{placeholders}` are filled from `vars`: `translate('badge.choose_spoken', lang, { name })`. Don't build sentences with `language === 'fr' ? … : …` in components.

## Versions, Changelog and Updates

- **Version**: `package.json` `version` (semver), injected at build time as `__APP_VERSION__` (`define` in `vite.config.ts`) and exported as `APP_VERSION` from `domain/changelog.ts`.
- **Changelog**: `CHANGELOG` in `domain/changelog.ts`, newest first, one entry per version with `fr` and `en` lines written for parents. `changesSince(lastSeen)` selects what to announce.
- **Update prompt**: the PWA uses `registerType: 'prompt'`. `useAppUpdate` (`services/appUpdate.ts`, called once in `App.tsx`) registers the service worker, checks for a new version every hour and when the app comes back to the foreground, and exposes `updateAvailable` / `applyUpdate` / `updating` / `checkNow`. `applyUpdate` (`services/swUpdate.ts`) sends SKIP_WAITING to the waiting worker and reloads on `controllerchange` (with a 3 s fallback); when no worker is waiting — the page was loaded without a controller (first visit, hard reload), so the new version is already active — it just reloads. vite-plugin-pwa alone only reloads pages that were controlled when they registered. `AppUpdateBanner` only shows on the selection screen and in Parent Mode, never on a child's board, so an update never reloads the page mid-routine. Settings → *App* shows the version, a "check for updates" button and the version history.
- **What's new**: on startup, `App.tsx` compares `localStorage['kidu.lastSeenVersion']` with `APP_VERSION` and shows `WhatsNewModal` on the selection screen if versions were missed. A fresh install (`seedDatabase()` returns `freshInstall`) shows nothing; an install from before versions were tracked counts as `BASELINE_VERSION` (1.0.0).
- **Releasing** (before merging `development` into `main`): bump `package.json` `version` and add the matching entry at the top of `CHANGELOG`. `src/tests/changelog.test.tsx` fails (and blocks the deploy) if they don't match.
- The dev server doesn't run the service worker: to try the update flow, `npm run build && npm run preview`, then rebuild with a higher version.

## About and Install

- The home screen ℹ️ button opens `AboutModal` (no PIN): version, install / update actions and the whole `CHANGELOG` (`ChangelogList`, shared with `WhatsNewModal`).
- `services/install.ts` is imported first thing in `main.tsx`: it catches `beforeinstallprompt` (and `preventDefault`s it — the browser's own invitation is replaced by ours), tracks `appinstalled` and standalone mode, and detects Safari on iPhone / iPad (no install event there: we explain Share → Add to Home Screen). `useInstallState()` gives `installed | available | ios | unavailable`.
- `InstallBanner` shows on the home screen when the app can be installed; "Not now" hides it for 30 days (`localStorage['kidu.installDismissedAt']`).
- Headless Chromium never fires `beforeinstallprompt`; e2e tests dispatch a fake one.

## Data Safety

- `requestPersistentStorage()` (`services/storage.ts`) runs at startup so the browser doesn't evict IndexedDB; Settings → *App* shows the status.
- `settings.lastBackupAt` is set on every export (it is not written into backup files). `isBackupDue` (`domain/backup.ts`) — at least 3 history days and no export for 30 days — shows a "back up now" banner in Parent Mode.

## Performance, CI and Accessibility

- Parent Mode (`Dashboard`), `Celebration`, `TreasureView` and `canvas-confetti` are loaded on demand (`React.lazy` / dynamic `import()`); the service worker still precaches every chunk for offline use.
- `.github/workflows/ci.yml` runs lint, `tsc -b`, unit and e2e tests on every push to `development` and on pull requests; `deploy-pages.yml` does the same before deploying `main`.
- Task cards have an accessible name and status and react to Enter / Space; the progress bar is a `progressbar`; the star meter announces its count. `Overlay` moves focus inside when it opens, keeps Tab inside the top overlay and gives focus back on close.

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

Past data is only queried by the screen that shows it: `history` while in Parent Mode, all `sessions` while on the selection screen (the last result is kept in a ref while it reloads). On a child's board, a tap only re-reads that day's session, so it doesn't slow down as months of data pile up. Don't add an unconditional `toArray()` of `sessions` / `history` in `App.tsx`.

---

## Audio Synthesis Details

To prevent bloating loading bundles with static audio assets, `ReminderService` generates sound effects dynamically using the browser-native **Web Audio API**:

- **Bright Chime (Task Done)**: Synthesizes a rapid sequence of high-frequency sine waves (`OscillatorNode`) to produce a sparkling notification tone.
- **Reset Sweep (Task Reset)**: Sweeps a low-frequency oscillator downwards to suggest cancellation.
- **Victory Fanfare (Routine Complete)**: Fires a sequence of overlapping minor/major chord progressions combined with a text-to-speech fallback congratulatory voice synthesis (`window.speechSynthesis`).
- **Interaction Constraints**: Standard browsers block audio contexts before user actions are registered. The service handles this by lazy-initializing the `AudioContext` inside user-triggered onClick/onTouch handlers.
