# Variáveis de Ambiente - Poker Planning

## Configurações do Banco de Dados

### `DATABASE_URL`
**Obrigatório** - URL de conexão com o PostgreSQL
```
DATABASE_URL="postgresql://username:password@localhost:5432/poker_planning"
```

## Configurações de Autenticação

### `JWT_SECRET`
**Obrigatório** - Chave secreta para assinatura de tokens JWT
```
JWT_SECRET="sua-chave-secreta-muito-segura-aqui"
```

### `JWT_REFRESH_SECRET`
**Obrigatório** - Chave secreta para tokens de refresh
```
JWT_REFRESH_SECRET="sua-chave-refresh-secreta-muito-segura-aqui"
```

### `JWT_ACCESS_EXPIRES_IN`
**Opcional** - Tempo de expiração do token de acesso (padrão: 15m)
```
JWT_ACCESS_EXPIRES_IN="15m"
```

### `JWT_REFRESH_EXPIRES_IN`
**Opcional** - Tempo de expiração do token de refresh (padrão: 7d)
```
JWT_REFRESH_EXPIRES_IN="7d"
```

## Configurações de Email

### `SMTP_HOST`
**Obrigatório** - Servidor SMTP
```
SMTP_HOST="smtp.gmail.com"
```

### `SMTP_PORT`
**Opcional** - Porta do servidor SMTP (padrão: 587)
```
SMTP_PORT="587"
```

### `SMTP_SECURE`
**Opcional** - Usar SSL/TLS (padrão: false)
```
SMTP_SECURE="false"
```

### `SMTP_USER`
**Obrigatório** - Usuário do servidor SMTP
```
SMTP_USER="seu-email@gmail.com"
```

### `SMTP_PASS`
**Obrigatório** - Senha do servidor SMTP (ou app password para Gmail)
```
SMTP_PASS="sua-senha-ou-app-password"
```

### `EMAIL_FROM`
**Opcional** - Email remetente (padrão: noreply@pokerplanning.com)
```
EMAIL_FROM="noreply@pokerplanning.com"
```

### `EMAIL_REPLY_TO`
**Opcional** - Email para resposta (padrão: support@pokerplanning.com)
```
EMAIL_REPLY_TO="support@pokerplanning.com"
```

### `NEXT_PUBLIC_APP_URL`
**Opcional** - URL base da aplicação para links em emails
```
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Configurações de Rate Limiting

### `MAX_EMAILS_PER_HOUR`
**Opcional** - Máximo de emails por hora por usuário (padrão: 10)
```
MAX_EMAILS_PER_HOUR="10"
```

### `MAX_EMAILS_PER_DAY`
**Opcional** - Máximo de emails por dia por usuário (padrão: 100)
```
MAX_EMAILS_PER_DAY="100"
```

### `RESET_PASSWORD_COOLDOWN`
**Opcional** - Tempo de espera entre solicitações de reset de senha em segundos (padrão: 300)
```
RESET_PASSWORD_COOLDOWN="300"
```

## Configurações do Servidor

### `HOST`
**Opcional** - Host do servidor Next.js (padrão: localhost)
```
HOST="localhost"
```

### `PORT`
**Opcional** - Porta do servidor Next.js (padrão: 3000)
```
PORT="3000"
```

## IdP (Identity Provider)

### `IDP_ISSUER`
**Opcional** - Emissor OIDC do IdP (padrão: `http://localhost:3100`)
```
IDP_ISSUER="http://localhost:3100"
```

### `IDP_JWT_SECRET`
**Obrigatório (dev)** - Segredo HS256 para assinatura dos tokens emitidos pelo IdP
```
IDP_JWT_SECRET="idp-dev-secret"
```

### `IDP_DATABASE_URL`
**Opcional** - URL de conexão do banco do IdP (separado do app principal)
```
IDP_DATABASE_URL="postgresql://username:password@localhost:5432/poker_planning"
```

### `WS_PORT`
**Opcional** - Porta do servidor WebSocket (padrão: 3001)
```
WS_PORT="3001"
```

## Configurações de Desenvolvimento

### `NODE_ENV`
**Opcional** - Ambiente de execução
```
NODE_ENV="development"
```

### `ENABLE_PASSWORD_RESET`
**Opcional** - Habilitar reset de senha (padrão: true)
```
ENABLE_PASSWORD_RESET="true"
```

## Exemplo de arquivo .env

```env
# Banco de Dados
DATABASE_URL="postgresql://username:password@localhost:5432/poker_planning"

# JWT
JWT_SECRET="sua-chave-secreta-muito-segura-aqui"
JWT_REFRESH_SECRET="sua-chave-refresh-secreta-muito-segura-aqui"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Email (Gmail)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-app-password"
EMAIL_FROM="noreply@pokerplanning.com"
EMAIL_REPLY_TO="support@pokerplanning.com"

# Aplicação
NEXT_PUBLIC_APP_URL="http://localhost:3000"
HOST="localhost"
PORT="3000"
WS_PORT="3001"

# Rate Limiting
MAX_EMAILS_PER_HOUR="10"
MAX_EMAILS_PER_DAY="100"
RESET_PASSWORD_COOLDOWN="300"

# Desenvolvimento
NODE_ENV="development"
ENABLE_PASSWORD_RESET="true"
```

## Configuração do Gmail

Para usar Gmail como servidor SMTP:

1. Ative a verificação em duas etapas na sua conta Google
2. Gere uma "App Password" em https://myaccount.google.com/apppasswords
3. Use a App Password como `SMTP_PASS`

## Configuração de outros provedores

### SendGrid
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="sua-api-key-do-sendgrid"
```

### Amazon SES
```env
SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
SMTP_PORT="587"
SMTP_USER="sua-access-key"
SMTP_PASS="sua-secret-key"
```

### Outlook/Hotmail
```env
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_USER="seu-email@outlook.com"
SMTP_PASS="sua-senha"
```