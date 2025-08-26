# 🌐 API Externa - Poker Planning Empresarial

## 📋 Visão Geral

Esta documentação descreve a implementação da API externa para integrações com o sistema de Poker Planning Empresarial, incluindo rate limiting, versioning, autenticação por API keys e preparação para mensageria.

## 🔧 Implementações da Fase 4.4

### ✅ **Campos `externalId` Adicionados**

Todos os models principais agora possuem campos para integração externa:

```prisma
// Organization
externalId     String?      @unique
externalSource String?      // "authservice", "billing", "sso"

// Session
externalId     String?      @unique
externalSource String?      // "jira", "azure", "github"

// Project
externalId     String?      @unique
externalSource String?      // "jira", "azure", "github"

// Team
externalId     String?      @unique
externalSource String?      // "jira", "azure", "github"

// Ticket
externalId     String?      @unique
externalSource String?      // "jira", "azure", "github"
```

### ✅ **API Externa v1**

#### Base URL
```
https://api.pokerplanning.com/v1
```

#### Autenticação
```
x-api-key: pk_test_123456789
```

#### Rate Limiting
- **Limite**: 100 requests por minuto
- **Headers de resposta**:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

#### Endpoints Disponíveis

##### **GET /v1/**
Informações sobre a API
```json
{
  "version": "1.0.0",
  "status": "active",
  "endpoints": {
    "sessions": "/api/v1/sessions",
    "projects": "/api/v1/projects",
    "tickets": "/api/v1/tickets"
  }
}
```

##### **GET /v1/sessions**
Listar sessões com paginação
```
GET /v1/sessions?organizationId=org_123&status=ACTIVE&limit=50&offset=0
```

##### **POST /v1/sessions**
Criar nova sessão
```json
{
  "name": "Sprint Planning",
  "description": "Planning da sprint 15",
  "organizationId": "org_123",
  "externalId": "jira_456",
  "externalSource": "jira",
  "votingMode": "FIBONACCI"
}
```

### ✅ **Sistema de API Keys**

#### Mock de API Keys para Desenvolvimento
```typescript
'pk_test_123456789': {
  userId: 'user_1',
  organizationId: 'org_1',
  permissions: ['sessions:read', 'sessions:write']
}

'pk_live_987654321': {
  userId: 'user_2',
  organizationId: 'org_2',
  permissions: ['sessions:read', 'sessions:write', 'projects:read']
}
```

#### Permissões Suportadas
- `sessions:read` - Ler sessões
- `sessions:write` - Criar/editar sessões
- `projects:read` - Ler projetos
- `projects:write` - Criar/editar projetos
- `tickets:read` - Ler tickets
- `tickets:write` - Criar/editar tickets
- `*` - Todas as permissões

### ✅ **Mock de SSO**

#### Provedores Suportados
- Google
- Microsoft
- Okta

#### Fluxo de Autenticação
1. Usuário acessa `/auth/sso/{provider}`
2. Redirecionamento para provedor SSO
3. Callback com código de autorização
4. Troca de código por token
5. Sincronização com banco local
6. Geração de JWT

#### Mock de Tokens
```typescript
'google_code_123' → 'google_token_123'
'microsoft_code_456' → 'microsoft_token_456'
'okta_code_789' → 'okta_token_789'
```

## 🔒 Segurança

### API Externa
- **Autenticação por API key** obrigatória
- **Rate limiting** por API key
- **Validação de permissões** granulares
- **Headers de segurança** em todas as respostas

### SSO
- **Validação de tokens** mock
- **Sincronização segura** com banco local
- **Permissões baseadas** em dados externos
- **Logout seguro** com invalidação

## 📊 Monitoramento

### Logs Implementados
```typescript
[API v1] Error getting sessions: Database connection failed
[SSO] Authenticated user: john.doe@company.com via google
[API Key] Generated new API key: pk_abc123...
```

### Métricas Coletadas
- Requests da API por endpoint
- Rate limiting triggers
- Autenticações SSO

## 🚀 Como Usar

### 1. Usar API Externa
```bash
# Listar sessões
curl -X GET "http://localhost:3000/api/v1/sessions?organizationId=org_123" \
  -H "x-api-key: pk_test_123456789"

# Criar sessão
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "x-api-key: pk_test_123456789" \
  -d '{"name":"Test Session","organizationId":"org_123"}'
```

### 2. Testar SSO
```bash
# Simular callback SSO
curl -X POST http://localhost:3000/api/auth/sso/callback \
  -H "Content-Type: application/json" \
  -d '{"provider":"google","code":"google_code_123"}'
```

## 📚 Documentação da API

### Swagger/OpenAPI
Acesse a documentação completa em:
```
GET /api/v1/docs
```

### Exemplos de Código
```javascript
// JavaScript/Node.js
const response = await fetch('https://api.pokerplanning.com/v1/sessions', {
  headers: {
    'x-api-key': 'pk_test_123456789',
    'Content-Type': 'application/json'
  }
});

// Python
import requests
response = requests.get(
  'https://api.pokerplanning.com/v1/sessions',
  headers={'x-api-key': 'pk_test_123456789'}
);
```

## 🔄 Próximos Passos

### Preparação para Mensageria (Futuro)
1. **Implementar message broker** (Redis/RabbitMQ)
2. **Criar consumers** para eventos de domínio
3. **Migrar de webhooks** para mensageria
4. **Implementar event sourcing** se necessário

### Implementações Futuras
1. **Model de API Keys** no banco de dados
2. **Sistema de mensageria** robusto
3. **Integração real** com provedores SSO
4. **Dashboard** para gerenciar API keys
5. **Analytics** avançados de uso da API

### Migração para Produção
1. Implementar model `ApiKey` no Prisma
2. Configurar provedores SSO reais
3. Implementar rate limiting com Redis
4. Configurar monitoramento e alertas
5. Implementar sistema de mensageria

---

**Status**: ✅ **Fase 4.4 - Preparação Externa** **CONCLUÍDA**

- [x] Campos `externalId` em todos os models
- [x] API externa v1 com rate limiting
- [x] Sistema de API keys
- [x] Mock de SSO
- [x] Documentação OpenAPI
- [x] Estrutura para integrações futuras
- [x] Preparação para migração IDP
- [x] Remoção de webhooks (preparação para mensageria)
