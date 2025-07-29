# 🎯 Poker Planning Empresarial

> **Plataforma completa de estimativas ágeis para empresas de todos os tamanhos**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-blue)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-Latest-2D3748)](https://www.prisma.io/)

## 🌟 Visão Geral

Uma aplicação robusta de **Poker Planning** transformada em uma solução empresarial completa. Permite que times estimem tarefas de forma colaborativa com recursos avançados de gestão, persistência, relatórios e controle de acesso.

### ✨ Principais Diferenciais

- 🏢 **Multi-tenancy** - Isolamento completo por organização
- 🔐 **Autenticação Empresarial** - JWT, roles, integração externa
- 📊 **Relatórios Avançados** - Analytics e exportação
- 🎮 **Múltiplos Modos** - Fibonacci, T-shirt, Linear, Custom
- ⚡ **Real-time Otimizado** - WebSocket escalável
- 💰 **Paywall Ready** - Limitações por plano
- 🌍 **Internacionalização** - PT/EN (expansível)

## 🚀 Demo

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/poker-planning.git
cd poker-planning

# Instale dependências
npm install

# Configure ambiente (veja seção Setup)
cp .env.example .env.local

# Execute desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## ⚙️ Configuração

### Variáveis de Ambiente

A aplicação usa **configuração centralizada** através do arquivo `src/lib/config.ts`. Todas as variáveis de ambiente são validadas e tipadas.

**Variáveis obrigatórias:**
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/poker_planning
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
```

**Para ver todas as variáveis disponíveis:**
- 📋 [Documentação completa das variáveis](docs/ENV_VARIABLES.md)
- 🔧 [Configuração centralizada](src/lib/config.ts)

### Setup Rápido

1. **Configure o banco PostgreSQL**
2. **Copie `.env.example` para `.env`**
3. **Preencha as variáveis obrigatórias**
4. **Execute `npm run dev`**

## 🏗️ Arquitetura

### Stack Tecnológica

**Frontend:**
- **Next.js 15** (App Router) + **React 19**
- **TypeScript** para type safety
- **TailwindCSS** para design system
- **Framer Motion** para animações
- **react-i18next** para internacionalização

**Backend:**
- **Next.js API Routes** (RESTful)
- **Express** server customizado (WebSocket)
- **PostgreSQL** + **Prisma ORM**
- **JWT** authentication
- **Socket.io** para real-time

**Deploy & DevOps:**
- **Docker** para containerização
- **Vercel/Railway** para deploy
- **GitHub Actions** para CI/CD

### Estrutura do Projeto

```
poker-planning/
├── docs/                   # 📚 Documentação completa
├── src/
│   ├── app/               # 🌐 App Router (Next.js 15)
│   │   ├── api/          # 🔌 API Routes
│   │   ├── (auth)/       # 🔐 Páginas de autenticação
│   │   ├── dashboard/    # 📊 Dashboard empresarial
│   │   └── [sessionId]/  # 🎮 Páginas de sessão
│   ├── components/       # 🧩 Componentes React
│   ├── lib/             # 🛠️ Utilitários e configurações
│   └── i18n/           # 🌍 Sistema de tradução
├── prisma/              # 🗄️ Schema e migrations
├── public/              # 📁 Assets estáticos
└── server.js           # 🚀 Servidor Express
```

## 💾 Banco de Dados

### Principais Entidades

```typescript
Organization  // Multi-tenancy
├── User[]           // Usuários da organização
├── Session[]        // Sessões de planning
├── Project[]        // Projetos/times
└── Invite[]         // Convites pendentes

Session
├── Ticket[]         // Histórias para estimar
├── Participant[]    // Participantes ativos
└── Vote[]          // Votos dos participantes
```

### Features do Banco

- **Multi-tenancy**: Isolamento completo por organização
- **Soft Deletes**: Preserva histórico
- **Audit Trail**: Tracking de mudanças
- **Performance**: Índices otimizados
- **Backup**: Estratégia de recuperação

## 🔐 Autenticação & Autorização

### Níveis de Usuário

- **Admin**: Gestão completa da organização
- **Member**: Criar sessões, participar, relatórios básicos
- **Viewer**: Apenas visualizar e participar

### Features de Auth

- JWT com refresh tokens
- Multi-tenancy por organização
- Integração externa preparada (`externalId`)
- Rate limiting por endpoint
- Session persistence

## 🎮 Features Principais

### Sessões de Planning

- **Criação Rápida**: Interface intuitiva
- **Modos de Votação**: Fibonacci, T-shirt, Linear, Custom
- **Real-time**: Sincronização instantânea
- **Persistência**: Histórico completo
- **Configurável**: Timer, auto-reveal, observers

### Gestão de Tickets

- CRUD completo de histórias
- Priorização e categorização
- Estimativas com consenso
- Histórico de votações
- Comentários e confiança

### Relatórios & Analytics

- Dashboard executivo
- Métricas de consenso
- Tempo médio de votação
- Produtividade por time
- Exportação CSV/PDF

### Sistema de Convites

- Convite por email
- Roles granulares
- Expiração automática
- Onboarding guiado

## 🔧 Setup do Ambiente

### Pré-requisitos

- **Node.js 18+**
- **PostgreSQL 14+**
- **npm** ou **yarn**

### Configuração

1. **Clone e instale:**
```bash
git clone https://github.com/seu-usuario/poker-planning.git
cd poker-planning
npm install
```

2. **Configure o banco:**
```bash
# Inicie PostgreSQL
# Crie database: poker_planning_dev

# Configure .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/poker_planning_dev"
JWT_SECRET="seu-jwt-secret-seguro"
NEXTAUTH_SECRET="seu-nextauth-secret"
```

3. **Execute migrations:**
```bash
npx prisma migrate dev
npx prisma generate
```

4. **Popule dados de teste:**
```bash
npx prisma db seed
```

5. **Inicie desenvolvimento:**
```bash
npm run dev
```

### Comandos Úteis

```bash
# Desenvolvimento
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run start        # Servidor de produção
npm run lint         # Linting

# Banco de dados
npx prisma studio    # Interface visual
npx prisma migrate dev  # Nova migration
npx prisma generate  # Gera client

# Testes (quando implementados)
npm test            # Executa testes
npm run test:watch  # Testes em watch mode
```

## 📚 Documentação

Documentação completa disponível em [`docs/`](./docs/):

- **[Contexto do Projeto](./docs/CONTEXTO_PROJETO.md)** - Visão geral e objetivos
- **[Plano de Implementação](./docs/PLANO_IMPLEMENTACAO.md)** - Roadmap de 8 semanas
- **[Schema do Banco](./docs/SCHEMA_BANCO_DADOS.md)** - Estrutura completa do PostgreSQL
- **[API Endpoints](./docs/API_ENDPOINTS.md)** - Documentação da API REST
- **[Checklist](./docs/CHECKLIST_IMPLEMENTACAO.md)** - Lista de tarefas detalhada

## 🚀 Roadmap de Implementação

### 🏗️ Fase 1: Fundação (Semanas 1-2)
- ✅ Setup PostgreSQL + Prisma
- ✅ Sistema de autenticação JWT
- ✅ Multi-tenancy core
- ✅ Migração de rotas

### 💾 Fase 2: Core Features (Semanas 3-4)
- 🔄 Sessões persistentes
- 🔄 Gestão de tickets
- 🔄 Real-time otimizado
- 🔄 Dashboard básico

### 🏢 Fase 3: Empresarial (Semanas 5-6)
- ⏳ Múltiplos modos de votação
- ⏳ Sistema de convites
- ⏳ Relatórios e analytics
- ⏳ Gestão de times

### 🔧 Fase 4: Produção (Semanas 7-8)
- ⏳ Preparação para paywall
- ⏳ Otimizações de performance
- ⏳ Landing page
- ⏳ Testes e QA

## 💼 Planos de Negócio

### Free Plan
- 1 organização
- 5 usuários
- 10 sessões/mês
- Recursos básicos

### Pro Plan
- Usuários ilimitados
- 100 sessões/mês
- Relatórios avançados
- Integrações

### Enterprise
- Tudo ilimitado
- SSO/SAML
- Suporte prioritário
- API dedicada

## 🤝 Contribuição

### Como Contribuir

1. **Fork** o projeto
2. **Crie** uma branch (`git checkout -b feature/nova-feature`)
3. **Commit** suas mudanças (`git commit -m 'Add: nova feature'`)
4. **Push** para a branch (`git push origin feature/nova-feature`)
5. **Abra** um Pull Request

### Padrões de Código

- Use **TypeScript** estrito
- Siga as regras do **ESLint**
- Mantenha **i18n** em todos os textos
- Implemente **testes** para features críticas
- Documente **mudanças significativas**

### Estrutura de Commits

```
feat: adiciona nova funcionalidade
fix: corrige bug existente
docs: atualiza documentação
style: mudanças de formatação
refactor: refatora código sem mudança funcional
test: adiciona ou modifica testes
chore: mudanças em build/config
```

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- **Next.js** team pela excelente framework
- **Prisma** team pelo ORM incrível
- **Tailwind CSS** pela produtividade em styling
- **Socket.io** pelo real-time robusto

---

**Transformando estimativas ágeis em vantagem competitiva empresarial** 🚀

Para suporte: [issues](https://github.com/seu-usuario/poker-planning/issues) | [docs](./docs/) | [contato](mailto:contato@empresa.com)

