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

### 1. Acesso via Link Único
```
https://app.pokerplanning.com/sessions/[sessionId]/join
```

### 2. Fluxo Principal
1. **Usuário acessa** `/sessions/[sessionId]/join`
2. **Sistema carrega** informações da sessão
3. **Sistema verifica** se usuário está logado

### 3. Fluxo para Usuário LOGADO
- ✅ **Verifica se usuário está no time da sessão**
  - Se SIM → **Acesso direto** à sessão
  - Se NÃO → **Retorna "not_found"** (sessão não existe)

### 4. Fluxo para Usuário NÃO LOGADO
- ✅ **Mostra campo "Seu nome"** e botão "Pedir permissão"
- ✅ **Ao solicitar permissão**:
  - Envia evento via WebSocket para o dono da sessão
  - Mostra badge de notificação para o dono
- ✅ **Dono da sessão**:
  - Vê badge indicando solicitações pendentes
  - Clica na badge → vê lista de solicitantes
  - Pode **aprovar** ou **reprovar** cada um
- ✅ **Se APROVADO**:
  - Usuário é **redirecionado imediatamente** para a sessão
- ✅ **Se REPROVADO**:
  - Usuário vê mensagem "Sua solicitação foi reprovada"

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
  publicAccessCode  String? @unique // código único para acesso público
  publicParticipants PublicParticipant[]
}
```

### Endpoints da API

#### 1. Verificar Acesso à Sessão (Join)
```typescript
GET /api/sessions/[id]/join
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_123",
    "name": "Sprint Planning",
    "status": "ACTIVE",
    "currentUser": {
      "isLoggedIn": true,
      "hasAccess": true,
      "userId": "user_123",
      "userName": "João Silva"
    }
  }
}
```

**Se usuário não logado:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_123",
    "name": "Sprint Planning",
    "status": "ACTIVE",
    "currentUser": {
      "isLoggedIn": false,
      "hasAccess": false
    }
  }
}
```

#### 2. Solicitar Acesso como Convidado
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

### 1. Página de Join Unificada
```
/sessions/[id]/join
```

**Lógica da Página:**
1. **Se usuário ESTÁ LOGADO**:
   - ✅ Verificar se tem permissão para a sessão
   - ✅ Se SIM → Redirecionar direto para `/sessions/[id]`
   - ✅ Se NÃO → Mostrar erro de permissão

2. **Se usuário NÃO ESTÁ LOGADO**:
   - ✅ Mostrar página com duas opções:
     - **"Entrar com Conta"** → Redirecionar para `/login`
     - **"Participar como Convidado"** → Abrir modal de solicitação

**Componentes:**
- Header com informações da sessão
- Opções de entrada (Login / Entrada sem conta)
- Modal de solicitação de acesso
- Status de aprovação
- Loading states e mensagens de erro

### 2. Modal de Solicitação de Acesso
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
2. Implementar endpoint `/api/sessions/[id]/join`
3. Criar middleware de verificação
4. Implementar sistema de aprovação

### Fase 2: Frontend (Dias 43-44)
1. **Modificar página `/sessions/[id]/join`** para seguir lógica unificada
2. Implementar redirecionamento automático para usuários logados
3. Criar interface de opções para usuários não logados
4. Implementar modal de solicitação de acesso
5. Criar interface de aprovação
6. Integrar com WebSocket

### Fase 3: Segurança (Dias 45-46)
1. Implementar validações
2. Configurar rate limiting
3. Criar logs de segurança
4. Testar cenários de segurança

## 📱 Experiência do Usuário

### Para Quem Compartilha o Link
1. **Link Único**: Um só link para todos os tipos de usuários
2. **Sem Diferenciação**: Não há "público" vs "logado" no sistema
3. **Informações Claras**: Explicação de como funciona o acesso
4. **Simplicidade**: Botão "Convidar" unificado

### Para Quem Recebe o Link
1. **Acesso Unificado**: Mesmo link funciona para todos
2. **Fluxo Intuitivo**: 
   - Se logado → Acesso direto
   - Se não logado → Escolher entre login ou convidado
3. **Processo Transparente**: Instruções claras sobre aprovação
4. **Interface Familiar**: Mesma experiência da sessão normal

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
1. **Usuário Logado com Permissão**: Acesso direto à sessão
2. **Usuário Logado sem Permissão**: Mostrar erro de permissão
3. **Usuário Não Logado**: Mostrar opções (login/convidado)
4. **Entrada como Convidado**: Usuário não logado solicita acesso
5. **Aprovação**: Dono aprova participante externo
6. **Rejeição**: Dono rejeita participante externo
7. **Timeout**: Participante não aprovado expira
8. **Segurança**: Tentativas de acesso não autorizado

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

## ⚠️ Correção Necessária

### Problema Atual
A página `/sessions/[id]/join` está redirecionando automaticamente para o login em vez de seguir o fluxo unificado.

### Solução
Modificar a página `/sessions/[id]/join` para:

1. **Verificar se usuário está logado**
2. **Se logado**: Verificar permissão e redirecionar para sessão
3. **Se não logado**: Mostrar opções (login/convidado)

### Código da Correção
```typescript
// src/app/[sessionId]/join/page.tsx
export default function JoinSessionPage() {
  const { isAuthenticated, user } = useAuth();
  const { sessionId } = useParams();
  
  useEffect(() => {
    if (isAuthenticated) {
      // Verificar se tem permissão para a sessão
      checkSessionPermission(sessionId).then(hasPermission => {
        if (hasPermission) {
          router.push(`/${sessionId}`); // Acesso direto
        } else {
          setError('Você não tem permissão para esta sessão');
        }
      });
    }
    // Se não logado, mostrar opções na página
  }, [isAuthenticated, sessionId]);
  
  // ... resto da implementação
}
```

---

**Status**: Planejado para implementação na Fase 3.5
**Prioridade**: Alta - Feature essencial para adoção
**Complexidade**: Média - Requer mudanças em múltiplas camadas
