# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### NOW! Timer (`artifacts/now-timer`)
- **Kind**: web (React + Vite)
- **Port**: 24250
- **Preview path**: `/`
- **Purpose**: Focus timer app that hides countdown anxiety — shows only "집중 중..." during work, fires bold "NOW!" alerts at transitions
- **Stack**: React, Vite, Tailwind CSS v4, framer-motion, wouter, lucide-react
- **State**: `TimerContext` — phases: idle → focusing → nowAlert → breaking → returnAlert
- **Timer engine**: `Date.now()` timestamp-based (background-tab safe)
- **Sound**: Web Audio API synthesis (bell/chime/soft), no external files
- **Storage**: localStorage key `now-timer-settings`
- **Routes**: `/` (FocusPage), `/social` (SocialPage), `/stats` (StatsPage), `/settings` (SettingsPage)
- **Stats**: `lib/statsStorage.ts` (localStorage), `hooks/useStatsTracker.ts` tracks phase transitions
- **Phase 1 MVP**: ✅ Done — idle/focus/break cycle, NOW! overlay, settings page
- **Phase 2**: ✅ Done — Escalating NOW! alerts (Lv.1→Lv.3 with red screen takeover)
- **Phase 3**: ✅ Done — Social accountability, multi-team tabs, SSE realtime, poke feature
- **Phase 4**: ✅ Done — Backend stats API, daily compliance tracking, leaderboard, streak
- **Phase 5**: ✅ Done — User accounts (username+password auth), JWT tokens, server-side membership sync across devices

## Auth System (Phase 5)
- **AuthContext** (`context/AuthContext.tsx`) — login/register/logout state, `linkMembership`/`unlinkMembership`
- **LoginPage** (`pages/LoginPage.tsx`) — login + register form with tab toggle
- **Auth storage**: `lib/authStorage.ts` — JWT in localStorage (`now-timer-auth-token`)
- **Backend**: `lib/userStore.ts` (bcrypt passwords, JSON persistence), `lib/jwt.ts` (30d tokens), `routes/auth.ts`
- **Membership sync**: On team join/create → saved to server account; on login → server memberships merged into localStorage
- **API routes**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/link-membership`, `DELETE /api/auth/link-membership/:code`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
