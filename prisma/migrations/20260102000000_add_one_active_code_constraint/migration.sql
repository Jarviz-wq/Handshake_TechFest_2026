-- Enforces "only one active code per user" at the database level, not just
-- in application code.
--
-- Without this, two near-simultaneous generate-code requests from the same
-- user (a fast double-tap, a retried request after a slow response) could
-- both pass an application-level "does an active code already exist" check
-- before either has written anything, and both would then insert a row —
-- silently violating the one-active-code invariant purely due to a timing
-- window. A partial unique index makes that outcome impossible regardless
-- of application-level timing, without needing SELECT ... FOR UPDATE.
--
-- Prisma's schema DSL cannot express a partial/filtered index (WHERE
-- clause on a unique constraint), so this is hand-written rather than
-- generated — same caveat as every migration so far: verify with
-- `prisma migrate dev` against a real database before trusting it.

CREATE UNIQUE INDEX "handshake_codes_one_active_per_owner"
  ON "handshake_codes"("ownerId")
  WHERE "usedAt" IS NULL;
