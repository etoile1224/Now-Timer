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
- **Routes**: `/` (FocusPage), `/settings` (SettingsPage)
- **Phase 1 MVP**: ✅ Done — idle/focus/break cycle, NOW! overlay, settings page
- **Phase 2**: Escalating NOW! alerts (Lv.1→Lv.3 with red screen takeover) — planned
- **Phase 3**: Social accountability / friend push notifications — planned
- **Phase 4**: Session statistics and reaction speed tracking — planned

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
