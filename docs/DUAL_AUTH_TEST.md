# 🔐 Dual Auth - Cenários de Teste (Fase 4)

Este documento descreve os cenários de teste para validar a autenticação dual (login interno + IdP externo) durante a Fase 4 da migração.

## 📋 Visão Geral

O sistema agora aceita **dois tipos de token JWT**:

1. **Token Interno** (`iss=poker-planning-app`): Emitido pelo próprio app via `/api/auth/login`
2. **Token IdP** (`iss=http://localhost:3100`): Emitido pelo IdP via `/api/oidc/token`

## 🧪 Cenários de Teste

### Cenário 1: Login Interno (Legado)

**Objetivo**: Validar que o login interno continua funcionando normalmente.

```bash
# 1. Criar usuário (se não existir)
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "name": "Usuário Teste",
  "email": "teste@example.com",
  "password": "senha123",
  "organizationName": "Org Teste"
}

# 2. Login interno
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "teste@example.com",
  "password": "senha123"
}

# Response esperado:
{
  "user": { ... },
  "organization": { ... },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",  # iss=poker-planning-app
    "refreshToken": "..."
  }
}

# 3. Testar rota protegida com token interno
GET http://localhost:3000/api/auth/me
Authorization: Bearer <accessToken_interno>

# Response esperado: perfil do usuário
```

---

### Cenário 2: Login via IdP Externo

**Objetivo**: Validar que tokens emitidos pelo IdP são aceitos pelo app.

```bash
# 1. Obter token do IdP
POST http://localhost:3100/api/oidc/token
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=dev&password=dev

# Response esperado:
{
  "token_type": "Bearer",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",  # iss=http://localhost:3100
  "id_token": "...",
  "expires_in": 900
}

# 2. Testar rota protegida com token do IdP
GET http://localhost:3000/api/auth/me
Authorization: Bearer <access_token_do_idp>

# Response esperado:
# - Se usuário com externalId existir: perfil do usuário linkado
# - Se não existir: criação automática ou erro (depende da implementação)
```

---

### Cenário 3: Account Linking (externalId)

**Objetivo**: Validar que usuários podem ser linkados entre app interno e IdP.

```bash
# 1. Criar usuário no app interno
POST http://localhost:3000/api/auth/register
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "senha123",
  "organizationName": "Empresa ABC"
}

# 2. Linkar com externalId (via migration script ou API admin)
PATCH http://localhost:3000/api/users/{userId}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "externalId": "user:dev",  # sub do token IdP
  "externalSource": "idp"
}

# 3. Login via IdP
POST http://localhost:3100/api/oidc/token
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=dev&password=dev

# 4. Usar token IdP no app
GET http://localhost:3000/api/auth/me
Authorization: Bearer <access_token_do_idp>

# Response esperado: perfil de "João Silva" (usuário linkado)
```

---

### Cenário 4: Validação de Issuer

**Objetivo**: Garantir que tokens de issuers desconhecidos são rejeitados.

```bash
# 1. Criar token fake com issuer inválido
# (usar jwt.io ou biblioteca para criar token com iss=http://fake-idp.com)

# 2. Tentar usar token fake
GET http://localhost:3000/api/auth/me
Authorization: Bearer <token_fake>

# Response esperado:
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token inválido ou expirado",
    "timestamp": "..."
  }
}
```

---

### Cenário 5: Token Expirado

**Objetivo**: Validar que tokens expirados são rejeitados (interno e IdP).

```bash
# 1. Obter token IdP (expira em 15min)
POST http://localhost:3100/api/oidc/token
...

# 2. Esperar expiração (ou manipular exp no token)

# 3. Tentar usar token expirado
GET http://localhost:3000/api/auth/me
Authorization: Bearer <token_expirado>

# Response esperado:
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token inválido ou expirado",
    "timestamp": "..."
  }
}
```

---

## 🔧 Testes Automatizados (Futuro)

### Jest/Vitest

```typescript
describe('Dual Auth', () => {
  it('should accept internal token', async () => {
    const token = await loginInternal('test@example.com', 'senha123')
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(response.status).toBe(200)
  })

  it('should accept IdP token', async () => {
    const token = await getIdpToken('dev', 'dev')
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(response.status).toBe(200)
  })

  it('should reject invalid issuer', async () => {
    const fakeToken = jwt.sign({ sub: 'fake' }, 'secret', { issuer: 'http://fake.com' })
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${fakeToken}` }
    })
    expect(response.status).toBe(401)
  })
})
```

---

## 📊 Checklist de Validação

- [ ] Login interno continua funcionando normalmente
- [ ] Token do IdP é aceito nas rotas protegidas
- [ ] Account linking via externalId funciona
- [ ] Tokens com issuer inválido são rejeitados
- [ ] Tokens expirados são rejeitados (interno e IdP)
- [ ] Mapeamento de claims (sub → userId, tenantId → organizationId) correto
- [ ] Features e roles do token IdP são respeitados
- [ ] Logs de auditoria registram origem do token (interno vs IdP)

---

## 🚀 Próximos Passos (Fase 5)

1. Desabilitar login interno (`ENABLE_REGISTRATION=false`)
2. Redirecionar `/login` para IdP
3. Marcar `USE_EXTERNAL_IDP=true` como default
4. Migrar todos os usuários com `externalId`
5. Remover código de auth interno

---

**Status**: 🟡 Em testes (Fase 4)
**Última atualização**: 2025-01-30
