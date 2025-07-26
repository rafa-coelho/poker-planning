# 🗄️ Schema do Banco de Dados - Poker Planning Empresarial

## 📋 Visão Geral

Este documento define a estrutura completa do banco de dados PostgreSQL para a aplicação de Poker Planning Empresarial, utilizando Prisma ORM.

## 🏗️ Prisma Schema (`prisma/schema.prisma`)

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 🏢 Organizações (Multi-tenancy)
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique // Para URLs amigáveis
  plan        Plan     @default(FREE)
  settings    Json     @default("{}")
  logoUrl     String?
  domain      String?  // Para SSO futuro
  isActive    Boolean  @default(true)
  
  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  users       User[]
  sessions    Session[]
  invites     Invite[]
  projects    Project[]
  
  @@map("organizations")
}

// 👥 Usuários
model User {
  id             String       @id @default(cuid())
  email          String       @unique
  name           String
  passwordHash   String?      // Nullable para usuários externos
  avatar         String?
  locale         String       @default("pt")
  timezone       String       @default("America/Sao_Paulo")
  role           UserRole     @default(MEMBER)
  isActive       Boolean      @default(true)
  lastLoginAt    DateTime?
  
  // Multi-tenancy
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // External integration (futuro AuthService)
  externalId     String?      @unique
  externalSource String?      // "google", "microsoft", "authservice"
  
  // Audit fields
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  // Relations
  createdSessions Session[] @relation("SessionCreator")
  participants   SessionParticipant[]
  votes          Vote[]
  invitesSent    Invite[] @relation("InviteCreator")
  projectMembers ProjectMember[]
  
  @@map("users")
}

// 🎮 Sessões de Planning
model Session {
  id             String        @id @default(cuid())
  name           String
  description    String?
  status         SessionStatus @default(ACTIVE)
  
  // Multi-tenancy
  organizationId String
  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // Creator
  createdById    String
  createdBy      User          @relation("SessionCreator", fields: [createdById], references: [id])
  
  // Project association
  projectId      String?
  project        Project?      @relation(fields: [projectId], references: [id])
  
  // Settings
  votingMode     VotingMode    @default(FIBONACCI)
  customCards    String[]      @default([]) // Para modo custom
  autoReveal     Boolean       @default(false)
  allowObservers Boolean       @default(true)
  timerDuration  Int?          // Em segundos
  
  // State
  currentTicketId String?
  currentTicket   Ticket?      @relation("CurrentTicket", fields: [currentTicketId], references: [id])
  isRevealed     Boolean       @default(false)
  
  // Audit fields
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  endedAt        DateTime?
  
  // Relations
  participants   SessionParticipant[]
  tickets        Ticket[]
  
  @@map("sessions")
}

// 👤 Participantes de Sessão
model SessionParticipant {
  id        String   @id @default(cuid())
  
  // Relations
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Participant data
  role      ParticipantRole @default(VOTER)
  isActive  Boolean         @default(true)
  
  // Audit fields
  joinedAt  DateTime @default(now())
  leftAt    DateTime?
  
  @@unique([sessionId, userId])
  @@map("session_participants")
}

// 📋 Projetos/Times
model Project {
  id             String   @id @default(cuid())
  name           String
  description    String?
  color          String?  // Para UI
  isActive       Boolean  @default(true)
  
  // Multi-tenancy
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // Audit fields
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  // Relations
  members        ProjectMember[]
  sessions       Session[]
  
  @@map("projects")
}

// 👥 Membros de Projeto
model ProjectMember {
  id        String      @id @default(cuid())
  
  // Relations
  projectId String
  project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Member data
  role      ProjectRole @default(MEMBER)
  
  // Audit fields
  joinedAt  DateTime    @default(now())
  
  @@unique([projectId, userId])
  @@map("project_members")
}

// 🎫 Tickets/Histórias
model Ticket {
  id          String       @id @default(cuid())
  title       String
  description String?
  identifier  String?      // Ex: "PROJ-123"
  priority    Priority     @default(MEDIUM)
  status      TicketStatus @default(PENDING)
  
  // Relations
  sessionId   String
  session     Session      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  // Estimation
  finalEstimate    String?     // Valor final escolhido
  consensusReached Boolean     @default(false)
  votingStartedAt  DateTime?
  votingEndedAt    DateTime?
  
  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  votes       Vote[]
  sessions    Session[] @relation("CurrentTicket")
  
  @@map("tickets")
}

// 🗳️ Votos
model Vote {
  id       String @id @default(cuid())
  
  // Relations
  ticketId String
  ticket   Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  
  userId   String
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Vote data
  value    String    // Valor da carta escolhida
  confidence Int?    // 1-5, confiança na estimativa
  comment  String?   // Comentário opcional
  
  // Audit fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([ticketId, userId]) // Um voto por ticket por usuário
  @@map("votes")
}

// 📧 Convites
model Invite {
  id             String      @id @default(cuid())
  email          String
  role           UserRole    @default(MEMBER)
  status         InviteStatus @default(PENDING)
  token          String      @unique
  expiresAt      DateTime
  
  // Multi-tenancy
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  // Creator
  createdById    String
  createdBy      User        @relation("InviteCreator", fields: [createdById], references: [id])
  
  // Metadata
  metadata       Json        @default("{}") // Para dados extras
  
  // Audit fields
  createdAt      DateTime    @default(now())
  acceptedAt     DateTime?
  
  @@map("invites")
}

// 📊 Enums
enum Plan {
  FREE
  PRO
  ENTERPRISE
}

enum UserRole {
  ADMIN
  MEMBER
  VIEWER
}

enum SessionStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
  CANCELLED
}

enum VotingMode {
  FIBONACCI
  TSHIRT
  LINEAR
  CUSTOM
}

enum ParticipantRole {
  VOTER
  OBSERVER
  MODERATOR
}

enum ProjectRole {
  ADMIN
  MEMBER
  VIEWER
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TicketStatus {
  PENDING
  VOTING
  ESTIMATED
  COMPLETED
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}
```

## 🔗 Relacionamentos Principais

### Hierarquia de Multi-tenancy
```
Organization (Tenant)
├── Users (N:1)
├── Sessions (N:1)
├── Projects (N:1)
└── Invites (N:1)
```

### Fluxo de Sessão
```
Session
├── Participants (N:M via SessionParticipant)
├── Tickets (1:N)
│   └── Votes (1:N)
└── Current Ticket (1:1)
```

### Gestão de Projetos
```
Project
├── Members (N:M via ProjectMember)
└── Sessions (1:N)
```

## 📊 Índices para Performance

```sql
-- Índices principais para performance
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_external_id ON users(external_id);

CREATE INDEX idx_sessions_organization_id ON sessions(organization_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);

CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);

CREATE INDEX idx_tickets_session_id ON tickets(session_id);
CREATE INDEX idx_tickets_status ON tickets(status);

CREATE INDEX idx_votes_ticket_id ON votes(ticket_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);

CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_organization_id ON invites(organization_id);
```

## 🔒 Políticas de Segurança

### Row Level Security (RLS)
```sql
-- Exemplo de RLS para isolamento por organização
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Política para usuários - apenas da mesma organização
CREATE POLICY user_organization_policy ON users
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id'));
```

## 📈 Estratégia de Backup

### Backup Automático
- **Frequência**: Daily automated backups
- **Retenção**: 30 dias para daily, 12 meses para weekly
- **Restore**: Point-in-time recovery capability

### Dados Críticos
- **Organizações**: Backup imediato após mudanças
- **Sessões ativas**: Backup em tempo real
- **Votos**: Immutable após criação

## 🔧 Migrations Strategy

### Naming Convention
```
YYYYMMDD_HHMMSS_action_entity.sql
20240315_143000_create_organizations.sql
20240315_143100_add_external_id_to_users.sql
```

### Migration Guidelines
1. **Sempre** usar transações para migrations complexas
2. **Nunca** dropar colunas em production (usar soft delete)
3. **Sempre** testar em staging primeiro
4. **Documentar** mudanças breaking changes

## 📊 Métricas do Banco

### Queries Principais
- `SELECT COUNT(*) FROM sessions WHERE status = 'ACTIVE'`
- `SELECT AVG(vote_count) FROM session_analytics`
- `SELECT organization_id, COUNT(*) FROM users GROUP BY organization_id`

### Monitoring
- Connection pool utilization
- Query performance (slow queries)
- Database size growth
- Index usage statistics

---

**Próximo Passo**: Implementar o schema usando `npx prisma migrate dev` 