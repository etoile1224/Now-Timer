# NOW!! Pomodoro — Full-Stack Mapping

> Feature-level mapping of Frontend ↔ Backend ↔ DB tables. Updated on changes.

## Screen → API → DB

| Feature | Mobile Screen / Context | API Endpoint | DB Table | Notes |
|---------|------------------------|-------------|----------|-------|
| **Login / Register** | `LoginScreen.tsx` → `AuthContext.tsx` | `POST /auth/register`, `POST /auth/login` | `users` | JWT issued → stored in `authStorage.ts` |
| **My Profile** | `AuthContext.tsx` | `GET /auth/me` | `users`, `userMemberships` | Auto-fetched on app start |
| **Create Team** | `SocialScreen.tsx` | `POST /teams` | `teams` | Auto-generated code |
| **Join Team** | `SocialScreen.tsx` | `POST /teams/join` | `teams`, `teamMembers`, `memberTokens` | QR code / manual entry |
| **Link Membership** | `AuthContext.tsx` | `POST /auth/link-membership` | `userMemberships` | For cross-device sync |
| **Real-time Team State** | `SocialContext.tsx` | `GET /teams/:code/stream` (SSE) | `teamMembers` | 25s heartbeat |
| **Member Status Update** | `SocialContext.tsx` | `PATCH /members/:id` | `teamMembers` | status, ignoreLevel, reactionMs |
| **Poke** | `SocialScreen.tsx` → `SocialToasts.tsx` | `POST /members/:fromId/poke/:toId` | — | Delivered via SSE to target |
| **Voice Poke Upload** | `VoiceRecorder.tsx` | `POST /auth/voice` | `users` (voice_data) | base64, max 200KB |
| **Voice Poke Playback** | `SocialToasts.tsx` | `GET /members/:id/voice` | `teamMembers` (voice_poke) | Lazy fetch |
| **Push Token Register** | `pushNotifications.ts` | `POST /members/:id/push-token` | `teamMembers` (push_token) | Expo push token |
| **Avatar View** | `PixelAvatar.tsx` | `GET /members/:id/avatar` | `teamMembers` (avatarData) | SSE delta broadcast |
| **Avatar Edit** | `PixelEditor.tsx` | `PATCH /members/:id` (avatarData) | `teamMembers` | 32x32 grid JSON |
| **Stats Query** | `StatsScreen.tsx` | `GET /stats/:memberId` | `memberSessions`, `memberReactions`, `dailyCompliance` | period=today/week/all |
| **Session Recording** | `useStatsTracker.ts` | `PATCH /members/:id` | `memberSessions` | Auto-recorded on session completion |
| **Photo→Dot Conversion** | `PixelEditor.tsx` | `POST /api/image/dot-avatar` | — | Server-side resize + quantization |
| **Timer** | `FocusScreen.tsx` → `TimerContext.tsx` | — (local only) | — | State is local, broadcast to team via SSE |
| **NOW! Alert** | `NowAlertOverlay.tsx` | — (local only) | — | Local sound + vibration + overlay |
| **Background Alerts** | `TimerContext.tsx` → `pushNotifications.ts` | — (local only) | — | expo-notifications local scheduling |
| **Health Check** | — | `GET /api/healthz` | — | Railway deployment monitoring |

## Local-Only Storage

| Store | File | Contents |
|-------|------|----------|
| `authStorage.ts` | AsyncStorage | JWT token, user ID |
| `teamStorage.ts` | AsyncStorage | Team memberships (code, memberId, token) |
| `statsStorage.ts` | AsyncStorage | Local stats cache (pre-server sync) |
| `timerSettings.ts` | AsyncStorage | Timer settings (work/break duration, escalation speed) |
| `storage.ts` | AsyncStorage | General-purpose KV wrapper |

## Shared Libraries

| Package | Location | Used By |
|---------|----------|---------|
| `@now/db` | `lib/db/` | API server — Drizzle ORM schema |
| `@now/api-zod` | `lib/api-zod/` | (future) API request/response validation |
