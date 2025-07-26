# Estratégia Multi-Tenant - Poker Planning

## Visão Geral

A aplicação Poker Planning implementa **multi-tenancy** baseado em **organizações** para garantir isolamento completo de dados entre diferentes empresas/teams que utilizam a plataforma.

## Arquitetura Multi-Tenant

### 1. Isolamento por Organização

Todos os recursos são isolados pelo campo `organizationId`:

```typescript
// Exemplo: Sessões sempre filtradas por organização
const sessions = await prisma.session.findMany({
  where: { organizationId: context.organizationId }
})
```

### 2. Middleware de Isolamento

#### `withTenantIsolation`
Garante que todas as queries sejam automaticamente filtradas pela organização do usuário:

```typescript
// src/lib/middleware/tenant.ts
export function withTenantIsolation(
  handler: (req: NextRequest, context: TenantContext) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const context = await getTenantContext(req)
    return handler(req, context)
  }
}

// Uso em API Routes
export const GET = withTenantIsolation(async (req, context) => {
  // context.organizationId sempre disponível
  const sessions = await prisma.session.findMany({
    where: { organizationId: context.organizationId }
  })
  return NextResponse.json({ sessions })
})
```

#### `withResourceAccess`
Valida se um recurso específico pertence à organização do usuário:

```typescript
// src/lib/middleware/tenant.ts
export function withResourceAccess(
  resourceId: string,
  resourceType: 'session' | 'ticket' | 'project',
  handler: (req: NextRequest, context: TenantContext) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const context = await getTenantContext(req)
    const hasAccess = await validateResourceOwnership(resourceId, resourceType, context.organizationId)
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Recurso não encontrado ou sem permissão' }, { status: 404 })
    }
    
    return handler(req, context)
  }
}

// Uso em API Routes dinâmicas
export const GET = withResourceAccess(
  undefined as any, // ID extraído da URL
  'session',
  async (req, context) => {
    // Recurso já validado como pertencente à organização
    const session = await prisma.session.findUnique({
      where: { id: sessionId, organizationId: context.organizationId }
    })
    return NextResponse.json({ session })
  }
)
```

### 3. Context React para Organização

#### `OrganizationContext`
Fornece dados da organização, permissões e limites no frontend:

```typescript
// src/lib/context/organization.ts
export interface OrganizationContext extends TenantContext {
  permissions: {
    canCreateSession: boolean
    canInviteUser: boolean
    canCreateProject: boolean
    canManageUsers: boolean
  }
  features: {
    advancedVoting: boolean
    analytics: boolean
    customBranding: boolean
    apiAccess: boolean
  }
  limits: {
    maxSessions: number
    maxUsers: number
    maxProjects: number
  }
  usage: {
    currentSessions: number
    currentUsers: number
    currentProjects: number
  }
}
```

#### Hooks de Organização

```typescript
// Uso no frontend
function Dashboard() {
  const { organization, permissions, features, limits, usage } = useOrganization()
  const canCreateSession = usePermission('canCreateSession')
  const hasAnalytics = useFeature('analytics')
  
  return (
    <div>
      <h1>Dashboard - {organization.name}</h1>
      {canCreateSession && <CreateSessionButton />}
      {hasAnalytics && <AnalyticsWidget />}
      <UsageStats current={usage.currentSessions} limit={limits.maxSessions} />
    </div>
  )
}
```

### 4. Utilities para Queries Multi-Tenant

#### `TenantQueryBuilder`
Facilita a construção de queries com filtros automáticos de organização:

```typescript
// src/lib/utils/tenant.ts
export class TenantQueryBuilder {
  constructor(private context: TenantContext) {}
  
  sessions() {
    return prisma.session.findMany({
      where: { organizationId: this.context.organizationId }
    })
  }
  
  tickets() {
    return prisma.ticket.findMany({
      where: {
        session: { organizationId: this.context.organizationId }
      }
    })
  }
  
  projects() {
    return prisma.project.findMany({
      where: { organizationId: this.context.organizationId }
    })
  }
  
  users() {
    return prisma.user.findMany({
      where: { organizationId: this.context.organizationId }
    })
  }
}

// Uso
const queryBuilder = createTenantQueryBuilder(context)
const sessions = await queryBuilder.sessions()
const tickets = await queryBuilder.tickets()
```

#### Funções de Validação

```typescript
// Validar se um recurso pertence à organização
const hasAccess = await validateResourceOwnership(
  sessionId, 
  'session', 
  context.organizationId
)

// Obter estatísticas da organização
const stats = await getOrganizationStats(context.organizationId)

// Verificar limites do plano
const limits = await checkOrganizationLimits(
  context.organizationId, 
  context.plan
)
```

## API Routes Multi-Tenant

### Estrutura Implementada

```
/api/sessions/          # GET, POST (com isolamento)
/api/sessions/[id]/     # GET, PATCH, DELETE (com validação de acesso)
/api/tickets/           # GET, POST (com isolamento)
/api/tickets/[id]/      # GET, PATCH, DELETE (com validação de acesso)
/api/projects/          # GET, POST (com isolamento)
/api/projects/[id]/     # GET, PATCH, DELETE (com validação de acesso)
/api/users/             # GET, POST (com isolamento)
/api/users/[id]/        # GET, PATCH, DELETE (com validação de acesso)
```

### Exemplo de Implementação

```typescript
// src/app/api/sessions/route.ts
export const GET = withTenantIsolation(async (req, context) => {
  const sessions = await prisma.session.findMany({
    where: { organizationId: context.organizationId },
    include: {
      project: { select: { id: true, name: true } },
      participants: { select: { id: true, userId: true, role: true } }
    }
  })
  return NextResponse.json({ sessions })
})

export const POST = withTenantIsolation(async (req, context) => {
  const body = await req.json()
  const session = await prisma.session.create({
    data: {
      ...body,
      organizationId: context.organizationId,
      createdById: context.userId
    }
  })
  return NextResponse.json({ session }, { status: 201 })
})
```

## Testes de Isolamento

### Testes Automatizados

```typescript
// tests/multitenancy-isolation.test.ts
describe('Isolamento Multi-Tenant', () => {
  it('Usuário da TechCorp NÃO vê sessões da StartupXYZ', async () => {
    const techcorpSessions = await getSessions(techcorpToken)
    const startupSessions = await getSessions(startupToken)
    
    // IDs não podem se misturar
    const techcorpIds = techcorpSessions.map(s => s.id)
    const startupIds = startupSessions.map(s => s.id)
    
    expect(techcorpIds.some(id => startupIds.includes(id))).toBe(false)
  })
})
```

### Cenários Testados

- ✅ Sessões isoladas por organização
- ✅ Tickets isolados por organização  
- ✅ Projetos isolados por organização
- ✅ Usuários isolados por organização
- ✅ Validação de acesso a recursos específicos
- ✅ Middleware de isolamento funcionando

## Segurança Multi-Tenant

### 1. Validação em Dupla Camada

```typescript
// 1. Middleware valida JWT e extrai organizationId
const context = await getTenantContext(req)

// 2. Query sempre filtra por organizationId
const session = await prisma.session.findFirst({
  where: { 
    id: sessionId, 
    organizationId: context.organizationId 
  }
})
```

### 2. Validação de Recursos Aninhados

```typescript
// Para tickets, validar que a sessão pertence à organização
const ticket = await prisma.ticket.findUnique({
  where: { id },
  include: { session: { select: { organizationId: true } } }
})

if (!ticket || ticket.session.organizationId !== context.organizationId) {
  return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 })
}
```

### 3. Soft Deletes

```typescript
// Usuários são desativados, não removidos
await prisma.user.update({
  where: { id, organizationId: context.organizationId },
  data: { isActive: false }
})
```

## Paywall e Limitações

### 1. Claims JWT para Features

```typescript
// src/lib/auth/jwt.ts
export function hasFeaturePermission(
  feature: keyof typeof PLAN_FEATURES,
  claims: JWTPayload
): boolean {
  return claims.features?.[feature] || false
}

export function isWithinFeatureLimit(
  resource: string,
  currentUsage: number,
  limit: number,
  claims: JWTPayload
): boolean {
  return currentUsage < limit
}
```

### 2. Middleware de Limitação

```typescript
// src/lib/middleware/auth.ts
export function withFeature(
  feature: keyof typeof PLAN_FEATURES,
  handler: (req: NextRequest, context: TenantContext) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const context = await getTenantContext(req)
    
    if (!hasFeaturePermission(feature, context)) {
      return NextResponse.json({ 
        error: 'Feature não disponível no seu plano' 
      }, { status: 403 })
    }
    
    return handler(req, context)
  }
}
```

## Migração para AuthService Externo

### Preparação com `externalId`

```typescript
// Schema preparado para migração
model User {
  id          String   @id @default(cuid())
  externalId  String?  @unique // Para integração futura
  email       String
  organizationId String
  // ... outros campos
}
```

### Estratégia de Migração

1. **Fase 1**: Manter autenticação atual + `externalId` opcional
2. **Fase 2**: Integrar com AuthService, manter compatibilidade
3. **Fase 3**: Migrar completamente para AuthService

## Próximos Passos

### Fase 1.4 - Real-time Multi-Tenant
- [ ] Implementar rooms isoladas por organização no Socket.io
- [ ] Adicionar validação de tenant em eventos real-time
- [ ] Implementar heartbeat e cleanup de conexões

### Fase 2.0 - Paywall Completo
- [ ] Implementar sistema de planos e assinaturas
- [ ] Adicionar middleware de limitação por uso
- [ ] Criar dashboard de analytics por organização

### Fase 3.0 - Integração Externa
- [ ] Preparar para AuthService externo
- [ ] Implementar webhooks para sincronização
- [ ] Adicionar suporte a SSO empresarial

---

**Status**: ✅ **Fase 1.3 - Multi-tenancy Core** **CONCLUÍDA**

- [x] Middleware de isolamento implementado
- [x] API Routes multi-tenant criadas
- [x] Context React para organização
- [x] Utilities para queries multi-tenant
- [x] Testes de isolamento automatizados
- [x] Documentação completa 