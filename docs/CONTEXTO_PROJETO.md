# 📋 Contexto do Projeto - Poker Planning Empresarial

## 🎯 Visão Geral

Este projeto está sendo transformado de uma aplicação simples de **Poker Planning** em uma **solução empresarial robusta** para estimativas de software. O objetivo é criar uma plataforma que atenda às necessidades de empresas de todos os tamanhos, com recursos avançados de gestão, persistência e integração.

## 🏗️ Estado Atual da Aplicação

### Funcionalidades Existentes
- ✅ Criação de sessões temporárias
- ✅ Sistema de votação em tempo real
- ✅ Interface responsiva com TailwindCSS
- ✅ Internacionalização (PT/EN)
- ✅ WebSocket com Socket.io
- ✅ Sistema de cartas Fibonacci

### Limitações Atuais
- ❌ Dados apenas em memória (não persiste)
- ❌ Sem autenticação/autorização
- ❌ Sem gestão de usuários ou times
- ❌ Apenas modo Fibonacci
- ❌ Sem histórico de sessões
- ❌ Sem controle de acesso

## 🎯 Objetivos da Transformação Empresarial

### 1. **Persistência & Banco de Dados**
- Migrar para PostgreSQL com Prisma ORM
- Persistir sessões, usuários, organizações
- Histórico completo de votações
- Backup e recuperação de dados

### 2. **Autenticação & Autorização**
- Sistema JWT robusto
- Multi-tenancy por organização
- Níveis de usuário (Admin, Member, Viewer)
- Preparação para AuthService externo (externalId)

### 3. **Gestão Empresarial**
- Dashboard administrativo
- Gestão de times e projetos
- Convites e onboarding
- Relatórios e analytics

### 4. **Features Avançadas**
- Múltiplos modos de votação
- Gestão de tickets/histórias
- Estimativas por projeto
- Exportação de relatórios

### 5. **Preparação para Paywall**
- Sistema de planos/limitações
- Feature flags no JWT
- Controle de acesso granular
- Métricas de uso

## 🏢 Arquitetura Empresarial

### Modelos de Dados Principais

```typescript
// Organização (Multi-tenancy)
Organization {
  id: string
  name: string
  plan: 'free' | 'pro' | 'enterprise'
  settings: json
  users: User[]
  sessions: Session[]
}

// Usuários
User {
  id: string
  email: string
  name: string
  organizationId: string
  role: 'admin' | 'member' | 'viewer'
  externalId?: string // Para integração futura
}

// Sessões Persistentes
Session {
  id: string
  name: string
  organizationId: string
  createdById: string
  project?: string
  tickets: Ticket[]
  participants: Participant[]
  settings: SessionSettings
}

// Tickets/Histórias
Ticket {
  id: string
  title: string
  description?: string
  sessionId: string
  finalEstimate?: string
  votes: Vote[]
  status: 'pending' | 'voted' | 'completed'
}
```

### Hierarquia de Permissões

```
Organization (Tenant)
├── Admin
│   ├── Gerenciar usuários
│   ├── Configurar organização
│   ├── Ver todos os projetos
│   └── Acesso a analytics
├── Member
│   ├── Criar sessões
│   ├── Participar de votações
│   ├── Ver projetos do time
│   └── Exportar relatórios básicos
└── Viewer
    ├── Apenas visualizar sessões
    ├── Participar de votações
    └── Relatórios limitados
```

## 🛠️ Stack Tecnológica

### Frontend
- **Next.js 15**: App Router, Server Components
- **React 19**: Hooks, Context API
- **TypeScript**: Tipagem estrita
- **TailwindCSS**: Design system
- **Framer Motion**: Animações

### Backend
- **Next.js API Routes**: RESTful endpoints
- **Express Server**: WebSocket + customizações
- **PostgreSQL**: Banco de dados principal
- **Prisma ORM**: Type-safe database access
- **Redis** (futuro): Cache e sessões

### Real-time
- **Socket.io**: WebSocket atual
- **Migração futura**: Ably, Pusher ou similar

### DevOps & Deploy
- **Docker**: Containerização
- **Vercel/Railway**: Deploy da aplicação
- **GitHub Actions**: CI/CD
- **Sentry**: Monitoramento de erros

## 🔐 Segurança & Compliance

### Autenticação
- JWT com refresh tokens
- Password hashing (bcrypt)
- Rate limiting por endpoint
- CORS configurado adequadamente

### Dados Sensíveis
- Criptografia de dados em repouso
- Logs de auditoria
- Backup automático
- LGPD/GDPR compliance

## 📊 Métricas & Analytics

### KPIs Empresariais
- Sessões por organização
- Tempo médio de votação
- Consenso nas estimativas
- Adoção por usuário
- Retenção de clientes

### Dashboards
- Admin: Visão geral da organização
- Manager: Performance do time
- Member: Histórico pessoal

## 🚀 Roadmap de Implementação

### Fase 1: Fundação (Semanas 1-2)
- Setup do banco PostgreSQL + Prisma
- Sistema de autenticação básico
- Multi-tenancy core

### Fase 2: Features Core (Semanas 3-4)
- Persistência de sessões
- Gestão de tickets
- Dashboard básico

### Fase 3: Empresarial (Semanas 5-6)
- Múltiplos modos de votação
- Relatórios e analytics
- Sistema de convites

### Fase 4: Avançado (Semanas 7-8)
- Preparação para paywall
- Otimizações de performance
- Testes e polish

## 💼 Considerações de Negócio

### Planos de Assinatura (Futuro)
- **Free**: 1 organização, 5 usuários, 10 sessões/mês
- **Pro**: Usuários ilimitados, 100 sessões/mês, relatórios
- **Enterprise**: Tudo ilimitado, integração SSO, suporte prioritário

### Integração Externa
- **AuthService**: Preparação para SSO empresarial
- **Project Management**: Jira, Azure DevOps, GitHub
- **Analytics**: Google Analytics, Mixpanel
- **Export**: CSV, PDF, Excel

## 📋 Critérios de Sucesso

1. **Performance**: <2s carregamento inicial, <100ms votação
2. **Disponibilidade**: 99.9% uptime
3. **Escalabilidade**: Suportar 1000+ usuários simultâneos
4. **UX**: Interface intuitiva, zero treinamento necessário
5. **Segurança**: Zero vulnerabilidades críticas

---

**Próximos Passos**: Consultar `docs/PLANO_IMPLEMENTACAO.md` para roadmap detalhado. 