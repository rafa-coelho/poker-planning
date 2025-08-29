# Teste do Modo Aberto - Poker Planning

## Configuração para Teste

### 1. Habilitar o Modo Aberto

Adicione a variável de ambiente no arquivo `.env`:

```env
OPEN_MODE=true
```

### 2. Verificar Banco de Dados

Certifique-se de que as tabelas do modo aberto foram criadas:

```bash
# Verificar se a migração foi aplicada
npx prisma migrate status

# Se necessário, aplicar migrações pendentes
npx prisma migrate dev
```

### 3. Iniciar a Aplicação

```bash
# Terminal 1 - Servidor WebSocket
npm run dev:server

# Terminal 2 - Aplicação Next.js
npm run dev
```

## Fluxo de Teste

### 1. Acessar Landing Page do Modo Aberto

- URL: `http://localhost:3000/open`
- Deve mostrar a landing page específica do modo aberto
- Deve ter botão "Criar Sessão"

### 2. Criar Nova Sessão

1. Clicar em "Criar Sessão"
2. Preencher formulário:
   - Nome da sessão: "Teste Modo Aberto"
   - Descrição: "Sessão para testar funcionalidades"
   - Seu nome: "Testador"
   - Modo de votação: Fibonacci
3. Clicar em "Criar Sessão"
4. Deve redirecionar para `/open/[sessionId]`

### 3. Testar Board de Votação

1. Verificar se o board carrega corretamente
2. Verificar se o criador aparece como participante
3. Testar criação de tickets
4. Testar votação
5. Testar revelação de cartas

### 4. Testar Participação

1. Abrir nova aba/incógnito
2. Acessar URL: `/open/[sessionId]/join`
3. Preencher nome: "Participante 2"
4. Entrar na sessão
5. Verificar se aparece na mesa

### 5. Testar Funcionalidades

- ✅ Criação de tickets
- ✅ Votação em tempo real
- ✅ Revelação de cartas
- ✅ Nova votação
- ✅ Finalização de estimativas
- ✅ Link de convite

## Verificação de Funcionalidades

### ✅ Deve Funcionar

- [ ] Criação de sessões sem cadastro
- [ ] Participação com apenas nome
- [ ] Votação em tempo real
- [ ] Múltiplos modos de votação
- [ ] Gerenciamento de tickets
- [ ] Expiração automática (24h)
- [ ] WebSocket funcionando
- [ ] Persistência temporária no banco

### ❌ Não Deve Funcionar

- [ ] Autenticação de usuários
- [ ] Organizações e times
- [ ] Planos de acesso
- [ ] Histórico persistente
- [ ] Relatórios empresariais

## Teste de Redirecionamentos

### Modo Aberto Habilitado (`OPEN_MODE=true`)

- `/` → redireciona para `/open`
- `/dashboard` → redireciona para `/open`
- `/login` → redireciona para `/open`
- `/register` → redireciona para `/open`
- `/open` → funciona normalmente
- `/open/[sessionId]` → funciona normalmente

### Modo Empresarial (`OPEN_MODE=false`)

- `/open` → redireciona para `/`
- `/open/[sessionId]` → redireciona para `/`
- `/` → funciona normalmente
- `/dashboard` → funciona normalmente

## Verificação de Banco de Dados

### Tabelas Criadas

```sql
-- Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'open_%';

-- Verificar dados de sessão
SELECT * FROM open_sessions;

-- Verificar participantes
SELECT * FROM open_session_participants;

-- Verificar tickets
SELECT * FROM open_tickets;

-- Verificar votos
SELECT * FROM open_votes;
```

### Limpeza de Dados

```sql
-- Limpar dados de teste (cuidado!)
DELETE FROM open_votes;
DELETE FROM open_tickets;
DELETE FROM open_session_participants;
DELETE FROM open_sessions;
```

## Troubleshooting

### Erro: "Cannot read properties of undefined"

**Causa**: Tabelas do modo aberto não existem no banco

**Solução**:
```bash
npx prisma migrate dev --name add_open_mode_tables
npx prisma generate
```

### Erro: "Modo aberto não está habilitado"

**Causa**: Variável `OPEN_MODE` não está definida

**Solução**:
```env
OPEN_MODE=true
```

### Erro: WebSocket não conecta

**Causa**: Servidor WebSocket não está rodando

**Solução**:
```bash
npm run dev:server
```

### Erro: "Sessão não encontrada"

**Causa**: Sessão expirou ou foi deletada

**Solução**: Criar nova sessão

## Logs para Debug

### Verificar Logs do Servidor

```bash
# Logs da aplicação Next.js
npm run dev

# Logs do WebSocket
npm run dev:server
```

### Verificar Logs do Banco

```bash
# Acessar PostgreSQL
psql -h localhost -U postgres -d poker_planning

# Verificar logs
SELECT * FROM pg_stat_activity;
```

## Teste de Performance

### Métricas a Verificar

- Tempo de carregamento da landing page: < 2s
- Tempo de criação de sessão: < 1s
- Tempo de entrada na sessão: < 1s
- Latência do WebSocket: < 100ms
- Uso de memória: < 50MB

### Teste de Carga

```bash
# Teste com múltiplos participantes
# Abrir 5-10 abas e simular votação simultânea
```

## Checklist Final

- [ ] Modo aberto habilitado
- [ ] Tabelas criadas no banco
- [ ] Landing page funcionando
- [ ] Criação de sessão funcionando
- [ ] Board de votação funcionando
- [ ] Participação funcionando
- [ ] WebSocket funcionando
- [ ] Redirecionamentos corretos
- [ ] Expiração funcionando
- [ ] Performance adequada

## Próximos Passos

1. Testar em diferentes navegadores
2. Testar em dispositivos móveis
3. Testar com múltiplos participantes
4. Verificar responsividade
5. Testar casos de erro
6. Validar acessibilidade
