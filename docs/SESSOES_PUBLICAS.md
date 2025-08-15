# 🌐 Sessões Públicas - Poker Planning Empresarial

## 📋 Visão Geral

O sistema de **Sessões Públicas** permite que qualquer pessoa acesse uma sessão de Poker Planning através de um link público, mesmo sem ter uma conta no sistema. Esta funcionalidade é essencial para facilitar a participação de stakeholders externos, clientes ou consultores em sessões de estimativa.

## 🎯 Objetivos

1. **Acessibilidade**: Qualquer pessoa pode participar de uma sessão via link
2. **Flexibilidade**: Opção de login ou entrada sem conta
3. **Segurança**: Controle de acesso e aprovação de participantes
4. **Isolamento**: Manter isolamento de dados entre organizações
5. **Experiência**: Interface intuitiva para participantes externos

## 🔄 Fluxo de Acesso Público

### 1. Acesso via Link
```
https://app.pokerplanning.com/sessions/[sessionId]/public
```

### 2. Verificação de Status
- [ ] Sessão existe e está ativa
- [ ] Sessão permite acesso público
- [ ] Usuário tem permissão (se logado)

### 3. Opções de Entrada
- **Logado**: Acesso direto se tiver permissão
- **Não logado**: Opção de login ou entrada sem conta

### 4. Entrada sem Conta
- [ ] Fornecer nome do participante
- [ ] Aguardar aprovação do dono da sessão
- [ ] Acesso após aprovação

## 🏗️ Arquitetura Técnica

### Modelo de Dados

```prisma
model PublicParticipant {
  id            String   @id @default(cuid())
  sessionId     String
  name          String
  ipAddress     String?
  userAgent     String?
  status        String   @default("PENDING") // PENDING, APPROVED, REJECTED, EXPIRED
  approvedBy    String?  // userId do aprovador
  approvedAt    DateTime?
  expiresAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  session       Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  approver      User?    @relation(fields: [approvedBy], references: [id])

  @@unique([sessionId, name])
  @@index([sessionId, status])
  @@index([expiresAt])
}

// Adicionar ao model Session
model Session {
  // ... campos existentes ...
  allowPublicAccess Boolean @default(false)
  publicAccessCode  String? @unique // código único para acesso público
  publicParticipants PublicParticipant[]
}
```

### Endpoints da API

#### 1. Verificar Acesso Público
```typescript
GET /api/sessions/[id]/public-access
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_123",
    "name": "Sprint Planning",
    "status": "ACTIVE",
    "allowPublicAccess": true,
    "requiresApproval": true,
    "currentUser": {
      "isLoggedIn": false,
      "hasAccess": false
    }
  }
}
```

#### 2. Solicitar Acesso Público
```typescript
POST /api/sessions/[id]/public-access
```

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@empresa.com" // opcional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "participantId": "participant_123",
    "status": "PENDING",
    "message": "Aguardando aprovação do dono da sessão"
  }
}
```

#### 3. Aprovar/Rejeitar Participante
```typescript
PUT /api/sessions/[id]/public-participants/[participantId]
```

**Body:**
```json
{
  "action": "APPROVE" // ou "REJECT"
}
```

#### 4. Listar Participantes Públicos
```typescript
GET /api/sessions/[id]/public-participants
```

## 🎨 Interface do Usuário

### 1. Página de Acesso Público
```
/sessions/[id]/public
```

**Componentes:**
- Header com informações da sessão
- Opções de entrada (Login / Entrada sem conta)
- Formulário de nome do participante
- Status de aprovação
- Loading states e mensagens de erro

### 2. Modal de Entrada sem Conta
- Campo de nome (obrigatório)
- Campo de email (opcional)
- Botão de solicitar acesso
- Mensagem de status

### 3. Interface de Aprovação (para dono da sessão)
- Lista de participantes pendentes
- Botões de aprovar/rejeitar
- Informações do participante (nome, IP, data)
- Notificações em tempo real

## 🔒 Segurança e Validações

### 1. Validações de Entrada
- [ ] Nome obrigatório (2-50 caracteres)
- [ ] Nome único na sessão
- [ ] Validação de caracteres especiais
- [ ] Blacklist de nomes inapropriados

### 2. Rate Limiting
- [ ] Máximo 5 tentativas por IP por hora
- [ ] Máximo 10 participantes por sessão
- [ ] Timeout de 30 minutos para aprovação

### 3. Isolamento de Dados
- [ ] Verificar organização da sessão
- [ ] Isolar participantes por sessão
- [ ] Não expor dados de outras organizações

### 4. Logs de Segurança
- [ ] Log de todas as tentativas de acesso
- [ ] Log de aprovações/rejeições
- [ ] Alertas para atividades suspeitas

## 🚀 Implementação

### Fase 1: Backend (Dias 40-42)
1. Criar model `PublicParticipant`
2. Implementar endpoints da API
3. Criar middleware de verificação
4. Implementar sistema de aprovação

### Fase 2: Frontend (Dias 43-44)
1. Criar página de acesso público
2. Implementar modal de entrada
3. Criar interface de aprovação
4. Integrar com WebSocket

### Fase 3: Segurança (Dias 45-46)
1. Implementar validações
2. Configurar rate limiting
3. Criar logs de segurança
4. Testar cenários de segurança

## 📱 Experiência do Usuário

### Para Participantes Externos
1. **Acesso Simples**: Link direto para a sessão
2. **Processo Claro**: Instruções claras sobre o processo
3. **Feedback Imediato**: Status de aprovação em tempo real
4. **Interface Familiar**: Mesma interface da sessão normal

### Para Donos da Sessão
1. **Controle Total**: Aprovar/rejeitar participantes
2. **Notificações**: Alertas de novos participantes
3. **Gestão Fácil**: Interface para gerenciar participantes
4. **Segurança**: Logs e controles de acesso

## 🔄 Integração com Sistema Existente

### WebSocket Events
```typescript
// Novos eventos para participantes públicos
'public-participant-requested'
'public-participant-approved'
'public-participant-rejected'
'public-participant-joined'
'public-participant-left'
```

### Permissões
- **DONO**: Aprovar/rejeitar participantes, expulsar
- **ADMIN**: Aprovar/rejeitar participantes
- **MEMBER**: Visualizar participantes públicos
- **VIEWER**: Visualizar participantes públicos

## 📊 Métricas e Monitoramento

### Métricas a Coletar
- [ ] Número de acessos públicos por sessão
- [ ] Taxa de aprovação de participantes
- [ ] Tempo médio de aprovação
- [ ] Participantes ativos por sessão

### Alertas
- [ ] Muitas tentativas de acesso de um IP
- [ ] Participantes não aprovados por muito tempo
- [ ] Sessões com muitos participantes externos

## 🧪 Testes

### Cenários de Teste
1. **Acesso Normal**: Usuário logado acessa sessão pública
2. **Entrada sem Conta**: Usuário não logado solicita acesso
3. **Aprovação**: Dono aprova participante externo
4. **Rejeição**: Dono rejeita participante externo
5. **Timeout**: Participante não aprovado expira
6. **Segurança**: Tentativas de acesso não autorizado

### Testes de Performance
- [ ] Carga de múltiplos participantes externos
- [ ] Performance com muitos participantes
- [ ] Latência de notificações em tempo real

## 📚 Documentação

### Para Desenvolvedores
- [ ] Guia de implementação técnica
- [ ] Documentação da API
- [ ] Exemplos de uso

### Para Usuários
- [ ] Guia de como compartilhar sessões públicas
- [ ] Instruções para participantes externos
- [ ] FAQ sobre sessões públicas

---

**Status**: Planejado para implementação na Fase 3.5
**Prioridade**: Alta - Feature essencial para adoção
**Complexidade**: Média - Requer mudanças em múltiplas camadas
