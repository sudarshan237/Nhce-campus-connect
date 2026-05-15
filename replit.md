# NHCE Campus Connect

A complete full-stack college internal platform for New Horizon College of Engineering — featuring a social feed, complaint tracking, event registrations, placement board, feedback system, lost & found, and admin panel.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/campus-connect run dev` — run the frontend (port 19048, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4 + shadcn/ui
- API: Express 5 + custom JWT auth (bcryptjs + jsonwebtoken)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — source of truth for all DB tables
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks and Zod schemas
- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/campus-connect/src/pages/` — all frontend page components
- `artifacts/campus-connect/src/contexts/AuthContext.tsx` — JWT auth context
- `artifacts/campus-connect/src/lib/api.ts` — generic authenticated fetch helper

## Architecture decisions

- JWT auth stored in `localStorage` as `nhce_token`, sent as `Authorization: Bearer <token>` on every request
- Custom `apiFetch` wrapper in `lib/api.ts` automatically injects the token; no session cookies
- `custom-fetch.ts` also auto-injects token for generated Orval hooks
- All IDs are `nanoid()` text strings (not UUID), matching `text` primary keys in Drizzle schema
- Admin detection is via `isAdmin: boolean` field on the user (not role string) — role strings are display-only

## Product

- **Login / Register** — JWT-based auth for students, faculty, and admin
- **Dashboard** — personalized stats, upcoming events, open placements, recent posts
- **Campus Feed** — social posts with categories, likes, comments, pin (admin), anonymous posting
- **Complaints** — file/track complaints with status timeline; admin can update status with notes
- **Events** — browse/register for events; admin can create events
- **Placements** — browse job listings; save/bookmark and track applications; admin posts new drives
- **Feedback** — rate teachers, canteen, facilities etc. with star rating; optional anonymity
- **Lost & Found** — report lost/found items with location and contact
- **Notifications** — in-app notifications with read/unread state, mark-all-read
- **Admin Panel** — user management, role editing
- **Profile** — view and edit academic info

## User preferences

- Admin credentials: admin@nhce.edu / NHCEAdmin@2026!
- Student test credentials: student1@nhce.edu–student10@nhce.edu / Student@123
- All error messages include: "Please contact: patil.sudu237@gmail.com"

## Gotchas

- Run `pnpm --filter @workspace/db run push` before first launch on a fresh DB
- The DB schema includes a `clerk_id` column from the template; it's always `null` in this app (we use JWT)
- Toggle endpoints (like, register, save) are all `POST` — they check and flip current state; don't call with DELETE
- `pnpm --filter @workspace/api-spec run codegen` must be re-run after any OpenAPI spec changes
- Always restart the API server workflow after editing route files (esbuild rebuild)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
