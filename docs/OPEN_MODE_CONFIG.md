# 🔓 Configuração do Modo Aberto

## 📋 Arquivo .env para Modo Aberto

Crie um arquivo `.env` com as seguintes configurações:

```env
# 🔓 Configuração para Modo Aberto

# ========================================
# CONFIGURAÇÕES OBRIGATÓRIAS
# ========================================

# Banco de dados
DATABASE_URL="postgresql://poker_user:poker_password@localhost:5432/poker_planning?schema=public"

# ========================================
# MODO ABERTO - CONFIGURAÇÕES
# ========================================

# Habilitar modo aberto
OPEN_MODE_ENABLED=true

# Duração das sessões (24 horas em segundos)
OPEN_MODE_SESSION_TTL=86400

# Limite de participantes por sessão
OPEN_MODE_MAX_PARTICIPANTS=50

# Limite de sessões por IP
OPEN_MODE_MAX_SESSIONS_PER_IP=10

# Intervalo de limpeza automática (1 hora em segundos)
OPEN_MODE_CLEANUP_INTERVAL=3600

# ========================================
# CONFIGURAÇÕES OPCIONAIS
# ========================================

# Ambiente
NODE_ENV="development"

# Servidor
HOST="localhost"
PORT="3000"
WS_PORT="3001"

# Base URL
BASE_URL="http://localhost:3000"

# ========================================
# CONFIGURAÇÕES DE DESENVOLVIMENTO
# ========================================

# Logs detalhados
LOG_LEVEL="debug"
ENABLE_DEBUG_MODE=true

# Swagger (documentação da API)
ENABLE_SWAGGER=true

# ========================================
# CONFIGURAÇÕES DE SEGURANÇA
# ========================================

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN="http://localhost:3000"

# ========================================
# CONFIGURAÇÕES AVANÇADAS
# ========================================

# Cache
CACHE_TTL=3600

# Analytics (desabilitado por padrão)
ANALYTICS_ENABLED=false
```

## 🚀 Setup Rápido

### 1. Configurar Banco de Dados

```bash
# Iniciar PostgreSQL via Docker
docker-compose up -d postgres

# Executar migrations
npx prisma migrate dev

# Gerar Prisma Client
npx prisma generate
```

### 2. Configurar Ambiente

```bash
# Copiar configuração
cp docs/OPEN_MODE_CONFIG.md .env

# Editar configurações necessárias
nano .env
```

### 3. Iniciar Aplicação

```bash
# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm run dev
```

### 4. Testar API

```bash
# Criar sessão
curl -X POST http://localhost:3000/api/open/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sprint Planning",
    "description": "Estimativas para sprint 15",
    "creatorName": "João Silva"
  }'

# Acessar sessão (substitua {sessionId} pelo ID retornado)
curl http://localhost:3000/api/open/sessions/{sessionId}
```

## 🔧 Configurações de Produção

Para produção, ajuste as seguintes configurações:

```env
# Ambiente
NODE_ENV="production"

# Configurações mais restritivas
OPEN_MODE_MAX_SESSIONS_PER_IP=5
OPEN_MODE_CLEANUP_INTERVAL=1800  # 30 minutos

# Rate limiting mais restritivo
RATE_LIMIT_MAX_REQUESTS=30

# Logs menos verbosos
LOG_LEVEL="info"
ENABLE_DEBUG_MODE=false
ENABLE_SWAGGER=false
```

## 🧹 Limpeza Manual

Para executar limpeza manual (apenas em desenvolvimento):

```bash
# Via API
curl -X POST http://localhost:3000/api/admin/cleanup

# Verificar status
curl http://localhost:3000/api/admin/cleanup
```

## 🔍 Troubleshooting

### Problemas Comuns

**Erro: "Open mode is not enabled"**
```bash
# Verificar se OPEN_MODE_ENABLED=true no .env
grep OPEN_MODE_ENABLED .env
```

**Erro: "Database connection failed"**
```bash
# Verificar se PostgreSQL está rodando
docker ps | grep postgres

# Verificar DATABASE_URL
echo $DATABASE_URL
```

**Erro: "Migration failed"**
```bash
# Resetar banco (CUIDADO: perde todos os dados)
npx prisma migrate reset

# Ou executar migrations manualmente
npx prisma migrate dev
```

### Logs Úteis

```bash
# Ver logs da aplicação
npm run dev

# Ver logs do PostgreSQL
docker logs poker-planning-postgres

# Ver logs de limpeza automática
grep "Limpeza automática" logs/app.log
```

## 📊 Monitoramento

### Métricas Importantes

- **Sessões ativas**: `SELECT COUNT(*) FROM open_sessions WHERE status = 'ACTIVE'`
- **Participantes**: `SELECT COUNT(*) FROM open_session_participants WHERE is_active = true`
- **Tickets**: `SELECT COUNT(*) FROM open_tickets`
- **Votos**: `SELECT COUNT(*) FROM open_votes`

### Comandos SQL Úteis

```sql
-- Sessões criadas hoje
SELECT COUNT(*) FROM open_sessions 
WHERE DATE(created_at) = CURRENT_DATE;

-- Participantes por sessão
SELECT session_id, COUNT(*) as participants
FROM open_session_participants 
WHERE is_active = true 
GROUP BY session_id;

-- Sessões expiradas
SELECT COUNT(*) FROM open_sessions 
WHERE expires_at < NOW();
```

## 🔒 Segurança

### Recomendações

1. **Rate Limiting**: Configure limites apropriados para seu uso
2. **IP Whitelist**: Considere restringir por IP em produção
3. **Monitoring**: Monitore logs para detectar abuse
4. **Backup**: Faça backup regular dos dados importantes
5. **Updates**: Mantenha dependências atualizadas

### Configurações de Segurança

```env
# Rate limiting mais restritivo
RATE_LIMIT_MAX_REQUESTS=20
RATE_LIMIT_WINDOW_MS=600000  # 10 minutos

# Limites mais baixos
OPEN_MODE_MAX_PARTICIPANTS=20
OPEN_MODE_MAX_SESSIONS_PER_IP=3

# Logs de segurança
LOG_LEVEL="warn"
```

---

**Nota**: O modo aberto é ideal para uso temporário e não deve ser usado para dados críticos ou de longo prazo.
