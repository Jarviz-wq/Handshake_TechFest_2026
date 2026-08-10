# Handshake.sh — Project Structure

Complete file tree, 67 files (excluding `node_modules`, `.env`, lockfile).

```
handshake-backend/
├── .env.example                  # Every environment variable, documented
├── .gitignore
├── render.yaml                   # Render Blueprint — one-click deploy config
├── package.json
├── package-lock.json
├── README.md                     # Setup & deployment (start here)
├── API_DOCUMENTATION.md          # Full API reference with examples
├── FRONTEND_INTEGRATION.md       # Page-by-page frontend wiring guide
├── PROJECT_STRUCTURE.md          # This file
│
├── docs/
│   └── DEVELOPMENT_LOG.md        # Module-by-module design decisions & history
│
├── prisma/
│   ├── schema.prisma             # Data model — single source of truth for the DB shape
│   ├── seed.js                   # Idempotent local dev seed data
│   └── migrations/
│       ├── migration_lock.toml
│       ├── 20260101000000_init/                                  # Module 1: core tables
│       ├── 20260102000000_add_one_active_code_constraint/         # Module 3: partial unique index
│       ├── 20260103000000_add_handshake_logs/                     # Module 3: audit trail
│       ├── 20260104000000_add_last_verified_handshake_at/         # Module 4: leaderboard tiebreak
│       └── 20260105000000_add_handshake_participant_indexes/      # Audit: missing FK indexes
│
└── src/
    ├── server.js                 # Entrypoint — binds the port, handles SIGTERM/SIGINT
    ├── app.js                    # Express app assembly, all middleware wiring, route mounting
    │
    ├── config/
    │   ├── env.js                 # Zod-validated environment config — fails fast at boot
    │   └── constants.js           # Values derived from env, given readable names
    │
    ├── db/
    │   └── client.js              # Single shared PrismaClient instance
    │
    ├── routes/                    # Thin — just path + middleware chain + controller wiring
    │   ├── index.js                # Aggregates every feature's routes under /api
    │   ├── auth.routes.js
    │   ├── handshake.routes.js
    │   ├── dashboard.routes.js
    │   ├── leaderboard.routes.js
    │   ├── profile.routes.js
    │   ├── stats.routes.js
    │   └── admin.routes.js
    │
    ├── controllers/               # Parse request → call one service → shape response
    │   ├── auth.controller.js
    │   ├── handshake.controller.js
    │   ├── dashboard.controller.js
    │   ├── leaderboard.controller.js
    │   ├── profile.controller.js
    │   ├── stats.controller.js
    │   ├── adminParticipants.controller.js
    │   ├── adminImport.controller.js
    │   └── adminDashboard.controller.js
    │
    ├── services/                  # All business logic lives here
    │   ├── auth.service.js               # Login, JWT issuance
    │   ├── user.service.js               # Shared ranking algorithm, profile shaping
    │   ├── handshakeCode.service.js      # Code generation, one-active-per-user
    │   ├── handshake.service.js          # The core verify transaction, history
    │   ├── auditLog.service.js           # handshake_logs writer
    │   ├── dashboard.service.js          # Participant-facing dashboard aggregation
    │   ├── leaderboard.service.js        # Windowed-rank pagination
    │   ├── profile.service.js            # Public profile lookup
    │   ├── stats.service.js              # Global aggregate stats
    │   ├── adminAudit.service.js         # admin_actions writer
    │   ├── adminParticipant.service.js   # List/search/filter, activate, reset password
    │   ├── adminImport.service.js        # CSV import pipeline, credential export
    │   └── adminDashboard.service.js     # Organizer-facing dashboard aggregation
    │
    ├── middleware/
    │   ├── authenticate.js         # JWT verification, attaches req.user
    │   ├── requireAdmin.js         # Gates admin-only routes (after authenticate)
    │   ├── validate.js             # Wraps a Zod schema as Express middleware
    │   ├── rateLimit.js            # Login (per-IP) and verify-code (per-user) limiters
    │   └── errorHandler.js         # Single place every error in the app ends up
    │
    ├── validators/                 # Zod schemas — one file per feature area
    │   ├── auth.schema.js
    │   ├── handshake.schema.js
    │   ├── leaderboard.schema.js
    │   ├── profile.schema.js
    │   └── admin.schema.js
    │
    └── utils/                      # Stateless helpers, no business logic
        ├── AppError.js              # Custom error class for known/operational errors
        ├── asyncHandler.js          # Wraps async route handlers for error forwarding
        ├── apiResponse.js           # sendSuccess() — enforces the consistent response envelope
        ├── logger.js                # Structured pino logger
        ├── codeGenerator.js         # Cryptographically secure handshake codes
        ├── usernameGenerator.js     # Username generation + collision handling
        ├── passwordGenerator.js     # Secure temporary passwords for import
        ├── sortPair.js              # Order-independent user-pair sorting
        ├── csv.js                   # CSV parsing (import) + serialization (export)
        └── ephemeralCredentialStore.js  # In-memory, single-use, TTL'd credential cache
```

## Where to look for what

| I want to... | Look at |
|---|---|
| Add a new endpoint | `routes/` → `controllers/` → `services/` (in that order) |
| Change a business rule (e.g. code expiry) | `config/constants.js` first — many "magic numbers" are already there |
| Understand why something is built a certain way | `docs/DEVELOPMENT_LOG.md` |
| See exact request/response shapes | `API_DOCUMENTATION.md` |
| Wire up a frontend page | `FRONTEND_INTEGRATION.md` |
| Change the data model | `prisma/schema.prisma`, then a new migration — never edit an already-applied migration file |
