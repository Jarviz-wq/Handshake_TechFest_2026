# Handshake.sh — Development Log

Module-by-module build history: design decisions, what was verified vs. assumed, and why. For setup instructions, see the main README.md instead.

---

# Original module notes

## Module 1: Prisma schema, migration, seed script — status

**What's done:** schema, initial migration SQL, seed script, env template.
**What's NOT verified yet:** none of this has been run against a real database or through the Prisma CLI. This sandbox has no network access to Prisma's engine binaries (`binaries.prisma.sh` is blocked), so `prisma validate`, `prisma generate`, and `prisma migrate diff` all fail here regardless of database connectivity. The migration SQL in `prisma/migrations/20260101000000_init/` was hand-written to match the schema, not tool-generated — treat it as a reviewable draft.

### Setup (run these yourself — this is the real verification step)

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL and DIRECT_URL from your Supabase project settings
# (Project Settings → Database → Connection string — pooled for DATABASE_URL,
# direct for DIRECT_URL)

npx prisma validate          # confirms schema.prisma is syntactically correct
npx prisma generate          # generates the Prisma Client
npx prisma migrate dev       # applies the migration, or regenerates it if
                              # the hand-written SQL doesn't match what Prisma
                              # would produce — in which case, trust Prisma's
                              # output over the committed file and let me know
                              # so I can reconcile it before Module 2

npm run db:seed              # populates 10 users, 5 handshake codes, 3 verified handshakes
```

If `prisma migrate dev` reports drift against the committed migration, that means my hand-written SQL had a discrepancy — don't force-resolve it silently; flag it back to me.

### Seed data reference

| | |
|---|---|
| Users | 9 participants + 1 admin |
| Shared password | `TechFest2026!` (all seeded users) |
| Admin login | `admin` / `TechFest2026!` |
| Verified handshakes | 3 pairs (rahul12↔meera19, devika03↔nikhil88, priya21↔farhan15) |
| Active code | `AB7XK2` (owned by yadu24, valid for 2 min from seed run time) |
| Expired code | `PQ9RT4` (owned by arya07, already past expiry) |

### Design decisions in this module

- **Table names mapped to snake_case** (`@@map`) while columns stay camelCase — standard Prisma/Postgres convention; Prisma quotes identifiers either way so this only affects how the tables look if you ever query them outside Prisma.
- **`userLowId`/`userHighId` sorted in application code, not the DB** — Prisma can't express `LEAST()/GREATEST()` in its schema language; sorting before insert gets the same order-independent uniqueness guarantee without a raw SQL migration.
- **Seed script is idempotent** (`upsert`, not `create`) — safe to re-run during development without wiping or erroring.
- **`DIRECT_URL` added beyond the original architecture doc** — Supabase's pooled connection (pgbouncer, transaction mode) doesn't support the DDL operations Prisma Migrate needs. This is a one-line addition, not a design change, but worth knowing before you fill in `.env`.

---

## Module 2: Express app, JWT auth, login endpoint — status

**What's done:** full Express app skeleton, centralized error handling, Zod request validation, JWT authentication middleware, login rate limiting, structured logging, graceful shutdown.

**What's verified:** the entire require-graph and env validation boots cleanly — confirmed by actually running `node src/server.js` in this sandbox. It fails at exactly one point: instantiating `PrismaClient`, because no client has ever been generated here (same `binaries.prisma.sh` network block from Module 1). Once you run `npx prisma generate` locally, this should boot the rest of the way — but that final step is on you to confirm, same caveat as Module 1.

### New endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | none | infra health check, outside `/api` |
| POST | `/api/auth/login` | none | rate-limited: 5 attempts / 15 min per IP |
| GET | `/api/auth/me` | required | returns profile + live-computed rank |

### Setup (continuing from Module 1)

```bash
npm install                # picks up Express + auth dependencies
npx prisma generate        # required before the app will boot — see note above
npm run dev                # starts on PORT from .env, auto-restarts on file changes
```

Test the login flow against seeded data:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"yadu24","password":"TechFest2026!"}'

# copy the returned token, then:
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Design decisions in this module

- **Express 5**, not 4 — `npm install express` resolved to v5 as the current default. Express 5 auto-forwards rejected promises from route handlers to the error handler, which makes `asyncHandler` technically redundant for final route handlers — I kept it anyway (applied to controllers *and* the auth middleware) because it's harmless, makes the pattern consistent everywhere, and keeps the code portable if this project ever needs to run under Express 4 for any reason.
- **Login timing-attack mitigation**: when the username doesn't exist, the service still runs a bcrypt compare against a dummy hash before returning, so a nonexistent-username response doesn't come back measurably faster than a wrong-password response.
- **Deactivation status checked *after* password verification**, not before — otherwise someone who doesn't know a valid password could still learn whether a given username belongs to a deactivated account, just by trying it.
- **Rank is computed live** (a single indexed `COUNT` query), not cached — at hundreds of participants this is cheap, and a cached/stale rank would be actively wrong every time anyone's count changes, which during a live event is constantly.
- **`.gitignore` added** — wasn't part of Module 1's deliverables and should have been; adding it now before any `.env` or `node_modules` accidentally ends up committed.
- **Rate limiting is per-endpoint, not global** — `loginRateLimit` is scoped to `/auth/login` specifically. `verify-code` in Module 3 will need its own, tighter, per-user (not per-IP) limit, so a single shared limiter would already be the wrong shape by the next module.

### Known non-blocking issue (carried from Module 1)

`npm audit` still reports 3 moderate vulnerabilities, all inside Prisma's own dev-tooling dependency chain (`@prisma/dev` → `@hono/node-server`) — not reachable from any code this app actually runs. Not fixing this by force-downgrading Prisma over a dev-only transitive dependency.

---

## Post-Module-2 improvements

Six small changes requested before Module 3, applied on top of the approved Module 2:

1. **Pinned every dependency to its exact resolved version** in `package.json` (no more `^` ranges) — a floating range means `npm install` on deploy day could silently pull a different minor/patch version than what was tested. Exact versions plus the committed lockfile means what you tested is what deploys.
2. **Helmet** — already present since Module 2, confirmed still correctly wired (first middleware in the chain).
3. **CORS via `ALLOWED_ORIGINS`** — comma-separated env var. In production, an empty value rejects all cross-origin requests (safe-by-default); in development, an empty value allows any origin, so local frontend testing doesn't require touching `.env`. Requests with no `Origin` header at all (curl, server-to-server, some mobile webviews) are always allowed through, since CORS is a browser-enforced concept, not a general access control.
4. **Graceful shutdown** — already present since Module 2 (SIGINT, SIGTERM, `prisma.$disconnect()`, bounded force-exit timeout), re-verified correct, unchanged.
5. **Global 404 handler** — already present since Module 2, re-verified it's correctly positioned after every route and before `errorHandler`, unchanged.
6. **Consistent response envelope** — every endpoint (including `/health`) now returns:
   ```
   { "success": true,  "message": "...", "data": {...} }
   { "success": false, "message": "...", "error": {...} }
   ```
   Added `src/utils/apiResponse.js` (`sendSuccess`) so this shape is enforced by a shared helper rather than by convention — a controller can't accidentally return a differently-shaped success response without deliberately bypassing the helper.

Re-verified after these changes: full boot test still passes through env validation and the entire middleware/route chain, failing at the same expected point (ungenerated Prisma client) as before — no regressions introduced.

---

## Module 3: Handshake code generation & verification — status

**New tables:** `handshake_logs` (audit trail — see below).
**New migrations:** `20260102000000_add_one_active_code_constraint` (partial unique index), `20260103000000_add_handshake_logs`.
**New endpoints:**

| Method | Path | Notes |
|---|---|---|
| POST | `/api/handshake/generate` | returns existing active code if one exists, otherwise mints one |
| POST | `/api/handshake/verify` | rate-limited: 10/min **per user** (not per IP) |
| GET | `/api/handshake/my-code` | read-only, does not create a code |
| GET | `/api/handshake/history` | paginated via `?limit=` (default 20, max 100) |

Same verification status as every prior module: full boot test passes through the entire require-graph, fails at the same expected point (Prisma client never generated in this sandbox). Nothing here has touched a live database.

### How concurrency is handled

Two different mechanisms, for two different race conditions:

1. **Double redemption of the same code** — handled by an atomic `updateMany` "claim" (`WHERE id = ? AND usedAt IS NULL`), not by `SELECT` then `UPDATE`. If two requests submit the same code at the same instant, Postgres serializes the two `UPDATE` statements against that row — only one can possibly match `usedAt IS NULL` by the time it executes, so exactly one gets `count: 1` and proceeds; the other gets `count: 0` and returns `CODE_ALREADY_USED`. Prisma's transaction wrapper isn't what provides this guarantee — the atomicity of a single `UPDATE` statement in Postgres is.

2. **Two active codes for one user** — handled by a database-level partial unique index (`UNIQUE(ownerId) WHERE usedAt IS NULL`), added specifically because an application-level "check, then create" has an unavoidable timing window between the check and the write. A double-tap on "Initiate Handshake" could otherwise pass the check twice before either request had written anything. The index makes that outcome physically impossible at the database level, regardless of application timing — and the service still handles the resulting rare `P2002` gracefully (re-fetches and returns whichever code actually won), rather than surfacing an error to a user who just tapped a button once.

### Why the partial unique index was necessary

Prisma's schema DSL has no way to express "unique, but only among rows matching a condition" — that's a Postgres-specific feature (a filtered index) that has to be written as raw SQL in a migration. Without it, "one active code per user" would only be a *convention* enforced by application code checking before writing — which is exactly the kind of guarantee that silently breaks under concurrent load. This is the one piece of Module 3 that couldn't be built purely through the Prisma Client API.

### How duplicate handshakes are prevented

The `@@unique([userLowId, userHighId])` constraint from the approved schema (Module 1) is the actual authority — not a pre-check query. The service doesn't ask "has this pair already connected?" before inserting; it attempts the insert directly and catches the resulting `P2002` unique-violation as the definitive signal. A pre-check-then-insert has the same TOCTOU race as the code-claim problem above; relying on the constraint itself sidesteps that entirely, because the database enforces it atomically at the moment of insertion.

### How database transactions guarantee consistency

Everything from "the code is valid" through "both users' handshakeCount incremented" happens inside one `prisma.$transaction`. If any step fails — the claim, the insert, either increment — every prior write in that same transaction rolls back. There's no possible intermediate state where a code is marked used but no handshake was created, or a handshake exists but only one user's count went up.

The one deliberate exception: **audit logging for failures happens outside the transaction, on purpose.** If a `CODE_EXPIRED` log entry were written inside the transaction that's about to roll back (because that's exactly when we know it expired), the log entry would be rolled back along with everything else — silently defeating the audit trail's actual purpose. Failure logs are written via the plain client, after the transaction has already aborted. Success logs (`CODE_GENERATED`, `CODE_VERIFIED`) are written inside the transaction, since those should only exist if the operation they describe actually committed.

### How duplicate/repeated requests stay idempotent

- **Generate**: calling it twice in a row (or twice concurrently) never produces two active codes — either the second call sees the first's code already active and returns it, or (under true concurrency) the partial unique index forces the same outcome.
- **Verify**: deliberately *not* idempotent in the sense of "safe to retry and get the same success" — resubmitting an already-used code correctly returns `CODE_ALREADY_USED` rather than silently succeeding again. That's the correct behavior here, not a gap: a handshake is a one-time event, and a repeat submission should be rejected, not quietly no-op'd.

### How code expiration works

There's no background sweeper marking codes "expired" the moment their clock runs out — expiry is checked live, at the moment a code is read, by comparing `expiresAt` against `now()` in the query itself (`expiresAt: { gt: now }` when looking for an "active" code; `codeRow.expiresAt <= now` as an explicit check during verification). This means correctness never depends on a scheduled job having run recently — a code that expired one second ago is already correctly treated as expired on the very next request that touches it, with zero lag. A background job (mentioned in the architecture doc) still has a place, but only for hygiene — hard-deleting rows older than 24h to keep the table small — never for correctness.

### Audit logging (`handshake_logs`)

Six events, exactly as specified: `CODE_GENERATED`, `CODE_VERIFIED`, `CODE_EXPIRED`, `INVALID_CODE`, `DUPLICATE_HANDSHAKE`, `VERIFICATION_FAILED`. Two failure modes without a dedicated event name in the spec — a self-handshake attempt and a resubmitted already-used code — are both logged as `VERIFICATION_FAILED`, since the six-event vocabulary was given as fixed rather than open to extension.

The table has no foreign keys to `users` — audit rows are meant to outlive the data they describe (an admin hard-deleting a mis-imported participant shouldn't cascade-delete that participant's log history, or be blocked because it would).

### Error responses — all 4xx, never a generic 500 for an expected condition

| Situation | Code | HTTP |
|---|---|---|
| Code doesn't exist / already fully used and gone | `CODE_NOT_FOUND` | 404 |
| Code exists but past `expiresAt` | `CODE_EXPIRED` | 410 |
| Code exists, unexpired, but `usedAt` already set (including the concurrent-claim-loser case) | `CODE_ALREADY_USED` | 409 |
| Submitter is the code's own owner | `SELF_HANDSHAKE` | 400 |
| This pair has already connected (including the concurrent-insert-loser case) | `DUPLICATE_PAIR` | 409 |
| Zod rejects the request shape | `VALIDATION_ERROR` | 400 |
| Too many verify attempts from this user | `TOO_MANY_ATTEMPTS` | 429 |

A genuine unexpected error (a real bug, a dropped DB connection) still falls through to `errorHandler.js`'s existing generic-500 path from Module 2 — unchanged, and still never leaks a stack trace in production.

### One infrastructure fix that came out of this module

`app.set('trust proxy', 1)` was missing from `app.js`. Without it, `req.ip` — used both for the audit log's `ipAddress` field here and for Module 2's login rate limiter — would return Railway/Render's internal proxy address for every request once deployed, not the participant's real IP. That would silently collapse Module 2's per-IP login rate limit into one shared bucket for all users behind the proxy. Fixed now, before it became a deploy-day surprise.

---

## Module 4: Dashboard & leaderboard — status

**Schema change:** one column, `users.lastVerifiedHandshakeAt`, plus a migration replacing the old `handshakeCount`-only index with a composite one. Set inside the same transaction as `handshakeCount` in `handshake.service.js` (Module 3) — the two can never drift apart. Approved before implementation, per your review.

**New endpoints:**

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/dashboard` | required | own profile, empty `pending_requests`, 5 most recent handshakes, global totals |
| GET | `/api/leaderboard` | required | `?page=&limit=` (default 1/20, max limit 100) |
| GET | `/api/profile/:username` | required | public fields only — see security section below |
| GET | `/api/stats` | required (not admin-only) | aggregate counts only, safe for any participant |

Same verification status as every prior module: full boot test passes through the complete require-graph, fails at the identical expected point (Prisma client never generated in this sandbox).

### Ranking algorithm

One algorithm, used identically by `/me`, `/dashboard`, `/leaderboard`, and `/profile/:username` — not four separate implementations that happen to agree today:

**Sort key:** `handshakeCount DESC, lastVerifiedHandshakeAt ASC` (earliest to reach a tied count ranks higher). **Tie behavior:** strict competition ranking — two users tied on both keys share a rank number, and the next distinct value skips ahead accordingly (1, 1, 3 — not 1, 1, 2). This only actually happens among users with zero handshakes (where "who connected first" is meaningless and null timestamps can't be meaningfully compared), since any real handshake has a millisecond-precision timestamp making a true tie among active participants astronomically unlikely.

**Two different implementations of the same algorithm, for a reason:**
- `getRank()` (single user — `/me`, `/dashboard`, `/profile/:username`): one indexed `COUNT` query — "how many users rank strictly ahead of me." Cheap, and there's only ever one user to check.
- `/leaderboard` (many users at once): a Postgres `RANK() OVER (ORDER BY ...)` window function in a single raw query. Calling `getRank()` once per row on a paginated page would be N+1 — exactly what this module asked to avoid. `RANK()` computes the mathematically identical value ("1 + count of rows sorting strictly ahead") for every row in one pass. Both approaches are the same formula, just computed differently depending on whether you need it for one row or many.

### Query optimizations

- **Dashboard's four pieces of data run concurrently** (`Promise.all`), not sequentially — independent reads with no dependency on each other.
- **Stats' five aggregates likewise run concurrently.**
- **Leaderboard is two queries total, regardless of page size**: one windowed `SELECT` for the page of rows (rank computed in the same pass as the data, not a second query), one `COUNT` for pagination metadata. Not N+1 under any page size or limit.
- **Every response is a strict field allowlist**, not a trimmed-down version of the internal row. `toPublicMinimalProfile` (leaderboard rows, public profile) doesn't derive from `toPublicProfile` (own-profile, includes email) by omitting fields — it's built from scratch. A future field added to the internal/own-profile shape can't silently leak into a public-facing response just because someone forgot to exclude it in one place; there's no shared code path where that field would even be *available* to leak.
- **The new composite index** (`handshakeCount, lastVerifiedHandshakeAt`) covers both the leaderboard's `ORDER BY` and the `RANK()` window function's ordering — same index serves both without needing two.

### Pagination strategy

Offset-based (`page`/`limit`), not cursor-based — matches what was asked for, and is the right tradeoff here: a leaderboard is inherently a moving target (ranks shift as handshakes happen live during the event), so cursor stability guarantees don't buy much when the underlying order changes constantly anyway. `page` and `limit` are Zod-validated (`limit` capped at 100) before touching the database, so a client can't request an unbounded page size.

### Security — what never appears in a leaderboard or public profile response

`toPublicMinimalProfile` returns exactly five fields: `username`, `full_name`, `college`, `handshake_count`, `rank`. No `id`, no `email`, no `password_hash`, no `department`, no `year`, no `is_admin`, no IP address, obviously no JWT. The raw SQL leaderboard query's `SELECT` list is equally explicit — it names exactly the columns it returns, never `SELECT *`, so there's no path by which a new column added to `User` later shows up on the leaderboard without someone deliberately adding it here.

### Known deviations from the literal request, both already discussed and approved

1. `pending_requests` in the dashboard response is always `[]` — no pending-request system exists in this architecture (Module 3, Decision #4).
2. `lastVerifiedHandshakeAt` didn't exist before this module and required touching two Module 2 call sites (`auth.service.js`, `auth.controller.js`) to keep `/me`'s rank consistent with `/leaderboard`'s. No behavior change to login itself — only the rank number's calculation.

---

*Module 5 (admin: CSV import, credential generation/export, password reset, deactivation) not started — awaiting review of this module first.*
