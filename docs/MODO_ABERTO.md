# Modo Aberto - Poker Planning

## Visão Geral

O **Modo Aberto** é uma versão simplificada do Poker Planning que permite criar e participar de sessões de estimativa sem necessidade de autenticação ou persistência. Ideal para reuniões rápidas, workshops e testes.

## Características

### ✅ Funcionalidades Disponíveis
- ✅ Criação de sessões sem cadastro
- ✅ Participação imediata com apenas nome
- ✅ Votação em tempo real
- ✅ Múltiplos modos de votação (Fibonacci, T-shirt, Linear)
- ✅ Gerenciamento de tickets
- ✅ Link de convite para participantes
- ✅ Expiração automática (24 horas)

### ❌ Funcionalidades Não Disponíveis
- ❌ Persistência de dados
- ❌ Histórico de sessões
- ❌ Relatórios e analytics
- ❌ Organizações e times
- ❌ Planos de acesso
- ❌ Autenticação de usuários

## Configuração

### Variável de Ambiente

Para habilitar o modo aberto, adicione a seguinte variável de ambiente:

```env
OPEN_MODE=true
```

### Comportamento

- **Com `OPEN_MODE=true`**: A aplicação funciona no modo aberto
- **Com `OPEN_MODE=false` ou não definida**: A aplicação funciona no modo empresarial normal

## Fluxo de Uso

### 1. Landing Page
- URL: `/open`
- Explica o que é o modo aberto
- Botão para criar nova sessão

### 2. Criação de Sessão
- Formulário simples com:
  - Nome da sessão
  - Descrição (opcional)
  - Nome do criador
  - Modo de votação
- Após criar, redireciona para o board

### 3. Board de Votação
- URL: `/open/[sessionId]`
- Interface idêntica ao modo empresarial
- Funcionalidades de votação completas
- Gerenciamento de tickets

### 4. Participação
- URL: `/open/[sessionId]/join`
- Formulário para entrar com nome
- Verificação de sessão existente
- Redirecionamento para o board

### 5. Expiração
- URL: `/open/[sessionId]/expired`
- Mostra quando a sessão expirou
- Opções para criar nova sessão ou ir para versão empresarial

## Estrutura de Arquivos

```
src/
├── app/
│   ├── open/                    # Rotas do modo aberto
│   │   ├── page.tsx            # Landing page
│   │   └── [sessionId]/
│   │       ├── page.tsx        # Board de votação
│   │       ├── join/
│   │       │   └── page.tsx    # Página de entrada
│   │       └── expired/
│   │           └── page.tsx    # Sessão expirada
│   └── api/
│       └── open/               # APIs do modo aberto
│           └── sessions/
│               ├── route.ts    # CRUD de sessões
│               └── [sessionId]/
│                   └── join/
│                       └── route.ts  # Entrada de participantes
├── components/
│   └── useOpenSession.ts       # Hook para sessões abertas
├── lib/
│   ├── hooks/
│   │   └── useOpenMode.tsx     # Hook principal do modo aberto
│   └── config.ts               # Configuração OPEN_MODE
└── middleware.ts               # Redirecionamentos
```

## Banco de Dados

O modo aberto usa tabelas específicas que já existem no schema:

- `open_sessions` - Sessões temporárias
- `open_session_participants` - Participantes
- `open_tickets` - Tickets das sessões
- `open_votes` - Votos dos participantes

## WebSocket

O modo aberto usa o mesmo servidor WebSocket, mas com identificação específica:

```javascript
const socket = io(HOST, {
  query: {
    sessionId,
    mode: 'open'  // Identifica que é modo aberto
  }
});
```

## Segurança

### Limitações
- Sem autenticação de usuários
- Sem isolamento por organização
- Dados podem ser perdidos após expiração
- Rate limiting básico

### Proteções
- Validação de entrada
- Verificação de expiração
- Rate limiting nas APIs
- Sanitização de dados

## Migração

### Para Modo Empresarial
Para migrar do modo aberto para o empresarial:

1. Configure `OPEN_MODE=false`
2. Use a landing page principal
3. Crie conta e organização
4. Use todas as funcionalidades empresariais

### Dados
- Dados do modo aberto não são migrados
- Sessões expiradas são automaticamente removidas
- Recomenda-se exportar dados importantes antes da expiração

## Troubleshooting

### Problemas Comuns

1. **Sessão não encontrada**
   - Verificar se a sessão não expirou
   - Verificar se o ID está correto

2. **Erro ao criar sessão**
   - Verificar se `OPEN_MODE=true`
   - Verificar conexão com banco de dados

3. **WebSocket não conecta**
   - Verificar se o servidor WebSocket está rodando
   - Verificar configuração de CORS

4. **Redirecionamentos incorretos**
   - Verificar middleware.ts
   - Verificar configuração de rotas

### Logs

Para debug, verifique os logs do servidor:

```bash
# Logs da aplicação
npm run dev

# Logs do WebSocket
node server.js
```

## Desenvolvimento

### Testando o Modo Aberto

1. Configure a variável de ambiente:
```bash
export OPEN_MODE=true
```

2. Inicie a aplicação:
```bash
npm run dev
```

3. Acesse `/open` para testar

### Testando o Modo Empresarial

1. Configure a variável de ambiente:
```bash
export OPEN_MODE=false
# ou remova a variável
```

2. Inicie a aplicação:
```bash
npm run dev
```

3. Acesse `/` para testar

## Considerações de Produção

### Performance
- Sessões expiradas são removidas automaticamente
- Dados temporários não afetam performance
- WebSocket otimizado para modo aberto

### Escalabilidade
- Cada sessão é independente
- Sem dependências entre sessões
- Fácil de escalar horizontalmente

### Monitoramento
- Logs de criação de sessões
- Logs de participação
- Métricas de uso

## Roadmap

### Melhorias Futuras
- [ ] Exportação de dados antes da expiração
- [ ] Tempo de expiração configurável
- [ ] Limite de participantes por sessão
- [ ] Modo de observador
- [ ] Integração com ferramentas externas
