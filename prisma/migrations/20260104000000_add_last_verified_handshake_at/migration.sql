-- Adds the leaderboard tie-breaker column and replaces the old
-- handshakeCount-only index with one covering both sort keys used by the
-- ranking algorithm (handshakeCount DESC, lastVerifiedHandshakeAt ASC).

-- AlterTable
ALTER TABLE "users" ADD COLUMN "lastVerifiedHandshakeAt" TIMESTAMP(3);

-- DropIndex
DROP INDEX "users_handshakeCount_idx";

-- CreateIndex
CREATE INDEX "users_handshakeCount_lastVerifiedHandshakeAt_idx" ON "users"("handshakeCount", "lastVerifiedHandshakeAt");
