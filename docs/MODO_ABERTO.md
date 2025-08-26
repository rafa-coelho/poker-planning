# 🔓 Modo Aberto - Poker Planning

## 📋 Visão Geral

O **Modo Aberto** é uma versão simplificada do Poker Planning que permite criar e participar de sessões sem necessidade de autenticação, organizações ou persistência de dados. Ideal para uso rápido e temporário.

### ✨ Características

- 🚀 **Sem Autenticação** - Crie e participe sem criar conta
- ⚡ **Rápido e Simples** - Interface focada apenas no essencial
- 🗑️ **Dados Temporários** - Limpeza automática após 24 horas
- 🔒 **Isolado** - Não interfere com dados empresariais
- 📱 **Responsivo** - Funciona em qualquer dispositivo

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# Habilitar modo aberto
OPEN_MODE_ENABLED=true

# Configurações do modo aberto
OPEN_MODE_SESSION_TTL=86400          # 24 horas em segundos
OPEN_MODE_MAX_PARTICIPANTS=50        # Máximo de participantes por sessão
OPEN_MODE_MAX_SESSIONS_PER_IP=10     # Máximo de sessões por IP
OPEN_MODE_CLEANUP_INTERVAL=3600      # Limpeza a cada 1 hora
```

### Ativação

1. **Adicione as variáveis** ao seu arquivo `.env`
2. **Configure `OPEN_MODE_ENABLED=true`**
3. **Reinicie a aplicação**

## 🏗️ Arquitetura

### Estrutura de Dados

```
OpenSession (Sessão Aberta)
├── OpenSessionParticipant[] (Participantes)
├── OpenTicket[] (Tickets)
└── OpenVote[] (Votos)
```

### Separação de Dados

- **Dados Empresariais**: Tabelas `Session`, `User`, `Organization`, etc.
- **Dados Abertos**: Tabelas `OpenSession`, `OpenTicket`, etc.
- **Isolamento Completo**: Nenhuma relação entre os dois modos

## 🔌 API Endpoints

### Criação de Sessão

```http
POST /api/open/sessions
Content-Type: application/json

{
  "name": "Sprint Planning",
  "description": "Estimativas para sprint 15",
  "votingMode": "FIBONACCI",
  "autoReveal": false,
  "allowObservers": true,
  "creatorName": "João Silva"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "open_session_123",
    "name": "Sprint Planning",
    "expiresAt": "2024-01-27T10:00:00Z",
    "creatorName": "João Silva"
  }
}
```

### Acessar Sessão

```http
GET /api/open/sessions/{sessionId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "open_session_123",
    "name": "Sprint Planning",
    "status": "ACTIVE",
    "votingMode": "FIBONACCI",
    "isRevealed": false,
    "participants": [...],
    "tickets": [...],
    "currentTicket": {...}
  }
}
```

### Entrar na Sessão

```http
POST /api/open/sessions/{sessionId}/join
Content-Type: application/json

{
  "name": "Maria Santos"
}
```

### Votar

```http
POST /api/open/sessions/{sessionId}/vote
Content-Type: application/json

{
  "participantName": "Maria Santos",
  "cardValue": "8",
  "ticketId": "ticket_123"
}
```

### Gerenciar Tickets (Criador)

```http
POST /api/open/sessions/{sessionId}/tickets
Content-Type: application/json

{
  "title": "Implementar login",
  "description": "Sistema de autenticação",
  "priority": "HIGH",
  "creatorName": "João Silva"
}
```

### Revelar Votos (Criador)

```http
PUT /api/open/sessions/{sessionId}
Content-Type: application/json

{
  "creatorName": "João Silva",
  "action": "reveal_votes"
}
```

## 🎮 Funcionalidades

### Modos de Votação

- **Fibonacci**: 0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89
- **T-shirt**: XS, S, M, L, XL, XXL
- **Linear**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
- **Custom**: Valores personalizados

### Controles do Criador

- ✅ Criar/editar tickets
- ✅ Definir ticket atual
- ✅ Revelar/esconder votos
- ✅ Definir estimativa final
- ✅ Encerrar sessão

### Participantes

- ✅ Entrar/sair da sessão
- ✅ Votar em tickets
- ✅ Ver resultados (quando revelados)
- ✅ Observar sessão (se permitido)

## 🧹 Limpeza Automática

### Configuração

```typescript
// Limpeza a cada hora
OPEN_MODE_CLEANUP_INTERVAL=3600

// Sessões expiram em 24 horas
OPEN_MODE_SESSION_TTL=86400
```

### O que é Limpo

- ✅ Sessões abertas expiradas
- ✅ Participantes públicos expirados
- ✅ Convites expirados
- ✅ Tokens de reset expirados

### Limpeza Manual

```http
POST /api/admin/cleanup
```

**Apenas em desenvolvimento**

## 🔒 Segurança

### Rate Limiting

- **30 requests/minuto** por IP
- **Limite de participantes**: 50 por sessão
- **Limite de sessões**: 10 por IP

### Validação

- ✅ Nomes de participantes (caracteres válidos)
- ✅ Títulos de tickets (máximo 200 chars)
- ✅ Valores de votação (máximo 10 chars)
- ✅ Sanitização de inputs

### Isolamento

- ✅ Dados completamente separados
- ✅ Sem acesso a dados empresariais
- ✅ Sem persistência de usuários

## 📱 Frontend

### Páginas Principais

- `/open` - Landing page do modo aberto
- `/open/sessions/new` - Criar nova sessão
- `/open/sessions/{id}` - Sessão ativa
- `/open/sessions/{id}/join` - Entrar na sessão

### Componentes

- `OpenSessionCreator` - Criar sessão
- `OpenSessionBoard` - Board da sessão
- `OpenVoteBar` - Barra de votação
- `OpenTicketManager` - Gerenciar tickets

## 🚀 Deploy

### Produção

```env
# Habilitar modo aberto
OPEN_MODE_ENABLED=true

# Configurações de segurança
OPEN_MODE_MAX_SESSIONS_PER_IP=5
OPEN_MODE_CLEANUP_INTERVAL=1800  # 30 minutos
```

### Desenvolvimento

```env
# Configurações mais permissivas
OPEN_MODE_ENABLED=true
OPEN_MODE_MAX_SESSIONS_PER_IP=10
OPEN_MODE_CLEANUP_INTERVAL=3600  # 1 hora
```

## 📊 Monitoramento

### Métricas Importantes

- **Sessões ativas**
- **Participantes por sessão**
- **Taxa de criação de sessões**
- **Uso de recursos**

### Logs

```typescript
// Logs de criação
console.log('🔓 Nova sessão aberta criada:', sessionId)

// Logs de limpeza
console.log('🧹 Limpeza automática:', count, 'registros removidos')

// Logs de erro
console.error('❌ Erro no modo aberto:', error)
```

## 🔄 Migração

### Do Modo Aberto para Empresarial

1. **Criar conta** na versão empresarial
2. **Exportar dados** da sessão aberta
3. **Importar tickets** na nova sessão
4. **Convidar participantes** via email

### Compatibilidade

- ✅ **Dados isolados** - Não há conflito
- ✅ **Mesma funcionalidade** - Votação idêntica
- ✅ **Interface similar** - Experiência consistente

## 🐛 Troubleshooting

### Problemas Comuns

**Sessão não encontrada**
- Verificar se não expirou (24h)
- Verificar se ID está correto

**Erro de rate limit**
- Aguardar 1 minuto
- Verificar número de requests

**Participante não pode votar**
- Verificar se está na sessão
- Verificar se ticket é o atual

**Limpeza não funciona**
- Verificar `OPEN_MODE_ENABLED=true`
- Verificar logs de erro

### Logs de Debug

```typescript
// Habilitar logs detalhados
console.log('🔍 Debug modo aberto:', {
  sessionId,
  participantName,
  action
})
```

---

## 📞 Suporte

Para dúvidas sobre o modo aberto:

1. **Documentação**: Este arquivo
2. **Issues**: GitHub do projeto
3. **Email**: support@pokerplanning.com

---

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2024
