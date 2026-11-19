# Gym Announcements Audio System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a non-intrusive "Mensajes" button in `PortalHeader` that reproduces 3 pre-recorded audio messages from Marisol Flores Trankilandia through the connected Bluetooth speaker, and generate the new Electron Windows installer executable.

**Architecture:** Generates 3 studio MP3 files in `public/sounds/anuncios/`, creates an `announcementsService.ts` state manager that routes playback to HTML5 Audio respecting master volume, builds an accessible popover component `GymAnnouncementsControl.tsx` in `PortalHeader`, verifies with unit tests, and compiles the desktop app with `electron-builder`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Web Audio API / HTML5 Audio, Lucide React, Vitest, Electron Builder.

## Global Constraints
- Target platform: Windows Electron desktop app and web portal.
- Audio output: Default system output (Bluetooth speaker).
- Do NOT distort or push existing layout elements in `PortalHeader`.
- Respect master volume and mute controls in `audioVoiceAlerts`.
- Output installer: `dist-electron/Trankilandia Hub Setup 1.0.0.exe`.

---

### Task 1: Generate Pre-recorded Announcement MP3 Files

**Files:**
- Create: `public/sounds/anuncios/cierre-10min.mp3`
- Create: `public/sounds/anuncios/orden-accesorios.mp3`
- Create: `public/sounds/anuncios/clases-grupales.mp3`
- Create: `scripts/generate-announcements.mjs`

**Interfaces:**
- Produces: 3 static MP3 audio files in `public/sounds/anuncios/` accessible at `/sounds/anuncios/<id>.mp3`.

- [ ] **Step 1: Write generation script `scripts/generate-announcements.mjs`**
Write a script that creates `public/sounds/anuncios/` and uses TTS + ffmpeg to generate the 3 MP3 files with high fidelity and chime intro.
- [ ] **Step 2: Run script to produce the 3 MP3 files**
Execute `node scripts/generate-announcements.mjs` and verify all 3 files exist and have non-zero size.
- [ ] **Step 3: Commit audio assets**
`git add public/sounds/ scripts/generate-announcements.mjs && git commit -m "feat(audio): generate 3 official announcement mp3 files"`

---

### Task 2: Implement Announcement Audio Service and Unit Tests

**Files:**
- Create: `src/lib/announcementsService.ts`
- Create: `src/tests/unit/announcementsService.test.ts`
- Modify: `src/lib/audioVoiceAlerts.ts` (if needed for shared volume bindings)

**Interfaces:**
- Consumes: `getAlertVolume()`, `isAlertMuted()` from `src/lib/audioVoiceAlerts.ts`.
- Produces:
  - `GYM_ANNOUNCEMENTS: GymAnnouncement[]`
  - `playAnnouncement(id: string): Promise<void>`
  - `stopAnnouncement(): void`
  - `getPlayingAnnouncementId(): string | null`
  - `isAnnouncementPlaying(): boolean`
  - CustomEvent: `gym-announcement-state-changed`

- [ ] **Step 1: Write unit tests in `src/tests/unit/announcementsService.test.ts`**
Cover:
1. Catalog contains the 3 required announcements with correct text and IDs.
2. `playAnnouncement` sets active ID and state.
3. `stopAnnouncement` clears active ID.
4. Volume matches `getAlertVolume()`.
- [ ] **Step 2: Run test to observe initial failure**
`npx vitest run src/tests/unit/announcementsService.test.ts`
- [ ] **Step 3: Implement `src/lib/announcementsService.ts`**
Implement the service with HTML5 Audio, volume synchronization, event dispatching, and fallback.
- [ ] **Step 4: Verify tests pass**
`npx vitest run src/tests/unit/announcementsService.test.ts`
- [ ] **Step 5: Commit**
`git add src/lib/announcementsService.ts src/tests/unit/announcementsService.test.ts && git commit -m "feat(audio): implement announcements service with volume sync and tests"`

---

### Task 3: Build `GymAnnouncementsControl` and Integrate in `PortalHeader`

**Files:**
- Create: `src/components/portal/GymAnnouncementsControl.tsx`
- Modify: `src/components/portal/PortalHeader.tsx`

**Interfaces:**
- Consumes: `announcementsService.ts`, `PortalHeader.tsx`.
- Produces: Visual dropdown button with "Mensajes" label, play/pause controls for each of the 3 messages, and stop-all button.

- [ ] **Step 1: Implement `src/components/portal/GymAnnouncementsControl.tsx`**
Create the component with:
- Trigger button with Megaphone/Volume icon, "Mensajes" text (hidden on xs screens), audio wave indicator when active.
- Popover with cards for the 3 announcements:
  1. Cierre en 10 min
  2. Orden y Accesorios
  3. Clases Grupales
- Individual Play/Stop buttons with live playing state.
- Global "Detener Anuncio" button when playing.
- [ ] **Step 2: Add `<GymAnnouncementsControl />` to `src/components/portal/PortalHeader.tsx`**
Place it right before `<GymMegaphoneControl />` in `PortalHeader`. Ensure responsive classes prevent header overflow.
- [ ] **Step 3: Run existing and new unit tests**
`npm test`
- [ ] **Step 4: Commit**
`git add src/components/portal/GymAnnouncementsControl.tsx src/components/portal/PortalHeader.tsx && git commit -m "feat(ui): add GymAnnouncementsControl to PortalHeader"`

---

### Task 4: Full Verification and Electron Windows Build

**Files:**
- Verify: Full codebase
- Build: `dist-electron/Trankilandia Hub Setup 1.0.0.exe`

- [ ] **Step 1: Run complete test suite**
`npm test`
- [ ] **Step 2: Verify production build via Vite**
`npm run build`
- [ ] **Step 3: Build Electron installer**
`npm run electron:build`
- [ ] **Step 4: Confirm installer exists and verify output details**
Check `dist-electron/` for the new `.exe` file and its file size/timestamp.
- [ ] **Step 5: Final git commit and summary**
Commit any remaining changes and provide clear instructions to the user on how to run or install the new `.exe`.
