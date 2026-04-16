# NOW!! Pomodoro — Development Log

> Recorded on every feature addition, bug fix, and refactoring. Newest first.

---

## 2026-04-16 — refactor(phase7): Extract CookingTomatoes & EscalationBar from NowAlertOverlay
- **Commit**: `17067d4`
- **Files**: `NowAlertOverlay.tsx`, `CookingTomatoes.tsx` (new), `EscalationBar.tsx` (new)
- Reduced `NowAlertOverlay.tsx` from 584 to 340 lines (-42%). Extracted CookingTomatoes (frying pan + shake animation) and EscalationBar (ignore dots + progress bar + countdown) into standalone components. Pure structural refactor with no behavior change.

## 2026-04-16 — feat(phase6): Social push notification deep-linking
- **Commit**: `11fc739`
- **Files**: `navigation.ts`, `App.tsx`, `SocialContext.tsx`
- Separated push notification tap handling from foreground receipt. Tapping a team 'poke' or 'alert' notification now directly routes the user to the `SocialScreen` tab, utilizing `createNavigationContainerRef`.

## 2026-04-16 — fix(phase5): Fix layout jitter in NOW! state components
- **Commit**: `e56797c`
- **Files**: `NowAlertOverlay.tsx`
- Fixed vertical layout jitter caused by per-second countdown text updates triggering flex container height recalculation.
- Applied `minHeight` bound to `countdownText` and the overall footer hint section, and added `tabular-nums` `fontVariant` to prevent dynamic width scaling for numbers.

## 2026-04-16 — feat(phase4): Frying pan + Tomato visual detail (Escalation animation)
- **Commit**: `de0e825`
- **Files**: `FocusScreen.tsx`, `NowAlertOverlay.tsx`
- Significantly increased the size of the session tomato icon in the basic timer and focus screen from 36x36 to 64x64 for visual emphasis.
- Adjusted the offset of the alert overlay screen elements so that the frying pan is positioned in the exact center of the screen.
- Added a dramatic acceleration to the frying pan shaking animation vibration and speed based on the escalation level (Lv.1~Lv.3+) using `Animated.loop`.

## 2026-04-16 — feat(phase3): Improve font/element size readability and expand touch targets
- **Commit**: `de0e825`
- **Files**: `NumberInput.tsx`, `StatsScreen.tsx`, `SettingsScreen.tsx`
- Increased base font size by +2~4pt across the app.
- Ensured minimum touch targets of 44x44pt for `NumberInput` controls, tabs, toggles, and buttons according to iOS HIG.
- Significantly improved visibility of numbers in team leaderboard and session stats.

## 2026-04-16 — feat(phase2): Pixel editor Undo + Pan tool
- **Commit**: `fb1c6aa`
- **Files**: `PixelEditor.tsx`, `i18n.ts`
- Stroke-level undo history (50-entry cap). Seed history[0] with initial grid on modal open. Push only on stroke release if grid actually changed.
- Added 'pan' tool: 1-finger drag pans canvas (drawing disabled). Existing 2-finger pinch/pan unchanged.
- i18n: `pixel_pan` (Move), `pixel_undo` (Undo) ko/en

## 2026-04-16 — feat(phase1): Background NOW! local notifications + feedback roadmap
- **Commit**: `ad05120`
- **Files**: `pushNotifications.ts`, `TimerContext.tsx`, `App.tsx`, `docs/feedback-roadmap.md`, `CLAUDE.md`
- `scheduleTimerNotification` / `cancelAllTimerNotifications` local notif helpers, 6 kinds (work/break x end/lv2/lv3).
- Integrated cancel→reschedule in `transitionTo`. On focusing/breaking entry, schedule Lv1+Lv2+Lv3 upfront.
- Call `ensureNotificationPermission()` on app boot.

## 2026-04-10 — fix: SDK 54 package upgrades + reanimated 4 worklets split
- **Commit**: `1408229`
- **Files**: `package.json`, `babel.config.js`, `pnpm-lock.yaml`
- reanimated 3.17.5 → 4.1.7, added react-native-worklets@0.5.1. Babel plugin → `react-native-worklets/plugin`.
- Root cause fix for `folly/coro/Coroutine.h` build error.

## 2026-04-10 — fix: EAS iOS build image pinned to latest
- **Commit**: `2ca896a`
- **Files**: `eas.json`
- Attempted workaround for folly coro header issue (ultimately required reanimated upgrade).

## 2026-04-10 — fix: pnpm-lock.yaml sync
- **Commit**: `8065c78`
- **Files**: `pnpm-lock.yaml`
- Stale lockfile from expo-image-picker addition caused EAS Install dependencies failure.

## 2026-04-10 — fix: EAS Build npm legacy-peer-deps
- **Commit**: `5b9f85e`
- **Files**: `.npmrc`
- Added `legacy-peer-deps=true` to prevent peer deps conflict in EAS builds.

## 2026-04-10 — refactor: Code structure cleanup — component extraction + shared constants
- **Commit**: `b0250f1`
- **Files**: `SocialScreen.tsx`, `SettingsScreen.tsx`, `FocusScreen.tsx`, `NowAlertOverlay.tsx`, `StatsScreen.tsx`, `SocialContext.tsx`, `VoiceRecorder.tsx`, `SocialToasts.tsx` (new), `NumberInput.tsx` (new), `constants.ts` (new), `i18n.ts`
- Extracted PokeToast/PeerAlertToast (150 lines) → `SocialToasts.tsx`.
- Extracted NumberInput (170 lines) → `NumberInput.tsx`.
- Extracted TOMATO_IMAGES/VIBRATION patterns → `constants.ts`.
- VoiceRecorder: unmount cleanup + i18n (removed Korean hardcoding).
- Net +402/-370 lines deduplication.

## 2026-04-09 — feat: Full app i18n — Korean/English toggle
- **Commit**: `375ef27`
- **Files**: `i18n.ts` (new), all screens/components
- I18nProvider + useI18n pattern. Language toggle in Settings screen.

## 2026-04-09 — feat: NOW! alert composed from individual letter images
- **Commit**: `00f8f9b`
- **Files**: `NowAlertOverlay.tsx`, `assets/images/Now_N.png` etc.
- Replaced text rendering with N/O/W/! individual image assets.

## 2026-04-08 — fix: Remove silent catches + JWT hardcoded fallback
- **Commit**: `2ea146c`
- **Files**: `AuthContext.tsx`, `jwt.ts`
- Security: removed error-swallowing catch blocks and hardcoded JWT secret fallback.

## 2026-04-08 — feat: Photo-to-avatar conversion quality v3
- **Commit**: `120315d`
- **Files**: `PixelEditor.tsx`, `image.ts`
- 72-color palette + Lab color space + Floyd-Steinberg dithering.

## 2026-04-07 — feat: Photo-to-dot avatar conversion
- **Commits**: `3644c78` ~ `290f54e` (multiple iterations)
- Photo → server resize → 72-color quantization → 32x32 dot grid. Multiple fixes for B&W issues.

## 2026-04-06 — fix: Voice poke iOS support
- **Commits**: `fe03336`, `b7c6b4e`, `a953a63`, `b895380`, `5a099d1`
- webm → m4a format. Temp file approach instead of data URI. expo-file-system/legacy import. Server-side legacy recording auto-migration. Auto-restore on app reload.

## 2026-04-05 — fix: Poke popup → top banner + 10s cooldown
- **Commit**: `d9e762e`
- Poke notification from full-screen modal → top banner. Anti-spam cooldown.

## 2026-04-05 — feat: Block team NOW! ignore alerts during focus
- **Commit**: `997c3f3`
- DND mode: suppress team member NOW! ignore notifications during focus sessions.

## 2026-04-04 — fix: Focus screen layout jitter fix
- **Commits**: `c92b41c`, `5447d4f`
- Fixed-size containers to eliminate layout jitter. Removed unnecessary fixed heights.

## 2026-04-03 — feat: EAS build config + drag number input + DND mode
- **Commits**: `ee426b8`, `0d33c9e`
- `eas.json` internal distribution profile. NumberInput PanResponder drag. DND toggle.

## 2026-04-02 — feat: Phase 4 — Stats & gamification
- **Commits**: `b881ebf` ~ `90cc1ee` (multiple)
- StatsScreen: daily work time, completed sessions, NOW! compliance rate, reaction time chart. Team leaderboard.

## 2026-04-01 — feat: Phase 3 — Social & team sync
- **Commits**: `4f10e45` ~ `4f140c8`
- SSE-based real-time team state. Multi-team tabs. Push notifications. Poke. Voice poke.

## 2026-03-31 — feat: Phase 2 — NOW! escalation & alert sound enhancement
- **Commits**: `8774419` ~ `bd6e857`
- 5-level escalation. MP3 alert sounds. Level-based volume/vibration patterns.

## 2026-03-30 — feat: Phase 1 MVP
- **Commit**: `aaf5233`
- Basic pomodoro timer. Focus/break cycles. Session counter.
