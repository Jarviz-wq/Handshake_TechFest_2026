-- Audit log table for organizer debugging and post-event analysis.
--
-- Deliberately has no foreign key constraints to "users" — see the comment
-- on the HandshakeLog model in schema.prisma for why. This means userId /
-- targetUserId are plain text columns, not enforced references; the
-- application is responsible for populating them correctly, and a stale
-- value here (pointing at a since-deleted user) is expected and harmless
-- for an audit trail, not a data integrity bug.

CREATE TABLE "handshake_logs" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "handshakeCode" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handshake_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "handshake_logs_userId_idx" ON "handshake_logs"("userId");

-- CreateIndex
CREATE INDEX "handshake_logs_event_idx" ON "handshake_logs"("event");
