<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **jifa** (3644 symbols, 10027 relationships, 264 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/jifa/context` | Codebase overview, check index freshness |
| `gitnexus://repo/jifa/clusters` | All functional areas |
| `gitnexus://repo/jifa/processes` | All execution flows |
| `gitnexus://repo/jifa/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

---

# Jifa — Project Context

## Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 16 (standalone output), React 19, TypeScript 5, Tailwind CSS 4 |
| **Backend** | Go 1.26, Gin, GORM, PostgreSQL (pgx driver) |
| **State** | Zustand (client), @tanstack/react-query (server) |
| **UI libs** | axios, clsx, tailwind-merge, @dnd-kit (drag-and-drop) |

## Dev Commands

```sh
# Frontend (cd frontend/)
npm run dev        # Next.js dev server (port 3000)
npm run build      # production build
npm run lint       # ESLint

# Backend (cd backend/)
go build ./...     # compile all packages
go run ./cmd/server  # start server (port 8080, needs PostgreSQL)
```

No test or formatter commands exist. No pre-commit hooks configured.

## Project Structure

```
jifa/
├── backend/          # Go + Gin API server
│   ├── cmd/server/   # entrypoint: main.go
│   ├── config/       # env-based config
│   ├── internal/
│   │   ├── api/
│   │   │   ├── router.go        # all route definitions
│   │   │   ├── handlers/        # 29 handler files
│   │   │   └── middleware/      # auth, cors, project_auth, rate_limit
│   │   ├── mailer/              # SMTP (no-op if unconfigured)
│   │   ├── models/              # GORM models + Base (ID, CreatedAt, UpdatedAt, DeletedAt)
│   │   └── webhook/             # outgoing webhook dispatcher
│   └── pkg/database/            # Connect(), Migrate(), SeedStatuses()
├── frontend/         # Next.js 16 app
│   ├── app/          # App Router pages
│   │   ├── layout.tsx           # root layout (Geist font, Providers)
│   │   ├── providers.tsx        # QueryClient, toast, confirm, theme, hotkeys
│   │   └── projects/[id]/
│   │       ├── (tabbed)/        # route group for tabbed pages (backlog, board, etc.)
│   │       │   └── layout.tsx   # project header + tab bar
│   │       ├── settings/        # OUTSIDE route group — no tab bar, own sub-tabs
│   │       └── layout.tsx       # pass-through (only wraps settings now)
│   ├── components/              # React components
│   ├── hooks/                   # 27 React Query hooks, one per resource
│   ├── lib/api.ts               # axios instance with JWT interceptor
│   ├── store/                   # Zustand stores (toast.ts, confirm.ts)
│   └── types/index.ts           # shared TypeScript types
├── AGENTS.md         # this file
├── CLAUDE.md         # gitnexus instructions (duplicate of section above)
└── TODO.md           # feature backlog (mostly completed)
```

## Route Architecture (Frontend)

- **AppLayout** (sidebar + top nav) wraps all `/projects/*` routes via `projects/layout.tsx`.
- **`(tabbed)/` route group** under `projects/[id]/` provides project header + tab bar for: backlog, board, sprints, epics, roadmap, reports, versions, calendar, planning, wiki.
- **`settings/`** is outside `(tabbed)/` → inherits AppLayout but NOT the project tab bar. Has its own sub-tabs (members, workflow, boards, components, webhooks, audit, details).

## API Patterns (Backend)

- **Role-gated route groups**: `viewer`, `member`, `admin` — project owner is implicitly Admin (see `LookupRole()` in middleware/project_auth.go).
- **DTO pattern**: `createIssueDTO` / `updateIssueDTO` whitelist fields. Partial updates use pointer fields (nil = no change) + `clear_*` boolean flags.
- **Audit logging**: calls to `LogAudit(db, projectID, actorID, action, ...)` after mutating operations.

## Critical Gotchas

### Date Format

**HTML `<input type="date">` produces `YYYY-MM-DD` but Go `*time.Time` requires RFC3339.** Always append `T00:00:00Z` before sending. Affects: issue start/due dates, sprint start/end dates, version release dates. Example pattern:

```ts
{ start_date: `${value}T00:00:00Z` }
```

### Member Add Race Condition

`handler.Add()` uses SELECT-then-INSERT without a transaction. Under concurrent requests, the second INSERT hits `uniqueIndex:idx_member_project_user`. The fix catches `strings.Contains(err.Error(), "idx_member_project_user")` on Create error → HTTP 409.

### Watcher Soft-Delete Re-watch

The unique index `idx_watcher_unique` covers ALL rows including soft-deleted ones. After unwatch (soft-delete), re-watch silently fails because the old row blocks INSERT. `EnsureWatcher()` uses `Unscoped().First()` to detect soft-deleted rows and restores them via `UpdateColumn("deleted_at", nil)` instead of creating a new row.

### Toast & Confirm

These are Zustand stores, not React context. Call as plain functions (no hooks):

```ts
import { toast } from "@/store/toast";
toast("Saved!", "success");

import { showConfirm } from "@/store/confirm";
const ok = await showConfirm({ title: "Delete?", message: "...", variant: "danger" });
```

`<ToastContainer />` and `<ConfirmDialog />` are already mounted in `providers.tsx`.

### Auth & API

- JWT token in `localStorage.getItem("token")` + cookie for SSR middleware.
- 401 auto-redirects to `/login` (axios interceptor in `lib/api.ts`).
- `NEXT_PUBLIC_BASE_PATH` env var for reverse proxy deployments — used in `next.config.ts` and middleware.

### Backend Startup

- `godotenv.Load()` called at startup — `.env` file optional but loaded if present.
- `database.Migrate(db)` runs GORM AutoMigrate on every boot (safe, additive only).
- `database.SeedStatuses(db)` backfills default statuses for projects missing them.
- SMTP not required — mailer is no-op when SMTP_HOST is empty.

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
