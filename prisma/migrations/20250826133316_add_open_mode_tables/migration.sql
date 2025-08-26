-- DropIndex
DROP INDEX "public"."session_participants_isActive_idx";

-- CreateTable
CREATE TABLE "public"."open_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "votingMode" "public"."VotingMode" NOT NULL DEFAULT 'FIBONACCI',
    "customCards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "autoReveal" BOOLEAN NOT NULL DEFAULT false,
    "allowObservers" BOOLEAN NOT NULL DEFAULT true,
    "timerDuration" INTEGER,
    "currentTicketId" TEXT,
    "isRevealed" BOOLEAN NOT NULL DEFAULT false,
    "creatorName" TEXT NOT NULL,
    "creatorIp" TEXT,
    "creatorUserAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "open_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."open_session_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "open_session_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."open_tickets" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'PENDING',
    "averageVote" DOUBLE PRECISION,
    "finalEstimate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estimatedAt" TIMESTAMP(3),

    CONSTRAINT "open_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."open_votes" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "cardValue" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "open_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "open_sessions_currentTicketId_key" ON "public"."open_sessions"("currentTicketId");

-- CreateIndex
CREATE INDEX "open_sessions_status_idx" ON "public"."open_sessions"("status");

-- CreateIndex
CREATE INDEX "open_sessions_createdAt_idx" ON "public"."open_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "open_sessions_expiresAt_idx" ON "public"."open_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "open_session_participants_sessionId_idx" ON "public"."open_session_participants"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "open_session_participants_sessionId_name_key" ON "public"."open_session_participants"("sessionId", "name");

-- CreateIndex
CREATE INDEX "open_tickets_sessionId_idx" ON "public"."open_tickets"("sessionId");

-- CreateIndex
CREATE INDEX "open_tickets_status_idx" ON "public"."open_tickets"("status");

-- CreateIndex
CREATE INDEX "open_votes_ticketId_idx" ON "public"."open_votes"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "open_votes_ticketId_participantName_key" ON "public"."open_votes"("ticketId", "participantName");

-- AddForeignKey
ALTER TABLE "public"."open_sessions" ADD CONSTRAINT "open_sessions_currentTicketId_fkey" FOREIGN KEY ("currentTicketId") REFERENCES "public"."open_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."open_session_participants" ADD CONSTRAINT "open_session_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."open_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."open_tickets" ADD CONSTRAINT "open_tickets_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."open_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."open_votes" ADD CONSTRAINT "open_votes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."open_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
