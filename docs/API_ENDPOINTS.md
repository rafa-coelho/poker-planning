# 🌐 API Endpoints - Poker Planning Empresarial

## 📋 Visão Geral

Esta documentação define todos os endpoints da API RESTful usando Next.js API Routes, seguindo padrões empresariais de autenticação, autorização e multi-tenancy.

## 🔐 Autenticação

### Base Headers
```typescript
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json",
  "x-organization-id": "<organization_id>" // Para multi-tenancy
}
```

### JWT Payload Structure
```typescript
interface JWTPayload {
  userId: string
  organizationId: string
  role: 'admin' | 'member' | 'viewer'
  plan: 'free' | 'pro' | 'enterprise'
  features: string[]
  iat: number
  exp: number
}
```

---

## 🔑 Autenticação e Autorização

### `POST /api/auth/register`
Registra um novo usuário e organização.

**Request:**
```typescript
{
  name: string
  email: string
  password: string
  organizationName: string
  organizationSlug?: string
}
```

**Response:**
```typescript
{
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  organization: {
    id: string
    name: string
    slug: string
    plan: string
  }
  tokens: {
    accessToken: string
    refreshToken: string
  }
}
```

### `POST /api/auth/login`
Autentica usuário existente.

**Request:**
```typescript
{
  email: string
  password: string
}
```

**Response:**
```typescript
{
  user: User
  organization: Organization
  tokens: {
    accessToken: string
    refreshToken: string
  }
}
```

### `POST /api/auth/refresh`
Renova tokens de acesso.

**Request:**
```typescript
{
  refreshToken: string
}
```

**Response:**
```typescript
{
  accessToken: string
  refreshToken: string
}
```

### `POST /api/auth/logout`
Invalida tokens do usuário.

**Request:** Headers only

**Response:**
```typescript
{
  message: "Logged out successfully"
}
```

### `GET /api/auth/me`
Retorna dados do usuário autenticado.

**Response:**
```typescript
{
  user: User
  organization: Organization
  permissions: string[]
}
```

---

## 🏢 Organizações

### `GET /api/organization`
Retorna dados da organização atual.

**Response:**
```typescript
{
  organization: {
    id: string
    name: string
    slug: string
    plan: string
    settings: object
    logoUrl?: string
    members: number
    activeSessions: number
  }
}
```

### `PUT /api/organization`
Atualiza dados da organização.

**Request:**
```typescript
{
  name?: string
  logoUrl?: string
  settings?: object
}
```

**Response:**
```typescript
{
  organization: Organization
}
```

### `GET /api/organization/analytics`
Analytics da organização (Admin only).

**Query Params:**
- `period`: '7d' | '30d' | '90d' | '1y'
- `timezone`: string (default: organization timezone)

**Response:**
```typescript
{
  metrics: {
    totalSessions: number
    activeSessions: number
    totalTickets: number
    averageConsensus: number
    averageVotingTime: number
  }
  charts: {
    sessionsOverTime: ChartData[]
    consensusRates: ChartData[]
    participationRates: ChartData[]
  }
}
```

---

## 👥 Usuários

### `GET /api/users`
Lista usuários da organização.

**Query Params:**
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)
- `search`: string
- `role`: 'admin' | 'member' | 'viewer'
- `isActive`: boolean

**Response:**
```typescript
{
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}
```

### `GET /api/users/[userId]`
Retorna dados de um usuário específico.

**Response:**
```typescript
{
  user: User & {
    stats: {
      sessionsParticipated: number
      votesCount: number
      averageConfidence: number
      lastActivity: string
    }
  }
}
```

### `PUT /api/users/[userId]`
Atualiza dados de um usuário (Admin only ou próprio usuário).

**Request:**
```typescript
{
  name?: string
  role?: 'admin' | 'member' | 'viewer'
  isActive?: boolean
  locale?: string
  timezone?: string
}
```

**Response:**
```typescript
{
  user: User
}
```

### `DELETE /api/users/[userId]`
Remove usuário da organização (Admin only).

**Response:**
```typescript
{
  message: "User removed successfully"
}
```

---

## 📧 Convites

### `POST /api/invites`
Cria convite para novo usuário.

**Request:**
```typescript
{
  email: string
  role: 'admin' | 'member' | 'viewer'
  projectIds?: string[]
}
```

**Response:**
```typescript
{
  invite: {
    id: string
    email: string
    role: string
    token: string
    expiresAt: string
  }
}
```

### `GET /api/invites`
Lista convites da organização.

**Query Params:**
- `status`: 'pending' | 'accepted' | 'expired'

**Response:**
```typescript
{
  invites: Invite[]
}
```

### `POST /api/invites/[token]/accept`
Aceita convite (endpoint público).

**Request:**
```typescript
{
  name: string
  password: string
}
```

**Response:**
```typescript
{
  user: User
  organization: Organization
  tokens: TokenPair
}
```

### `DELETE /api/invites/[inviteId]`
Cancela convite pendente.

**Response:**
```typescript
{
  message: "Invite cancelled"
}
```

---

## 🎮 Sessões

### `GET /api/sessions`
Lista sessões da organização.

**Query Params:**
- `page`: number
- `limit`: number
- `status`: 'active' | 'completed' | 'archived'
- `projectId`: string
- `createdBy`: string
- `search`: string
- `sortBy`: 'createdAt' | 'updatedAt' | 'name'
- `sortOrder`: 'asc' | 'desc'

**Response:**
```typescript
{
  sessions: Session[]
  pagination: PaginationInfo
}
```

### `POST /api/sessions`
Cria nova sessão.

**Request:**
```typescript
{
  name: string
  description?: string
  projectId?: string
  votingMode: 'fibonacci' | 'tshirt' | 'linear' | 'custom'
  customCards?: string[]
  autoReveal?: boolean
  allowObservers?: boolean
  timerDuration?: number
}
```

**Response:**
```typescript
{
  session: Session
}
```

### `GET /api/sessions/[sessionId]`
Retorna dados detalhados da sessão.

**Response:**
```typescript
{
  session: Session & {
    participants: Participant[]
    tickets: Ticket[]
    currentTicket?: Ticket
    stats: {
      totalVotes: number
      averageVotingTime: number
      consensusRate: number
    }
  }
}
```

### `PUT /api/sessions/[sessionId]`
Atualiza sessão (Creator ou Admin).

**Request:**
```typescript
{
  name?: string
  description?: string
  status?: 'active' | 'completed' | 'archived'
  votingMode?: string
  customCards?: string[]
  autoReveal?: boolean
  allowObservers?: boolean
  currentTicketId?: string
}
```

**Response:**
```typescript
{
  session: Session
}
```

### `DELETE /api/sessions/[sessionId]`
Arquiva sessão (soft delete).

**Response:**
```typescript
{
  message: "Session archived"
}
```

### `POST /api/sessions/[sessionId]/join`
Entra na sessão como participante.

**Request:**
```typescript
{
  role?: 'voter' | 'observer'
}
```

**Response:**
```typescript
{
  participant: Participant
  session: Session
}
```

### `POST /api/sessions/[sessionId]/leave`
Sai da sessão.

**Response:**
```typescript
{
  message: "Left session successfully"
}
```

---

## 🎫 Tickets

### `GET /api/sessions/[sessionId]/tickets`
Lista tickets da sessão.

**Response:**
```typescript
{
  tickets: Ticket[]
}
```

### `POST /api/sessions/[sessionId]/tickets`
Cria novo ticket na sessão.

**Request:**
```typescript
{
  title: string
  description?: string
  identifier?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}
```

**Response:**
```typescript
{
  ticket: Ticket
}
```

### `PUT /api/tickets/[ticketId]`
Atualiza ticket.

**Request:**
```typescript
{
  title?: string
  description?: string
  identifier?: string
  priority?: string
  status?: 'pending' | 'voting' | 'estimated' | 'completed'
  finalEstimate?: string
}
```

**Response:**
```typescript
{
  ticket: Ticket
}
```

### `DELETE /api/tickets/[ticketId]`
Remove ticket.

**Response:**
```typescript
{
  message: "Ticket deleted"
}
```

### `POST /api/tickets/[ticketId]/start-voting`
Inicia votação para o ticket.

**Response:**
```typescript
{
  ticket: Ticket
  message: "Voting started"
}
```

### `POST /api/tickets/[ticketId]/reveal`
Revela votos do ticket.

**Response:**
```typescript
{
  ticket: Ticket & {
    votes: Vote[]
    stats: {
      average: number
      consensus: number
      distribution: object
    }
  }
}
```

---

## 🗳️ Votos

### `POST /api/tickets/[ticketId]/vote`
Registra voto no ticket.

**Request:**
```typescript
{
  value: string
  confidence?: number // 1-5
  comment?: string
}
```

**Response:**
```typescript
{
  vote: Vote
}
```

### `PUT /api/votes/[voteId]`
Atualiza voto (antes da revelação).

**Request:**
```typescript
{
  value: string
  confidence?: number
  comment?: string
}
```

**Response:**
```typescript
{
  vote: Vote
}
```

### `DELETE /api/votes/[voteId]`
Remove voto (antes da revelação).

**Response:**
```typescript
{
  message: "Vote removed"
}
```

---

## 📋 Projetos

### `GET /api/projects`
Lista projetos da organização.

**Response:**
```typescript
{
  projects: Project[]
}
```

### `POST /api/projects`
Cria novo projeto.

**Request:**
```typescript
{
  name: string
  description?: string
  color?: string
}
```

**Response:**
```typescript
{
  project: Project
}
```

### `PUT /api/projects/[projectId]`
Atualiza projeto.

**Request:**
```typescript
{
  name?: string
  description?: string
  color?: string
  isActive?: boolean
}
```

**Response:**
```typescript
{
  project: Project
}
```

### `POST /api/projects/[projectId]/members`
Adiciona membro ao projeto.

**Request:**
```typescript
{
  userId: string
  role: 'admin' | 'member' | 'viewer'
}
```

**Response:**
```typescript
{
  member: ProjectMember
}
```

---

## 📊 Relatórios

### `GET /api/reports/sessions`
Relatório de sessões.

**Query Params:**
- `startDate`: string (ISO date)
- `endDate`: string (ISO date)
- `projectId`: string
- `format`: 'json' | 'csv' | 'pdf'

**Response:**
```typescript
{
  report: {
    summary: {
      totalSessions: number
      avgDuration: number
      avgConsensus: number
    }
    sessions: SessionReport[]
  }
}
```

### `GET /api/reports/analytics`
Analytics detalhados (Pro+ only).

**Query Params:**
- `period`: string
- `metrics`: string[] // Lista de métricas desejadas

**Response:**
```typescript
{
  analytics: {
    overview: OverviewMetrics
    trends: TrendData[]
    comparisons: ComparisonData[]
  }
}
```

---

## 🚨 Códigos de Erro

### Estrutura Padrão
```typescript
{
  error: {
    code: string
    message: string
    details?: object
    timestamp: string
  }
}
```

### Códigos Comuns
- `AUTH_REQUIRED` (401): Token não fornecido
- `AUTH_INVALID` (401): Token inválido/expirado
- `AUTH_FORBIDDEN` (403): Sem permissão
- `NOT_FOUND` (404): Recurso não encontrado
- `VALIDATION_ERROR` (400): Dados inválidos
- `RATE_LIMIT` (429): Muitas requisições
- `PLAN_LIMIT` (402): Limite do plano atingido
- `SERVER_ERROR` (500): Erro interno

---

## 🔄 Rate Limiting

### Por Endpoint
- `POST /api/auth/*`: 5 req/min por IP
- `GET /api/*`: 100 req/min por usuário
- `POST,PUT,DELETE /api/*`: 30 req/min por usuário
- `POST /api/tickets/*/vote`: 10 req/min por usuário

### Headers de Response
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

**Próximo Passo**: Implementar middlewares de autenticação e rate limiting. 