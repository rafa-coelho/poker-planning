# 🔐 Hierarquia de Roles e Permissões

## 📋 Visão Geral

O sistema de Poker Planning Empresarial implementa uma hierarquia de roles granular para controlar permissões e acesso a funcionalidades.

## 🎯 Roles Disponíveis

### 1. **SUPER_ADMIN** (Super Administrador)
- **Nível**: 4 (Máximo)
- **Descrição**: Controle total da organização
- **Permissões**:
  - ✅ Gestão completa de usuários
  - ✅ Gestão de times e projetos
  - ✅ Configurações da organização
  - ✅ Relatórios e analytics
  - ✅ Todas as funcionalidades

### 2. **ADMIN** (Administrador)
- **Nível**: 3
- **Descrição**: Gestão de usuários, times e projetos
- **Permissões**:
  - ✅ Gestão de usuários (exceto SUPER_ADMIN)
  - ✅ Gestão de times e projetos
  - ✅ Criação de sessões
  - ✅ Relatórios básicos
  - ❌ Configurações da organização

### 3. **MEMBER** (Membro)
- **Nível**: 2
- **Descrição**: Participação em sessões e projetos
- **Permissões**:
  - ✅ Participar em sessões
  - ✅ Votar em tickets
  - ✅ Criar sessões
  - ✅ Visualizar times/projetos
  - ❌ Gestão de usuários
  - ❌ Relatórios

### 4. **VIEWER** (Visualizador)
- **Nível**: 1 (Mínimo)
- **Descrição**: Apenas visualização
- **Permissões**:
  - ✅ Visualizar sessões
  - ✅ Visualizar times/projetos
  - ❌ Participar em sessões
  - ❌ Votar
  - ❌ Criar conteúdo

## 🔑 Permissões por Funcionalidade

### Gestão de Usuários
| Ação | SUPER_ADMIN | ADMIN | MEMBER | VIEWER |
|------|-------------|-------|--------|--------|
| `users:read` | ✅ | ✅ | ❌ | ❌ |
| `users:create` | ✅ | ✅ | ❌ | ❌ |
| `users:update` | ✅ | ✅ | ❌ | ❌ |
| `users:delete` | ✅ | ❌ | ❌ | ❌ |
| `users:change_role` | ✅ | ✅ | ❌ | ❌ |

### Gestão de Times
| Ação | SUPER_ADMIN | ADMIN | MEMBER | VIEWER |
|------|-------------|-------|--------|--------|
| `teams:read` | ✅ | ✅ | ✅ | ❌ |
| `teams:create` | ✅ | ✅ | ❌ | ❌ |
| `teams:update` | ✅ | ✅ | ❌ | ❌ |
| `teams:delete` | ✅ | ✅ | ❌ | ❌ |
| `teams:manage_members` | ✅ | ✅ | ❌ | ❌ |

### Sessões de Poker
| Ação | SUPER_ADMIN | ADMIN | MEMBER | VIEWER |
|------|-------------|-------|--------|--------|
| `sessions:read` | ✅ | ✅ | ✅ | ✅ |
| `sessions:create` | ✅ | ✅ | ✅ | ❌ |
| `sessions:update` | ✅ | ✅ | ✅ | ❌ |
| `sessions:delete` | ✅ | ✅ | ❌ | ❌ |
| `sessions:moderate` | ✅ | ✅ | ✅ | ❌ |

### Tickets/Estimativas
| Ação | SUPER_ADMIN | ADMIN | MEMBER | VIEWER |
|------|-------------|-------|--------|--------|
| `tickets:read` | ✅ | ✅ | ✅ | ✅ |
| `tickets:create` | ✅ | ✅ | ✅ | ❌ |
| `tickets:update` | ✅ | ✅ | ✅ | ❌ |
| `tickets:delete` | ✅ | ✅ | ❌ | ❌ |
| `tickets:vote` | ✅ | ✅ | ✅ | ❌ |

## 🛠️ Implementação Técnica

### Arquivos Principais
- `src/lib/auth/roles.ts` - Definição de roles e permissões
- `src/lib/middleware/authorization.ts` - Middleware de autorização
- `prisma/schema.prisma` - Modelo de dados

### Uso no Código

```typescript
// Verificar permissão
import { requirePermission } from '@/lib/middleware/authorization';

export async function GET(request: Request) {
  const authMiddleware = requirePermission('users:read');
  const authResult = await authMiddleware(request);
  
  if (authResult) return authResult; // Erro de autorização
  
  // Continua com a lógica...
}

// Verificar role específica
import { requireRole, UserRole } from '@/lib/middleware/authorization';

export async function POST(request: Request) {
  const authMiddleware = requireRole(UserRole.ADMIN);
  const authResult = await authMiddleware(request);
  
  if (authResult) return authResult;
  
  // Continua com a lógica...
}
```

## 🔄 Fluxo de Autorização

1. **Token JWT** é extraído do header `Authorization`
2. **Token é verificado** usando `verifyAccessToken()`
3. **Usuário é buscado** no banco para obter role atualizada
4. **Permissão é verificada** usando `hasPermission()`
5. **Usuário é adicionado** ao request para uso posterior

## 🎯 Regras de Negócio

### Hierarquia de Gerenciamento
- **SUPER_ADMIN** pode gerenciar todos os usuários
- **ADMIN** pode gerenciar MEMBER e VIEWER
- **MEMBER** e **VIEWER** não podem gerenciar ninguém

### Atribuição de Roles
- **SUPER_ADMIN** pode atribuir até ADMIN
- **ADMIN** pode atribuir até MEMBER
- **MEMBER** e **VIEWER** não podem atribuir roles

### Isolamento por Organização
- Todas as verificações incluem `organizationId`
- Usuários só podem acessar dados da própria organização
- Middleware de tenant garante isolamento

## 📝 Logs e Auditoria

Todas as ações administrativas são logadas:
- Mudança de roles
- Criação/exclusão de usuários
- Gestão de times e projetos
- Acesso a relatórios

## 🔒 Segurança

- **Tokens JWT** com expiração
- **Verificação de usuário ativo**
- **Isolamento por organização**
- **Rate limiting** por endpoint
- **Auditoria completa** de ações

---

**Nota**: Esta hierarquia é flexível e pode ser ajustada conforme as necessidades do negócio. 