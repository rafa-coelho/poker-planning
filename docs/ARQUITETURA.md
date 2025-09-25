# 🧭 Documentação de Arquitetura – Poker Planning Empresarial

> Versão do app: 1.0.0 • Stack: Next.js 15 (App Router), React 19, TypeScript, Prisma/PostgreSQL, Socket.io (Node/Express), JWT, TailwindCSS, react-i18next.

---

## Sumário
- Visão Geral e Estrutura do Repositório
- Dependências Principais
- Arquitetura Lógica por Camada
- Modelo de Dados (ER) e Multi-Tenancy
- Autenticação, Autorização e Isolamento de Tenant
- API Routes e Fluxos de Dados
- Realtime (Socket.io)
- Internacionalização (i18n)
- E-mail (Templates, Rate Limiting e Envio)
- Segurança, Rate Limiting e Boas Práticas
- Variáveis de Ambiente e Configuração
- Considerações para Migração para Ecossistema
- Referências Internas

---

## Visão Geral e Estrutura do Repositório

Monorepo/app com App Router do Next.js e um servidor Socket.io dedicado para realtime.

```
src/
├── app/                     # App Router do Next.js
│   ├── api/                # API Routes (REST, multi-tenant)
│   ├── (auth)/             # Layout/rotas de autenticação
│   ├── [sessionId]/        # Páginas dinâmicas de sessão
│   └── dashboard/          # Dashboard empresarial
├── components/              # Componentes React reutilizáveis
├── lib/                     # Auth, middleware, services, config, db
├── i18n/                    # Internacionalização (client e server)
└── docs/                    # Documentação
```

Scripts úteis:

```bash
npm run dev         # Next.js
npm run dev:server  # Socket.io server (server.js)
npm run dev:full    # Ambos em paralelo
npm run build && npm run start
npx prisma migrate dev && npx prisma studio
```

---

## Dependências Principais

- Frameworks: `next@15`, `react@19`, `react-dom@19`, `typescript@^5`
- ORM/DB: `@prisma/client` e `prisma` (PostgreSQL)
- Realtime: `socket.io`, `socket.io-client`
- Auth: `jsonwebtoken`, `bcryptjs`
- i18n: `i18next`, `react-i18next`
- UI/UX: `tailwindcss`, `@heroicons/react`, `lucide-react`, `react-hot-toast`
- Infra/Node: `express` (para Socket.io), `uuid`

Arquivo de configuração central: `src/lib/config.ts` (consolida envs e flags runtime).

---

## Arquitetura Lógica por Camada

- Frontend (Next.js App Router)
  - Páginas, layouts e rotas sob `src/app`.
  - Hooks e serviços de domínio em `src/lib/hooks` e `src/lib/services`.
- API (Next.js API Routes)
  - Endpoints REST sob `src/app/api`.
  - Middlewares de autenticação, autorização, rate limiting e tenant isolation em `src/lib/middleware`.
- Persistência (Prisma/PostgreSQL)
  - Schema em `prisma/schema.prisma`.
  - Cliente Prisma singleton em `src/lib/db/index.ts`.
- Realtime (Socket.io)
  - Servidor Node/Express em `server.js` (porta `APP_CONFIG.WS_PORT`).
  - Cliente em `src/components/useSession.ts`.
- Internacionalização (i18n)
  - `src/i18n/index.ts` (client) e `src/i18n/server.ts` (server).
- E-mail
  - `src/lib/email/service.ts` e `src/lib/email/config.ts`.

---

## Modelo de Dados (ER) e Multi-Tenancy

Entidades principais (todas empresariais isoladas por `organizationId`, exceto modo aberto):

- Organização (`Organization`): plano, configurações, `users`, `projects`, `teams`, `sessions`, `invites`.
- Usuário (`User`): `role` (SUPER_ADMIN, ADMIN, MEMBER, VIEWER), `organizationId`, `externalId`/`externalSource` para integrações futuras.
- Projeto (`Project`) ↔ Membros (`ProjectMember`) ↔ Usuários.
- Time (`Team`) ↔ Membros (`TeamMember`) ↔ Usuários. Times podem estar associados a projetos.
- Sessão (`Session`), Participante (`SessionParticipant`), Ticket (`Ticket`). Sessão pode ter `currentTicket`.
- Convite (`Invite`): fluxo de onboard e permissões iniciais.
- Público (Modo Aberto): `OpenSession`, `OpenSessionParticipant`, `OpenTicket`, `OpenVote` (sem `organizationId`).

Padrão de multi-tenancy: todos os recursos empresariais têm `organizationId` e são filtrados nos handlers via middleware.

Arquivos de referência:
- Prisma Schema: `prisma/schema.prisma`
- Cliente Prisma: `src/lib/db/index.ts`

---

## Autenticação, Autorização e Isolamento de Tenant

- JWT (`src/lib/auth/jwt.ts`)
  - `generateAccessToken(user, organization, rememberMe)` inclui claims: `userId`, `email`, `name`, `role`, `organizationId`, `organizationSlug`, `features` por plano e integrações.
  - `verifyAccessToken`/`verifyRefreshToken` e utilitários (`extractTokenFromHeader`, `isTokenNearExpiration`).
- Rotas de Auth (`src/app/api/auth/*`)
  - `login`: valida credenciais, checa `isActive` do usuário/org, gera access/refresh tokens.
  - `register`: cria `Organization` (slug único) + `User` (ADMIN) em transação; tokens e email de boas-vindas.
  - `refresh`, `logout`, `me`, `forgot-password`, `reset-password` (conforme implementações locais).
- RBAC (`src/lib/auth/roles.ts`)
  - `PERMISSIONS` mapeia ações → roles permitidas; helpers `hasPermission`, `canManageUser`.
- Middlewares (`src/lib/middleware`)
  - `auth.ts`: valida header Authorization e token, retorna payload ou erro padronizado.
  - `authorization.ts`: `requirePermission(permission)` carrega `user` do banco e valida `role`.
  - `tenant.ts`: `withTenantIsolation(handler)` valida token, saúde do sistema e injeta contexto `{ organizationId, userId, userRole }` para filtros Prisma.

---

## API Routes e Fluxos de Dados

Mapa de rotas principais (parcial):

```
/api/v1                 # versão e status
/api/sessions           # GET lista | POST cria sessão
/api/sessions/[id]      # GET/PATCH/DELETE sessão, sub-recursos
/api/sessions/[id]/tickets   # tickets da sessão
/api/tickets            # GET lista | POST cria ticket
/api/projects           # GET/POST, filtra acesso por role/membership
/api/projects/[id]      # GET/PATCH/DELETE
/api/teams              # GET/POST, filtra acesso por role/membership
/api/teams/[id]         # GET/PATCH/DELETE, sub-recursos (members, projects)
/api/users              # GET lista
/api/users/[id]         # GET/PATCH/DELETE com `canManageUser`
/api/open/sessions/*    # endpoints para modo aberto (sem autenticação corporativa)
```

Fluxos típicos:
- Login: `POST /api/auth/login` → valida → tokens → atualiza `lastLoginAt`.
- Criar sessão: `POST /api/sessions` (com `withTenantIsolation`) → cria e adiciona criador como `MODERATOR`.
- Tickets: `POST /api/tickets` valida que `session.organizationId === context.organizationId`.
- Projetos/Times: GET filtra visibilidade; MEMBER/VIEWER vê apenas o que participa (direto ou via team associado).

Serviços de domínio:
- `SessionService`: criação, listagem com relações/contagens, atualização, arquivamento, participantes.
- `TicketService`: criação, update, lifecycle de votação (start/finish), estimativa final.

---

## Realtime (Socket.io)

- Servidor (`server.js`)
  - Express + Socket.io dedicado (WS_PORT). CORS, transports, ping intervals, rate limiting por socket, heartbeat e cleanup.
  - Eventos: `create_room`, `join_room`, `select_card`, `flip_cards`, `new_voting`, `set_revealed`, `ticket_selected`, `ticket_created`, etc.
  - Isolamento: valida `organizationId` no `join_room` (exceto modo aberto) e mantém `sessions` em memória.
- Cliente (`src/components/useSession.ts`)
  - Conexão, `heartbeat` a cada 30s, rejoin em reconexão, emissão de `join_room` com `{ sessionId, userId, userName, organizationId }`.
- Documentação: `docs/WEBSOCKET_EVENTS.md` descreve payloads, limites e lifecycle.

---

## Internacionalização (i18n)

- Configuração cliente: `src/i18n/index.ts` (namespaces `common`, `dashboard`; `fallbackLng: 'en'`; `useSuspense: false`).
- Configuração server: `src/i18n/server.ts`.
- Uso nas APIs e UI: `useTranslation` no frontend; em rotas, `i18next.t('api.errors...')` para respostas coerentes por locale.

---

## E-mail (Templates, Rate Limiting e Envio)

- Serviço: `src/lib/email/service.ts` com `EmailService` e `EmailTemplateFactory` (`welcome`, `invite`, `passwordReset`) em `pt`/`en`.
- Rate limiting por email: janelas horária/diária e cooldown específico para reset.
- Envio condicional: `isEmailConfigured()` e `createTransporter()` em `src/lib/email/config.ts`.
- Integração: envio de boas-vindas no registro; convites/reset conforme rotas.

---

## Segurança, Rate Limiting e Boas Práticas

- JWT: segredos e emissor em `APP_CONFIG` (use secrets seguros em produção).
- Rate limiting: API externa `v1` com verificação de `x-api-key`; Socket.io com limites por socket.
- Senhas: `bcryptjs` com `SALT_ROUNDS` configurável; validação de força de senha; tokens seguros (crypto).
- Multi-tenancy: enforced por middleware + filtros Prisma; considere RLS no Postgres como defesa adicional.
- Logs/Auditoria: pontos de log em login/registro e eventos WS; considerar APM (Sentry, etc.).

---

## Variáveis de Ambiente e Configuração

- Central: `src/lib/config.ts` (APP_NAME, BASE_URL, DATABASE_URL, JWT_* , EMAIL_*, WS_PORT, RATE_LIMIT, FLAGS, SSO, CACHE, etc.).
- Detalhes e exemplos em `docs/ENV_VARIABLES.md`.

---

## Considerações para Migração para Ecossistema

- Fronteiras de Serviços
  - Auth Service dedicado (SSO, contas, sessões, tokens) mantendo `externalId/externalSource` no domínio.
  - Realtime como microserviço com autenticação por JWT/mTLS entre serviços.
  - Organizations/Billing como serviço (planos, features, limites, faturas), sincronizando `plan` e `features` para tokens.
  - API Gateway para unificar autenticação, rate limiting e roteamento (`/api/v1/*`).
- Multi-tenancy
  - Persistir padrão `organizationId` em todos os recursos; reforçar via middleware em todos os serviços.
  - Considerar Row Level Security no Postgres.
- Migração de Dados
  - Entidades: `users`, `organizations`, `teams`, `projects`, `sessions`, `tickets`, `participants`, `invites` (e tabelas open-mode, se necessário).
  - Preservar `externalId/externalSource` para reconciliação com serviços externos.
- Observabilidade
  - Introduzir OpenTelemetry/Tracing entre API, DB e Socket.io.
- Compatibilidade
  - Manter versionamento claro (`/api/v1`) e plano de depreciação gradual.

---

## Referências Internas

- Banco de Dados: `prisma/schema.prisma`, `docs/SCHEMA_BANCO_DADOS.md`
- Multi-Tenancy: `src/lib/middleware/tenant.ts`, `docs/MULTITENANCY_STRATEGY.md`
- Auth/RBAC: `src/lib/auth/jwt.ts`, `src/lib/auth/roles.ts`
- API: `src/app/api/*`, `docs/API_ENDPOINTS.md`
- Realtime: `server.js`, `docs/WEBSOCKET_EVENTS.md`
- i18n: `src/i18n/*`
- E-mail: `src/lib/email/service.ts`, `src/lib/email/config.ts`
- Config/Env: `src/lib/config.ts`, `docs/ENV_VARIABLES.md`

---

## Anexo – Exemplos Rápidos

Criar sessão (REST):

```http
POST /api/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sprint 42 - Estimativas",
  "projectId": "proj_123",
  "votingMode": "FIBONACCI",
  "autoReveal": false,
  "allowObservers": true
}
```

Conectar no WS (cliente):

```js
socket.emit("join_room", {
  sessionId,
  userId,
  userName,
  organizationId
});
```

---

> Esta documentação reflete o estado atual do repositório e serve como base para a migração a um ecossistema de serviços. Atualize-a a cada mudança relevante de arquitetura.
