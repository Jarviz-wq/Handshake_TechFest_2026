# Handshake.sh — API Documentation

Base URL: `https://<your-deployed-service>/api` (health check only is outside `/api` — see below)

All request/response bodies are JSON unless noted (CSV import and credential export are the two exceptions). Every JSON response follows one of two shapes:

```
{ "success": true,  "message": "...", "data": {...} }
{ "success": false, "message": "...", "error": { "code": "...", "details": {...} } }
```

Authenticated routes require `Authorization: Bearer <jwt>`.

---

## Health

### `GET /health`
No auth. Outside `/api` — infrastructure health checks (Railway/Render) hit this directly.

**Response `200`:**
```json
{ "success": true, "message": "Service is healthy.", "data": { "status": "ok" } }
```

---

## Auth

### `POST /api/auth/login`
No auth. Rate-limited: 5 attempts / 15 min per IP.

**Request:**
```json
{ "username": "yadu24", "password": "TechFest2026!" }
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "...", "username": "yadu24", "full_name": "Yadu Krishnan",
      "college": "IIT Bombay", "department": "Computer Science", "year": 3,
      "email": "yadu24@example.edu", "profile_photo_url": null,
      "handshake_count": 1, "rank": 6, "is_admin": false
    }
  }
}
```

**Errors:** `INVALID_CREDENTIALS` (401), `ACCOUNT_DEACTIVATED` (403), `TOO_MANY_ATTEMPTS` (429), `VALIDATION_ERROR` (400)

### `GET /api/auth/me`
**Auth required.**

**Response `200`:** same `user` shape as login.

**Errors:** `UNAUTHORIZED` / `TOKEN_EXPIRED` (401), `ACCOUNT_DEACTIVATED` (403)

---

## Handshake

All routes below require auth.

### `POST /api/handshake/generate`
Returns the caller's existing active code if one exists; otherwise creates one. Idempotent under a double-tap.

**Response `200`:**
```json
{
  "success": true,
  "message": "Handshake code ready.",
  "data": { "code": "AB7XK2", "expires_at": "2026-07-20T10:32:00.000Z", "expires_in_seconds": 118 }
}
```

### `POST /api/handshake/verify`
Rate-limited: 10 attempts / minute **per user** (not per IP).

**Request:**
```json
{ "code": "AB7XK2" }
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Handshake verified.",
  "data": {
    "handshake_id": "...",
    "connected_with": { "full_name": "Arya Menon", "college": "BITS Pilani" },
    "new_handshake_count": 2
  }
}
```

**Errors:** `CODE_NOT_FOUND` (404), `CODE_EXPIRED` (410), `CODE_ALREADY_USED` (409), `SELF_HANDSHAKE` (400), `DUPLICATE_PAIR` (409), `TOO_MANY_ATTEMPTS` (429), `VALIDATION_ERROR` (400)

### `GET /api/handshake/my-code`
Read-only — never creates a code.

**Response `200`:** same shape as `/generate`, or `{ "code": null }` if none active.

### `GET /api/handshake/history?limit=20`
`limit`: 1–100, default 20.

**Response `200`:**
```json
{
  "success": true,
  "message": "Handshake history retrieved.",
  "data": {
    "handshakes": [
      { "handshake_id": "...", "connected_with": { "full_name": "...", "college": "..." }, "created_at": "..." }
    ]
  }
}
```

---

## Dashboard, Leaderboard, Profile, Stats

All routes below require auth.

### `GET /api/dashboard`
**Response `200`:**
```json
{
  "success": true,
  "message": "Dashboard data retrieved.",
  "data": {
    "profile": { "username": "...", "full_name": "...", "college": "...", "handshake_count": 2, "rank": 4 },
    "pending_requests": [],
    "recent_handshakes": [ /* up to 5, same shape as /handshake/history */ ],
    "total_participants": 150,
    "total_verified_handshakes": 87
  }
}
```
`pending_requests` is always `[]` — this architecture has no pending-request concept (handshakes are only ever created already-verified). Kept for frontend shape compatibility, not omitted.

### `GET /api/leaderboard?page=1&limit=20`
`page` ≥ 1 (default 1), `limit` 1–100 (default 20).

**Response `200`:**
```json
{
  "success": true,
  "message": "Leaderboard retrieved.",
  "data": {
    "entries": [
      { "username": "arya07", "full_name": "Arya Menon", "college": "BITS Pilani", "handshake_count": 4, "rank": 1 }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 150, "total_pages": 8 }
  }
}
```
Ranking: `handshakeCount DESC, lastVerifiedHandshakeAt ASC` (earliest to reach a tied count ranks higher). Identical algorithm to `/me`'s `rank` field — never a different number between the two.

### `GET /api/profile/:username`
Public fields only — no email, no id, no internal data. Same 404 for "doesn't exist" and "deactivated" (doesn't leak account status).

**Response `200`:**
```json
{ "success": true, "message": "Profile retrieved.", "data": { "username": "...", "full_name": "...", "college": "...", "handshake_count": 2, "rank": 4 } }
```

### `GET /api/stats`
Aggregate counts only — safe for any authenticated participant, not admin-restricted.

**Response `200`:**
```json
{
  "success": true,
  "message": "Statistics retrieved.",
  "data": {
    "total_participants": 150, "total_verified_handshakes": 87,
    "active_handshake_codes": 12, "total_colleges": 24,
    "average_handshakes_per_participant": 1.16
  }
}
```

---

## Admin (organizer-only)

Every route below requires `Authorization: Bearer <jwt>` **and** `isAdmin: true` on that account (`FORBIDDEN`, 403, otherwise). Admin login is the same `/api/auth/login` — no separate admin login endpoint.

### `GET /api/admin/participants`
Query: `page`, `limit` (1–100, default 20), `q` (substring match against name/username/email), `college` (exact match), `minHandshakes`, `maxHandshakes`.

**Response `200`:**
```json
{
  "success": true,
  "message": "Participants retrieved.",
  "data": {
    "participants": [
      {
        "username": "rahul12", "full_name": "Rahul Verma", "email": "rahul12@example.edu",
        "college": "VIT Vellore", "department": "Computer Science", "year": 4,
        "handshake_count": 1, "is_active": true, "created_at": "..."
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 149, "total_pages": 8 }
  }
}
```

### `PUT /api/admin/participants/:username/activate`
### `PUT /api/admin/participants/:username/deactivate`
No body. **Response `200`:** `{ "participant": { /* same shape as list row */ } }`.

**Errors:** `PARTICIPANT_NOT_FOUND` (404) — including if `:username` belongs to another admin account (admins can't be managed through participant endpoints).

### `PUT /api/admin/participants/:username/reset-password`
No body.

**Response `200`:**
```json
{
  "success": true,
  "message": "Password reset. Share this new password with the participant now — it will not be shown again.",
  "data": { "username": "rahul12", "new_password": "Qx7mNp2Rst" }
}
```
The plaintext password appears in this response **exactly once** and is never stored or logged anywhere.

### `POST /api/admin/import`
`multipart/form-data`, field name **`file`** — a CSV export from the Google Form. Recognized headers (case-insensitive, several variants accepted): `Full Name`/`Name`, `Email Address`/`Email`, `College Name`/`College`/`Institution`, `Department`/`Dept`/`Branch` (optional), `Year`/`Year of Study` (optional). File size limit: 2MB.

**Response `200`:**
```json
{
  "success": true,
  "message": "Import complete.",
  "data": {
    "summary": { "imported": 146, "skipped": 3, "duplicate_emails": 2, "invalid_rows": 1 },
    "batch_id": "a1b2c3d4-..."
  }
}
```
`batch_id` is `null` if nothing was imported (nothing to export). Otherwise, pass it to the export endpoint below **within 15 minutes** — after that, or after one successful export, the credentials are gone.

**Errors:** `FILE_REQUIRED` (400), `INVALID_CSV` (400), `EMPTY_CSV` (400), `UPLOAD_LIMIT_FILE_SIZE` (400, file over 2MB)

### `GET /api/admin/credentials/export?batchId=<uuid>`
Returns a **CSV file download**, not JSON — `Content-Type: text/csv`, `Content-Disposition: attachment`. Columns: `Name, College, Username, Temporary Password`. Single-use: the batch is deleted from server memory the moment this succeeds, and auto-expires after 15 minutes regardless.

**Errors:** `BATCH_NOT_FOUND` (404) — expired, already downloaded, or a `batch_id` that never existed.

### `GET /api/admin/dashboard`
**Response `200`:**
```json
{
  "success": true,
  "message": "Organizer dashboard retrieved.",
  "data": {
    "total_participants": 150, "active_users": 148, "verified_handshakes": 87,
    "generated_codes": 203, "todays_handshakes": 34,
    "top_colleges": [ { "rank": 1, "college": "IIT Bombay", "participant_count": 22 } ],
    "top_participants": [ { "rank": 1, "username": "arya07", "full_name": "Arya Menon", "college": "BITS Pilani", "handshake_count": 4 } ]
  }
}
```
`todays_handshakes` uses the UTC day boundary — no event timezone is configured anywhere in this system yet. `top_participants`/`top_colleges` use simple positional ranks (1–5), not the tie-aware algorithm the real leaderboard uses — this is a small summary widget, not a second leaderboard implementation.

---

## Error Code Reference

| Code | HTTP | Where |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Any endpoint — Zod rejected the request |
| `INVALID_CREDENTIALS` | 401 | Login |
| `ACCOUNT_DEACTIVATED` | 403 | Login, authenticate middleware |
| `UNAUTHORIZED` / `TOKEN_EXPIRED` | 401 | Any protected route |
| `FORBIDDEN` | 403 | Any admin route, non-admin caller |
| `TOO_MANY_ATTEMPTS` | 429 | Login, verify-code |
| `CODE_NOT_FOUND` | 404 | Verify-code |
| `CODE_EXPIRED` | 410 | Verify-code |
| `CODE_ALREADY_USED` | 409 | Verify-code |
| `SELF_HANDSHAKE` | 400 | Verify-code |
| `DUPLICATE_PAIR` | 409 | Verify-code |
| `USER_NOT_FOUND` | 404 | Public profile lookup |
| `PARTICIPANT_NOT_FOUND` | 404 | Admin participant actions |
| `FILE_REQUIRED` / `INVALID_CSV` / `EMPTY_CSV` | 400 | Admin import |
| `UPLOAD_LIMIT_FILE_SIZE` | 400 | Admin import, file too large |
| `BATCH_NOT_FOUND` | 404 | Credential export |
| `NOT_FOUND` | 404 | Unmatched route |
| `INTERNAL_ERROR` | 500 | Anything unexpected — never leaks a stack trace in production |
