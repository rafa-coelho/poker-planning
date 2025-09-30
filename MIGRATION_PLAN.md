# MIGRATION PLAN — Nyx Suite (Poker Planning → Ecossistema com IdP)

Este documento acompanha a migração arquitetural controlada do projeto Poker Planning para um ecossistema multi-app, começando pela extração de um Identity Provider (IdP) central.

Regras fundamentais:
- Cada fase termina com o sistema rodando normalmente e testado.
- Nada pode ser quebrado no meio do processo.
- O “Jira” não será criado agora, apenas previsto.
- Plano seguido passo a passo, com documentação clara.
- Este arquivo será atualizado a cada fase com status, pendências e próximos passos.

---

## Estrutura alvo (sugerida)

```
/nyx-suite
  /apps
    /poker-planning
    /idp
  /packages
    /domain
    /auth
    /config
  MIGRATION_PLAN.md
  docker-compose.yml
```

---

## Fases

### Fase 0 — Diagnóstico e Preparação (branch: migration/phase-0)

- [x] Criar `MIGRATION_PLAN.md` no repositório com introdução e fases listadas.
- [x] Rodar Poker Planning local e confirmar funcionamento atual (build OK; app compila e páginas geradas).
- [x] Inventariar dependências críticas (DB, Redis, Auth, WS).
  - DB: PostgreSQL via Prisma (`DATABASE_URL`).
  - Auth: JWT interno (`src/lib/auth/jwt.ts`).
  - WS: Socket.io em `server.js` (porta `WS_PORT`).
  - Cache/Redis: planejado (não obrigatório atualmente).
- [x] Adicionar feature flag `USE_EXTERNAL_IDP=false` em `config.ts` (controlada por env).
- [x] Commit: "chore: inicializa plano de migração com flags".
- [x] Documentar status (testes locais) abaixo.

Status atual:
- Flag `USE_EXTERNAL_IDP` criada em `src/lib/config.ts` (default false por env).
- Documentação de arquitetura criada em `docs/ARQUITETURA.md`.
- Próximos passos imediatos: validar `npm run lint` e `npm run build`, subir app (`npm run dev`).

---

### Fase 1 — Refatoração mínima e pacotes internos (branch: migration/phase-1)

- [x] Criar `/packages/domain` (placeholder inicial) e preparar contratos centrais.
- [x] Criar `/packages/auth` reexportando utils e middlewares atuais.
- [x] Criar `/packages/config` reexportando config central.
- [x] Habilitar workspaces no `package.json`.
- [x] Atualizar Poker Planning para consumir dos pacotes (troca de imports) sem alterar rotas públicas.
- [x] Testar Poker Planning → sistema deve rodar igual antes (build OK).
- [x] Commit: "refactor: bootstrap internal packages (auth, domain, config) and enable workspaces".
- [x] Commit: "refactor(phase-1): route imports to @nyx/auth & @nyx/config, add workspaces and aliases".
- [x] Documentar mudanças e checklist.

---

### Fase 2 — Estrutura de mono repo (Nx/Turborepo) (branch: migration/phase-2)

- [ ] Converter repositório em mono repo com `apps/` e `packages/`.
- [ ] Garantir que `dev` ainda sobe Poker sem erros.
- [ ] Atualizar Dockerfile e `docker-compose.yml` para multi-app.
- [ ] Commit: "chore: configura mono repo para nyx-suite".
- [ ] Documentar.

---

### Fase 3 — Introdução do IdP (ao lado) (branch: migration/phase-3)

- [x] Criar app `apps/idp` (Next.js App Router) com esqueleto.
- [x] Implementar endpoints: `/api/oidc/token`, `/api/oidc/userinfo`, `/api/oidc/.well-known/openid-configuration` (scaffold HS256 dev).
- [x] Banco do IdP: `users`, `organizations`, `memberships` (Prisma schema criado, ainda não integrado).
- [x] JWT do IdP conter: `sub`, `tenantId`, `roles`, `features`.
- [x] Poker governado por feature flag `USE_EXTERNAL_IDP` para aceitar tokens do IdP ou login interno.
- [x] Commit: "feat(idp): adiciona idp inicial com fluxo oidc".
- [x] Documentar endpoints e configuração.
- [x] Páginas do IdP: `/login` e `/register` (UI mínima para emissão de tokens dev).

**IMPORTANTE**: Nesta fase, o IdP está **MOCKADO** para desenvolvimento:
- `/api/oidc/token` aceita qualquer username/password e retorna token hardcoded
- Não há validação real de credenciais
- Não há integração com banco de dados ainda
- Objetivo: testar dual-auth e account linking no app Poker

---

### Fase 4 — Dual-auth no Poker (branch: migration/phase-4)

- [x] Atualizar middleware de auth no Poker para aceitar `iss=poker-app` (interno) e `iss=idp-app` (IdP).
- [x] Implementar account linking via `externalId`/`externalSource`.
- [x] Testar login local e via IdP (ambos funcionam).
- [x] Commit: "feat(auth): poker aceita login do idp ou interno".
- [x] Documentar cenários de teste.

Status:
- `.env.local` criado com `USE_EXTERNAL_IDP=true`, `EXTERNAL_IDP_JWT_SECRET`, `EXTERNAL_IDP_ISSUER`
- Middleware `src/lib/middleware/auth.ts` atualizado com logs de dual-auth
- Documentação de testes criada em `docs/DUAL_AUTH_TEST.md`
- App aceita tokens internos (`iss=poker-planning-app`) e do IdP (`iss=http://localhost:3100`)
- Account linking preparado via flags `isExternalIdp` e `externalSub` no payload

---

### Fase 5 — Migração completa para IdP (branch: migration/phase-5)

- [ ] Marcar `USE_EXTERNAL_IDP=true` como default.
- [ ] Desativar rotas internas de login/registro no Poker.
- [ ] Poker só aceita tokens emitidos pelo IdP.
- [ ] Commit: "refactor(auth): poker depende exclusivamente do idp".
- [ ] Documentar conclusão.

---

### Fase 6 — IdP Real (Banco de Dados e Auth) (branch: migration/phase-6)

- [ ] **Integrar Prisma no IdP**: conectar `apps/idp/prisma/schema.prisma` ao banco
- [ ] **Implementar auth real no IdP**:
  - `/api/auth/register`: criar usuário no banco do IdP
  - `/api/auth/login`: validar credenciais e emitir token
  - Bcrypt para hash de senhas
  - Validação de email/password
- [ ] **CRUD de Organizations** no IdP
- [ ] **Gerenciamento de Memberships** (users ↔ orgs)
- [ ] **Sincronização**: script para migrar users do Poker para IdP
- [ ] **UI funcional**: login/register pages com forms reais
- [ ] Commit: "feat(idp): implement real database auth and user management"

---

### Fase 7 — Endurecimento e Features Avançadas (branch: migration/phase-7)

- [ ] **RS256 com JWKS**: substituir HS256 dev por chaves públicas/privadas
- [ ] **Refresh tokens** no IdP
- [ ] **Claims customizados**: `features[]`, `plan`, `permissions[]`
- [ ] **Auditoria completa**: logs de login, token refresh, etc
- [ ] **Rate limiting** no IdP
- [ ] **OAuth2 flows**: authorization_code, client_credentials
- [ ] Commit: "feat(idp): harden security with RS256, refresh tokens, and oauth2"

---

## Pendências Gerais
- Definir ferramenta do monorepo (Turborepo recomendado; Nx como alternativa). → **Fase 2**
- Diagramas ER e de fluxo OIDC – adicionar ao `docs/` conforme avançar. → **Fase 6**
- Estratégia de migração de dados (users/orgs) e backfill de `externalId`. → **Fase 6**
- Endurecer IdP para RS256 (JWKS com chave pública) em vez de HS256 dev. → **Fase 7**

## Estado Atual do IdP (Fase 3)

**O que ESTÁ funcionando:**
✅ Estrutura do app `apps/idp` criada
✅ Endpoints OIDC mockados (`/api/oidc/token`, `/api/oidc/userinfo`, `/.well-known/openid-configuration`)
✅ Prisma schema definido (`Organization`, `User`, `Membership`)
✅ UI mínima (`/login`, `/register`) para dev
✅ Poker app aceita tokens do IdP via dual-auth
✅ Account linking preparado

**O que NÃO ESTÁ funcionando (será implementado na Fase 6):**
❌ Validação real de credenciais (aceita qualquer user/pass)
❌ Integração com banco de dados (Prisma não conectado)
❌ CRUD de usuários e organizações
❌ Hash de senhas
❌ Refresh tokens
❌ Migrations do Prisma executadas
❌ Sincronização de dados entre Poker e IdP

**Por que está mockado?**
- Foco atual: validar dual-auth e account linking no Poker
- IdP real requer banco separado, migrations, e lógica complexa
- Implementação incremental: primeiro conexão, depois features

## Histórico de Atualizações
- Phase 0 inicializada em `migration/phase-0`.
- Flags adicionadas e documentação de arquitetura criada.
