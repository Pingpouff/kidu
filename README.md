# Children Evening Routine App (PWA)

A visual, tablet-first Progressive Web App (PWA) designed to help young children (2–5 years old) follow their evening routines independently. Designed with rich, glowing glassmorphic aesthetics, fluid micro-animations, and offline persistence.

## Core Features

- 🧒 **Visual Routine Board**: A kid-friendly Kanban board (To Do, Doing, Done) relying on huge emojis and icons rather than textual labels.
- 🦄 **Kid Customization**: Animal avatars and tailored profile colors (Indigo, Purple, Rose, Emerald, Amber).
- 🛸 **Springy Progress Slider**: A sliding avatar indicator that follows the child's progress towards a golden finish-line star.
- 🔊 **Web Audio Synthesizer**: Native sound synthesis for task transitions (bright chimes, rising progression notes, reset sweeps) and text-to-speech fallback praise.
- 🔒 **Parent Mode Numpad & Gesture Bypass**: Secure parent portal locked by a PIN pad, plus a 3-second long-press lock bypass gesture.
- ⚙️ **Parent Portal**: Management dashboard to add/delete/reorder routine tasks, create/edit child profiles, inspect history logs, toggle languages (FR/EN), and configure rewards.
- ✈️ **Offline-First (PWA)**: Implements service-worker caching via Workbox and IndexedDB local persistence (`dexie`).

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
