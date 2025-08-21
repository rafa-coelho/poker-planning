-- CreateIndex
CREATE INDEX "invites_organizationId_idx" ON "public"."invites"("organizationId");

-- CreateIndex
CREATE INDEX "invites_email_idx" ON "public"."invites"("email");

-- CreateIndex
CREATE INDEX "invites_token_idx" ON "public"."invites"("token");

-- CreateIndex
CREATE INDEX "invites_status_idx" ON "public"."invites"("status");

-- CreateIndex
CREATE INDEX "invites_expiresAt_idx" ON "public"."invites"("expiresAt");

-- CreateIndex
CREATE INDEX "invites_createdAt_idx" ON "public"."invites"("createdAt");

-- CreateIndex
CREATE INDEX "project_members_projectId_idx" ON "public"."project_members"("projectId");

-- CreateIndex
CREATE INDEX "project_members_userId_idx" ON "public"."project_members"("userId");

-- CreateIndex
CREATE INDEX "projects_organizationId_idx" ON "public"."projects"("organizationId");

-- CreateIndex
CREATE INDEX "projects_isActive_idx" ON "public"."projects"("isActive");

-- CreateIndex
CREATE INDEX "projects_createdById_idx" ON "public"."projects"("createdById");

-- CreateIndex
CREATE INDEX "projects_createdAt_idx" ON "public"."projects"("createdAt");

-- CreateIndex
CREATE INDEX "session_participants_sessionId_idx" ON "public"."session_participants"("sessionId");

-- CreateIndex
CREATE INDEX "session_participants_userId_idx" ON "public"."session_participants"("userId");

-- CreateIndex
CREATE INDEX "session_participants_isActive_idx" ON "public"."session_participants"("isActive");

-- CreateIndex
CREATE INDEX "sessions_organizationId_idx" ON "public"."sessions"("organizationId");

-- CreateIndex
CREATE INDEX "sessions_status_idx" ON "public"."sessions"("status");

-- CreateIndex
CREATE INDEX "sessions_createdAt_idx" ON "public"."sessions"("createdAt");

-- CreateIndex
CREATE INDEX "sessions_createdById_idx" ON "public"."sessions"("createdById");

-- CreateIndex
CREATE INDEX "sessions_projectId_idx" ON "public"."sessions"("projectId");

-- CreateIndex
CREATE INDEX "sessions_publicAccessCode_idx" ON "public"."sessions"("publicAccessCode");

-- CreateIndex
CREATE INDEX "team_members_teamId_idx" ON "public"."team_members"("teamId");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "public"."team_members"("userId");

-- CreateIndex
CREATE INDEX "teams_organizationId_idx" ON "public"."teams"("organizationId");

-- CreateIndex
CREATE INDEX "teams_isActive_idx" ON "public"."teams"("isActive");

-- CreateIndex
CREATE INDEX "teams_createdById_idx" ON "public"."teams"("createdById");

-- CreateIndex
CREATE INDEX "teams_createdAt_idx" ON "public"."teams"("createdAt");

-- CreateIndex
CREATE INDEX "tickets_sessionId_idx" ON "public"."tickets"("sessionId");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "public"."tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_priority_idx" ON "public"."tickets"("priority");

-- CreateIndex
CREATE INDEX "tickets_createdAt_idx" ON "public"."tickets"("createdAt");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "public"."users"("organizationId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_externalId_idx" ON "public"."users"("externalId");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "public"."users"("isActive");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "public"."users"("createdAt");
