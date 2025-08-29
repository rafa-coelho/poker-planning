-- CreateTable
CREATE TABLE "public"."open_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "votingMode" "public"."VotingMode" NOT NULL DEFAULT 'FIBONACCI',
    "autoReveal" BOOLEAN NOT NULL DEFAULT false,
    "allowObservers" BOOLEAN NOT NULL DEFAULT true,
    "isRevealed" BOOLEAN NOT NULL DEFAULT false,
    "creatorName" TEXT NOT NULL,
    "creatorIp" TEXT,
    "creatorUserAgent" TEXT,
    "currentTicketId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "open_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."open_session_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "selectedCard" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "open_session_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."open_tickets" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "finalEstimate" TEXT,
    "averageVote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "open_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."open_votes" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "card" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "open_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "open_sessions_expiresAt_idx" ON "public"."open_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "open_sessions_createdAt_idx" ON "public"."open_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "open_session_participants_sessionId_idx" ON "public"."open_session_participants"("sessionId");

-- CreateIndex
CREATE INDEX "open_session_participants_isActive_idx" ON "public"."open_session_participants"("isActive");

-- CreateIndex
CREATE INDEX "open_tickets_sessionId_idx" ON "public"."open_tickets"("sessionId");

-- CreateIndex
CREATE INDEX "open_tickets_createdAt_idx" ON "public"."open_tickets"("createdAt");

-- CreateIndex
CREATE INDEX "open_votes_ticketId_idx" ON "public"."open_votes"("ticketId");

-- CreateIndex
CREATE INDEX "open_votes_participantId_idx" ON "public"."open_votes"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "open_votes_ticketId_participantId_key" ON "public"."open_votes"("ticketId", "participantId");

-- AddForeignKey
ALTER TABLE "public"."open_sessions" ADD CONSTRAINT "open_sessions_currentTicketId_fkey" FOREIGN KEY ("currentTicketId") REFERENCES "public"."open_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."open_session_participants" ADD CONSTRAINT "open_session_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."open_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."open_tickets" ADD CONSTRAINT "open_tickets_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."open_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."open_votes" ADD CONSTRAINT "open_votes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."open_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."open_votes" ADD CONSTRAINT "open_votes_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."open_session_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
