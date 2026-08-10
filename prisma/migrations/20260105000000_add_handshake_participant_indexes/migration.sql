-- Found during the production readiness audit: Postgres does not
-- automatically index foreign key columns. getHistory() (used by both
-- GET /api/handshake/history and GET /api/dashboard) queries
-- WHERE "initiatorId" = ? OR "responderId" = ? — without these indexes,
-- every call was a full table scan on "handshakes".

CREATE INDEX "handshakes_initiatorId_idx" ON "handshakes"("initiatorId");

CREATE INDEX "handshakes_responderId_idx" ON "handshakes"("responderId");
