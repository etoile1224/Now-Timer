# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL (raw pool via `@workspace/db`)
- **Build**: esbuild (CJS bundle)

## Artifacts

### NOW! Timer (`artifacts/now-timer`)
- **Kind**: web (React + Vite)
- **Port**: 24250
- **Preview path**: `/`
- **Purpose**: Korean focus timer app — hides countdown anxiety, fires bold "NOW!" alerts at transitions, team social accountability
- **Stack**: React, Vite, Tailwind CSS v4, framer-motion, wouter, lucide-react
- **State**: `TimerContext` — phases: idle → focusing → nowAlert → breaking → returnAlert
- **Timer engine**: `Date.now()` timestamp-based (background-tab safe)
- **Sound**: Web Audio API synthesis (ember AI voice), `public/alert.mp3`
- **Storage**: localStorage key `now-timer-settings`
- **Routes**: `/` (FocusPage), `/social` (SocialPage), `/stats` (StatsPage), `/settings` (SettingsPage)
- **Stats**: `lib/statsStorage.ts` (localStorage), `hooks/useStatsTracker.ts` tracks phase transitions
- **Layout**: Fully responsive — mobile bottom nav (`NavBar.tsx`, `lg:hidden`), desktop left sidebar (`Sidebar.tsx`, `hidden lg:flex`)
- **Phase 1 MVP**: ✅ Done — idle/focus/break cycle, NOW! overlay, settings page
- **Phase 2**: ✅ Done — Escalating NOW! alerts (Lv.1→Lv.3 with red screen takeover)
- **Phase 3**: ✅ Done — Social accountability, multi-team tabs, SSE realtime, poke feature
- **Phase 4**: ✅ Done — Backend stats API, daily compliance tracking, leaderboard, streak
- **Phase 5**: ✅ Done — User accounts (username+password auth), JWT tokens, server-side membership sync across devices
- **Phase 6**: ✅ Done — PostgreSQL persistence (all data survives redeploy), responsive layout

## Auth System (Phase 5)
- **AuthContext** (`context/AuthContext.tsx`) — login/register/logout state, `linkMembership`/`unlinkMembership`
- **LoginPage** (`pages/LoginPage.tsx`) — split-screen login: dark branding panel (lg) + form panel
- **Auth storage**: `lib/authStorage.ts` — JWT in localStorage (`now-timer-auth-token`)
- **Backend**: `lib/userStore.ts` (bcrypt passwords, PostgreSQL), `lib/jwt.ts` (30d tokens), `routes/auth.ts`
- **Membership sync**: On team join/create → saved to server account; on login → server memberships merged into localStorage
- **API routes**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/link-membership`, `DELETE /api/auth/link-membership/:code`

## Backend DB Migration (Phase 6)
- **All persistence is PostgreSQL** — no more JSON files that get wiped on redeploy
- **`lib/db.ts`**: Thin wrapper around `@workspace/db` pool — `query<T>()`, `queryOne<T>()`, `run()`
- **`lib/userStore.ts`**: Full PostgreSQL — `users`, `user_memberships` tables
- **`lib/teamStore.ts`**: Hybrid — in-memory Maps for SSE hot path, DB as source of truth; `initTeams()` loads on startup; writes are fire-and-forget async
- **`lib/statsStore.ts`**: Full PostgreSQL — `member_sessions`, `member_reactions`, `daily_compliance` tables
- **`index.ts`**: Calls `await initTeams()` before `app.listen()`
- **DB Tables**: `users`, `user_memberships`, `teams`, `team_members`, `member_tokens`, `member_sessions`, `member_reactions`, `daily_compliance`

## Responsive Layout (Phase 6)
- **Mobile** (< 1024px): Bottom nav bar (`NavBar.tsx`) with `lg:hidden`
- **Desktop** (≥ 1024px): Left sidebar (`Sidebar.tsx`) with `hidden lg:flex fixed w-56`
- **App.tsx**: `<div className="lg:pl-56">` wraps all routes to offset content from sidebar
- **All pages**: `pb-20 lg:pb-8` for bottom padding, `max-w-md lg:max-w-xl+` for wider containers
- **LoginPage**: Split-screen on desktop (dark branding left, form right)
- **SettingsPage**: 2-column grid on desktop (`lg:grid lg:grid-cols-2`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
