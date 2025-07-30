# 📡 Documentação de Eventos WebSocket - Poker Planning

## 🔧 Configurações do Servidor

### Endpoints de Monitoramento
- **Health Check**: `GET /health` - Status básico do servidor
- **Status Detalhado**: `GET /status` - Métricas completas do WebSocket

### Configurações de Performance
```javascript
{
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,        // 60 segundos
  pingInterval: 25000,       // 25 segundos
  maxHttpBufferSize: 1e6,    // 1MB
}
```

### Rate Limiting
- **Limite**: 60 eventos por minuto por socket
- **Janela**: 1 minuto
- **Cleanup**: A cada 5 minutos

## 📡 Eventos do Cliente → Servidor

### 🔗 Conexão e Autenticação

#### `join_room`
Entrar em uma sala de sessão.
```javascript
{
  sessionId: string,
  userId: string,
  userName: string,
  sessionName: string,
  organizationId: string | null
}
```

#### `heartbeat`
Manter conexão ativa (enviado a cada 30 segundos).
```javascript
// Sem payload
```

### 🎯 Votação

#### `select_card`
Selecionar uma carta para votação.
```javascript
{
  sessionId: string,
  userId: string,
  cardValue: string,
  organizationId: string | null
}
```

#### `flip_cards`
Iniciar processo de revelação das cartas.
```javascript
{
  sessionId: string,
  organizationId: string | null
}
```

#### `new_voting`
Iniciar nova rodada de votação.
```javascript
{
  sessionId: string,
  organizationId: string | null
}
```

#### `set_revealed`
Definir estado de revelação manualmente.
```javascript
{
  sessionId: string,
  isRevealed: boolean,
  organizationId: string | null
}
```

### 🎫 Gestão de Tickets

#### `ticket_selected`
Selecionar um ticket para votação.
```javascript
{
  sessionId: string,
  ticketId: string | null,
  organizationId: string | null
}
```

#### `ticket_created`
Criar novo ticket.
```javascript
{
  sessionId: string,
  ticket: Ticket,
  organizationId: string | null
}
```

#### `ticket_updated`
Atualizar ticket existente.
```javascript
{
  sessionId: string,
  ticket: Ticket,
  organizationId: string | null
}
```

#### `ticket_deleted`
Deletar ticket.
```javascript
{
  sessionId: string,
  ticketId: string,
  organizationId: string | null
}
```

#### `final_estimate_set`
Definir estimativa final do ticket.
```javascript
{
  sessionId: string,
  ticketId: string,
  finalEstimate: string,
  organizationId: string | null
}
```

### 👥 Gestão de Participantes

#### `remove_participant`
Remover participante manualmente.
```javascript
{
  sessionId: string,
  userId: string,
  organizationId: string | null
}
```

## 📡 Eventos do Servidor → Cliente

### 🔗 Conexão

#### `heartbeat_ack`
Confirmação de heartbeat.
```javascript
// Sem payload
```

#### `error`
Erro do servidor.
```javascript
{
  message: string
}
```

### 📊 Atualizações de Sessão

#### `session_update`
Atualização completa do estado da sessão.
```javascript
{
  sessionId: string,
  sessionName: string,
  participants: Participant[],
  isRevealed: boolean,
  currentTicketId: string | null,
  votingMode: string,
  organizationId: string | null,
  lastActivity: number
}
```

#### `flip_cards`
Iniciar contagem regressiva para revelação.
```javascript
// Sem payload
```

### 👥 Gestão de Participantes

#### `participant_left`
Notificar que um participante saiu.
```javascript
{
  userId: string,
  userName: string
}
```

### 🎫 Eventos de Tickets

#### `ticket_created`
Novo ticket criado.
```javascript
{
  ticket: Ticket
}
```

#### `ticket_updated`
Ticket atualizado.
```javascript
{
  ticket: Ticket
}
```

#### `ticket_selected`
Ticket selecionado para votação.
```javascript
{
  ticketId: string | null
}
```

#### `ticket_deleted`
Ticket deletado.
```javascript
{
  ticketId: string
}
```

#### `final_estimate_set`
Estimativa final definida.
```javascript
{
  ticketId: string,
  finalEstimate: string
}
```

## 🔒 Segurança e Validação

### Isolamento por Organização
- Todos os eventos incluem `organizationId`
- Validação automática de acesso por organização
- Sessões isoladas por organização

### Rate Limiting
- Limite de 60 eventos por minuto por socket
- Rejeição automática de eventos excessivos
- Cleanup automático de registros expirados

### Logging
Todos os eventos são logados com timestamp:
```javascript
[2024-01-15T10:30:45.123Z] SELECT_CARD - Socket: abc123 { sessionId: "sess-123", userId: "user-456", cardValue: "8" }
```

## 🧹 Cleanup Automático

### Sessões Inativas
- Sessões sem participantes há mais de 1 hora são removidas
- Verificação a cada 5 minutos

### Rate Limiting
- Registros expirados são removidos automaticamente
- Cleanup a cada 5 minutos

### Conexões
- Heartbeat a cada 30 segundos
- Conexões inativas são detectadas e limpas

## 📈 Monitoramento

### Endpoint `/health`
```javascript
{
  status: 'ok',
  port: 3001,
  sessions: 5,
  connections: 12,
  rateLimitEntries: 8,
  heartbeatEntries: 12
}
```

### Endpoint `/status`
```javascript
{
  server: {
    port: 3001,
    uptime: 3600,
    memory: { rss: 123456, heapUsed: 98765, heapTotal: 123456 }
  },
  websocket: {
    totalConnections: 12,
    activeConnections: 10,
    sessions: 5,
    rateLimitEntries: 8
  },
  sessions: [
    {
      id: "sess-123",
      name: "Sprint Planning",
      participants: 3,
      organizationId: "org-456",
      lastActivity: 1642234567890
    }
  ]
}
```

## 🚀 Melhorias Implementadas

### Performance
- ✅ Otimização de configurações Socket.io
- ✅ Heartbeat para manter conexões ativas
- ✅ Cleanup automático de recursos

### Segurança
- ✅ Rate limiting por usuário
- ✅ Isolamento por organização
- ✅ Validação de acesso

### Monitoramento
- ✅ Logging detalhado de eventos
- ✅ Endpoints de health check
- ✅ Métricas de performance

### Robustez
- ✅ Retry logic para disconnections
- ✅ Cleanup automático de sessões
- ✅ Tratamento de erros

---

**Versão**: 1.0  
**Data**: Janeiro 2024  
**Fase**: 2.3 - Melhoria do Real-time 