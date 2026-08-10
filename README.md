# Handshake.sh — Backend

Backend API for Handshake.sh, the networking platform for an inter-college TechFest. Node.js, Express, PostgreSQL (Supabase), Prisma, JWT.

For design decisions and the module-by-module build history, see [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md). For the full API reference, see [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md). For wiring this up to the existing frontend, see [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md).

---

## Setup on a fresh machine

### 1. Install Node.js

Node 20 or later. Check what you have:
```bash
node --version
```
If you need to install it: [nodejs.org](https://nodejs.org) (LTS release), or via a version manager like `nvm`.

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Supabase (the database)

1. Go to [supabase.com](https://supabase.com), sign up, create a new project.
2. Wait for provisioning (~2 minutes).
3. In the project dashboard: **Project Settings → Database → Connection string.**
4. You need **two** connection strings, not one:
   - **Pooled** (port `6543`, has `?pgbouncer=true`) → this becomes `DATABASE_URL`. Used by the running app.
   - **Direct** (port `5432`) → this becomes `DIRECT_URL`. Used only by Prisma Migrate — pgbouncer's transaction pooling mode doesn't support the DDL operations migrations need.

### 4. Configure environment variables
```bash
cp .env.example .env
```
Open `.env` and fill in:

| Variable | How to get it |
|---|---|
| `DATABASE_URL` | Supabase pooled connection string (step 3) |
| `DIRECT_URL` | Supabase direct connection string (step 3) |
| `JWT_SECRET` | Generate with `openssl rand -base64 48` — must be 32+ characters |
| `ALLOWED_ORIGINS` | Leave empty for local dev. Required in production — see below |

Everything else in `.env.example` has a sensible default and can be left as-is for local development.

### 5. Generate the Prisma client
```bash
npm run prisma:generate
```

### 6. Run migrations
```bash
npm run migrate:dev
```
This applies all five migrations in order and creates the schema in your Supabase database. If Prisma reports drift against any committed migration file, **trust Prisma's output, not the committed file** — every migration in this repo was originally written without live database access (see the development log for why) and should be treated as a reviewable draft until this step confirms it.

### 7. Seed the database
```bash
npm run db:seed
```
Creates 9 participants + 1 admin account, 3 pre-verified handshakes, and a couple of test handshake codes. Safe to re-run — it's idempotent.

**Seed login credentials** (all users share one password for local testing):
- Admin: `admin` / `TechFest2026!`
- Participant example: `yadu24` / `TechFest2026!`

### 8. Run it
```bash
npm run dev
```
Starts on `http://localhost:3000` (or whatever `PORT` is set to), auto-restarts on file changes. Confirm it's alive:
```bash
curl http://localhost:3000/health
```

For a plain run without auto-restart: `npm start`.

---

## Deploying to production

### Supabase (production database)

Same as local setup — you can reuse the same Supabase project, or create a separate one for production if you want local dev and production fully isolated (recommended if you'll be actively developing against this after the event has data in it).

### Railway (API hosting)

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo (push this project to a GitHub repo first if it isn't already).
2. Railway auto-detects Node.js and runs `npm install` + `npm start`.
3. Add a **Deploy → Start Command** override if needed: `npm start` (should be picked up automatically from `package.json`).
4. Set **all** environment variables from the table below in Railway's Variables tab.
5. Add a **release/deploy hook** to run migrations on every deploy — in Railway's settings, set a pre-deploy or post-deploy command:
   ```bash
   npx prisma migrate deploy
   ```
   (`migrate deploy`, not `migrate dev` — `dev` is interactive and prompts, `deploy` is the non-interactive one meant for CI/deploy pipelines.)
6. Railway provides a public URL automatically (`https://<your-service>.up.railway.app`). Note it — the frontend needs it.

### Render (alternative to Railway)

A `render.yaml` blueprint is included at the project root, so this is close to one-click:

1. [render.com](https://render.com) → New → Blueprint → connect the repo. Render reads `render.yaml` automatically and pre-fills the service (build command, start command, health check path, and a migration step run before each deploy).
2. Render will prompt for every variable marked `sync: false` in `render.yaml` — that's `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`. Fill those in from Supabase (and generate a fresh `JWT_SECRET` — don't reuse the local dev one).
3. Everything else (`NODE_ENV`, `JWT_EXPIRY`, `BCRYPT_ROUNDS`, code length/expiry) is already set with production defaults in the blueprint.
4. Render's free tier **spins down after inactivity** and takes a noticeable moment to wake back up on the next request — a real risk during a live event if the API goes cold between bursts of activity. If budget allows, the paid "Starter" plan (already what `render.yaml` specifies) avoids this; Railway doesn't have this particular tradeoff on its default tier, which is why the instructions above lead with Railway.
5. Render also provides a public URL automatically (`https://<your-service>.onrender.com`).

You only need one of Railway or Render, not both — pick based on the tradeoff in step 4.

### Production environment variables

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase pooled connection string |
| `DIRECT_URL` | Supabase direct connection string |
| `JWT_SECRET` | A **different** secret than local dev — generate fresh with `openssl rand -base64 48` |
| `JWT_EXPIRY` | `12h` (or adjust — see development log for reasoning) |
| `ALLOWED_ORIGINS` | Your deployed frontend's exact origin, e.g. `https://handshake-sh.netlify.app` — **do not leave this empty in production**, it defaults to rejecting all cross-origin requests when empty and `NODE_ENV=production` |
| `BCRYPT_ROUNDS` | `12` |
| `HANDSHAKE_CODE_LENGTH` | `6` |
| `HANDSHAKE_CODE_EXPIRY_MINUTES` | `2` |
| `PORT` | Railway sets this automatically — don't hardcode it |

### Netlify (frontend hosting)

The frontend is static HTML/CSS/JS — no build step. In Netlify:
1. Drag-and-drop deploy, or connect the frontend's repo/folder.
2. No environment variables needed on Netlify's side *unless* the frontend's JS reads the API base URL from one — if so, set it there to match Railway's deployed URL from above.
3. Once both are live, update `ALLOWED_ORIGINS` on Railway to the exact Netlify URL, and redeploy the backend so CORS actually allows it.

### First admin account

The seed script creates one (`admin` / `TechFest2026!`) — **change this password immediately after your first production deploy**, since it's a publicly-known credential (it's in this repo's own seed script). There's no self-service password change endpoint yet; the fastest path is:
1. Log in as `admin` to get a token.
2. Use `PUT /api/admin/participants/admin/reset-password` — wait, this only works if `admin` weren't excluded from participant-management endpoints (it is, deliberately — see `API_DOCUMENTATION.md`). Practically: connect to the production database directly (Supabase's SQL editor) and update the `admin` row's `passwordHash` with a freshly bcrypt-hashed password, or run a small one-off script locally against the production `DATABASE_URL` that does `bcrypt.hash()` + a Prisma update. There's no built-in endpoint for this today — worth adding in a future module if this needs to happen more than once.

---

## Project structure

See `PROJECT_STRUCTURE.md` for the complete file tree.

```
src/
  config/       env validation, shared constants
  db/           Prisma client singleton
  routes/       Express route definitions (thin — just wiring)
  controllers/  parse request, call one service, shape response
  services/     all business logic lives here
  middleware/   auth, admin gating, rate limiting, validation, error handling
  validators/   Zod schemas
  utils/        stateless helpers (code/password generation, CSV, logging, etc.)
prisma/
  schema.prisma
  migrations/   5 migrations, applied in order
  seed.js
```

## Known limitations (by design, not oversights — see development log for full reasoning)

- Ephemeral credential export cache is in-process memory — works on a single Railway service, would need a shared store (Redis) if ever scaled to multiple instances.
- No refresh tokens — a single 12h JWT, matching a single-event use pattern.
- `todays_handshakes` (admin dashboard) uses the UTC day boundary, not a configured event timezone.
- No endpoint exists yet to change your own password if you're not an admin resetting someone else's — participants log in with the credentials organizers distribute and that's it, for now.
