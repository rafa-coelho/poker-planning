# 📋 Variáveis de Ambiente - Poker Planning Empresarial

## 🚀 Configuração Rápida

1. **Copie o arquivo `.env.example` para `.env`**
2. **Preencha as variáveis obrigatórias**
3. **Execute `npm run dev`**

## 📝 Variáveis Obrigatórias

```bash
# Banco de dados
DATABASE_URL=postgresql://username:password@localhost:5432/poker_planning

# JWT (GERE SUAS PRÓPRIAS CHAVES!)
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
```

## 🔧 Todas as Variáveis

### Informações da Aplicação
```bash
APP_NAME=Poker Planning Empresarial
APP_VERSION=1.0.0
APP_DESCRIPTION=Plataforma empresarial de Poker Planning para estimativas ágeis
```

### Ambiente
```bash
NODE_ENV=development
```

### Servidor
```bash
PORT=3000
HOST=localhost
BASE_URL=http://localhost:3000
```

### Banco de Dados
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/poker_planning
```

### Autenticação JWT
```bash
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_ISSUER=poker-planning-app
```

### Senhas
```bash
PASSWORD_SALT_ROUNDS=12
```

### Email (Futuro)
```bash
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your-email-api-key-here
EMAIL_FROM=noreply@pokerplanning.com
EMAIL_FROM_NAME=Poker Planning
```

### WebSocket
```bash
WS_PORT=3001
```

### Logs
```bash
LOG_LEVEL=info
```

### Rate Limiting
```bash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Features
```bash
ENABLE_REGISTRATION=true
ENABLE_PASSWORD_RESET=true
ENABLE_EMAIL_VERIFICATION=false
```

### Multi-tenancy
```bash
DEFAULT_ORGANIZATION_PLAN=FREE
```

### Segurança
```bash
SESSION_SECRET=your-session-secret-here
CORS_ORIGIN=http://localhost:3000
```

### Cache (Futuro)
```bash
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
```

### Analytics (Futuro)
```bash
ANALYTICS_ENABLED=false
SENTRY_DSN=
```

### Pagamentos (Futuro)
```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Integrações (Futuro)
```bash
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=
```

### Desenvolvimento
```bash
ENABLE_SWAGGER=true
ENABLE_DEBUG_MODE=true
```

## 🔐 Geração de Chaves Seguras

### Para Produção
```bash
# JWT Secret
openssl rand -base64 32

# JWT Refresh Secret
openssl rand -base64 32

# Session Secret
openssl rand -base64 32
```

## 📊 Configurações por Ambiente

### Desenvolvimento
```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_DEBUG_MODE=true
ENABLE_SWAGGER=true
```

### Produção
```bash
NODE_ENV=production
LOG_LEVEL=info
ENABLE_DEBUG_MODE=false
ENABLE_SWAGGER=false
```

### Teste
```bash
NODE_ENV=test
LOG_LEVEL=error
ENABLE_DEBUG_MODE=false
ENABLE_SWAGGER=false
```

## ⚠️ Importante

1. **NUNCA** commite o arquivo `.env` no repositório
2. **SEMPRE** gere chaves únicas para produção
3. **MANTENHA** as chaves JWT seguras
4. **USE** variáveis diferentes para cada ambiente
5. **VALIDE** as configurações obrigatórias na inicialização