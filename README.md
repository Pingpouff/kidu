# Children Evening Routine App (PWA)

A visual, tablet-first Progressive Web App (PWA) designed to help young children (2–5 years old) follow their evening routines independently. Designed with rich, glowing glassmorphic aesthetics, fluid micro-animations, and offline persistence.

## Core Features

- ⭐ **Stars → 🏅 Medals → 🐷 Badges**: every finished task gives a star (once per task and per day); every 3 stars make a medal; each medal lets the child pick one badge out of three (dinosaurs, space, ocean, dragons, unicorns, vehicles, jungle, farm, superheroes, candy land). Badges go into the child's **piggy bank** and are exchanged for real-life rewards from the parent's **shop** (each exchange approved with the parent PIN). An album keeps every badge ever won, and 🏆 trophies reward streaks and milestones. It replaces the paper sticker chart on the fridge.
- 🏠 **Evening overview** on the child selection screen: a clock, and for each child the current step, progress (done/total), the task in progress or the next one, late tasks, the next due time, stars left before the next medal, badges in the piggy bank, a pending badge choice and the streak of evenings in a row. A "Tonight" panel lists the next due times for the whole family.
- 👤 **Personal tasks**: tasks are common to every child by default; in *Routine & Tasks* the parent can restrict a task to one or several children (e.g. homework only for the eldest). Each child's board, progress and reminders only include their own tasks.
- 🟨🟥 **Yellow and red cards**: a parent can give a card for inappropriate behavior from the child's board (confirmed with the PIN, optional reason). Yellow is a warning; red sends the stars collected toward the next medal back to zero (medals and badges are never taken away). A second yellow the same evening becomes a red, and every evening starts clean. While the child has a card tonight, it stays in sight: a colored frame and a banner on their board, a card stuck on the star counter after a red, a reminder each time the board opens, and the card stuck on their avatar on the home screen. A card given by mistake can be withdrawn in *Parent Mode → History*.
- 💎 **My treasure**: from the piggy bank, the child taps a treasure chest that opens with light, coins and a fanfare, then browses every trophy and badge in big (swipe or arrows, tap to hear its name), sees their totals and a fun rank, and fills their collections (6 badges per universe, missing ones shown as "?"). Animations, sounds and voice follow the parent's settings.
- 🎉 **Fun feedback, parent-controlled**: star bursts and cheers on each task, a star flying to the meter, medal reveals, spoken encouragements and an original bedtime song with on-screen lyrics. In *Parent Mode → Settings → Sounds & animations*, parents can switch off short sounds, voice or the song, set the volume, and choose reduced animations.
- ⏰ **Reminders for late tasks**: give a task an optional due time (*Parent Mode → Routine & Tasks*). If it isn't done by then, the app shows a banner, plays a gentle chime and says it out loud, then repeats every N minutes up to a maximum (*Settings → Reminders*). Several late tasks are queued and announced one at a time, grouped by child, and a task done in the meantime is skipped. Late tasks are flagged on the cards and on each child's profile. Optional system notifications when the app is in the background. Reminders only run while the app is open and pause during Parent Mode.
- 🕒 **Start and end times**: each task can have an expected start time and end time (both optional, start before end). At the start time, a task not started yet gets one "time to start" announcement; after the end time, the late reminders above take over. Cards show the time window, and the selection screen lists what starts or ends next.
- 📱 **Phone and tablet friendly**: on phones the board shows one scrolling list (task in progress on top, tasks to do in a grid, finished ones as small tiles); on tablets three columns. Parent Mode uses a compact tab bar below laptop size.
- 🗺️ **Routine Steps**: The day is split into four steps — *Morning* ☀️, *After school* 🎒, *Meal* 🍽️, *Bedtime* 🌙. The child only sees the current step's tasks, gets a mini-celebration when a step is done, and the sky darkens for bedtime.
- 🧒 **Visual Routine Board**: A kid-friendly Kanban board (To Do, Doing, Done) relying on huge emojis and icons rather than textual labels.
- 🦄 **Kid Customization**: Animal avatars and tailored profile colors (Indigo, Purple, Rose, Emerald, Amber).
- 🛸 **Springy Progress Slider**: A sliding avatar indicator that follows the child's progress towards a golden finish-line star.
- 🔊 **Web Audio Synthesizer**: Native sound synthesis for task transitions (bright chimes, rising progression notes, reset sweeps) and text-to-speech fallback praise.
- 🔒 **Parent Mode Numpad & Gesture Bypass**: Secure parent portal locked by a PIN pad, plus a 3-second long-press lock bypass gesture.
- ⚙️ **Parent Portal**: Management dashboard to add/delete/reorder routine tasks, create/edit child profiles, inspect history logs, toggle languages (FR/EN), and configure rewards.
- 💾 **Configuration Backup**: Export tasks, child profiles and settings (optionally with history) to a JSON file from *Parent Mode → Settings*, and import it back on the same or another device.
- ✈️ **Offline-First (PWA)**: installable app with service-worker caching via Workbox and IndexedDB local persistence (`dexie`).
- 🔄 **Updates & what's new**: when a new version is published, a banner offers to update (never on a child's board, so a routine is never interrupted); after the update, a "What's new?" window lists the changes. *Parent Mode → Settings → App* shows the installed version, checks for updates and lists the version history.

---

## Getting Started

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Development Server
Run the local Vite server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. Use mobile/tablet emulation mode for the best visual experience.

### 3. Running Unit Tests
Execute the domain business logic test suite:
```bash
npm run test
```

### 4. Build for Production
Generate optimized, production-ready static assets with service worker caching:
```bash
npm run build
```

---

## Default Access & Configurations

- **Default Language**: French (Toggleable to English in Settings).
- **Default Parent PIN**: `1234`
- **Unlock Gesture**: Hold down the central shield/lock icon on the PIN screen for **3 seconds** to bypass the PIN entry automatically.

## Backup & Restore

Data lives only in the browser of each device. To save it or move it to another device:

1. Open **Parent Mode → Settings → Configuration backup**.
2. Click **Export** to download `kidu-backup-YYYY-MM-DD.json` (tick *Include routine history* to add the history).
3. On the target device, click **Import a file**, pick the JSON file and confirm.

Importing **replaces** the current tasks, profiles and settings (including the parent PIN) and resets today's routine in progress. History is only replaced when the file contains it. The backup file holds the parent PIN in clear text: store it accordingly.
