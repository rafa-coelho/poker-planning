import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seeds multi-tenant...')

  // Limpar dados existentes
  await prisma.ticket.deleteMany()
  await prisma.sessionParticipant.deleteMany()
  await prisma.session.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.invite.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  console.log('🧹 Dados limpos')

  // Criar Organização 1 - TechCorp (FREE)
  const techCorp = await prisma.organization.create({
    data: {
      name: 'TechCorp Solutions',
      slug: 'techcorp',
      plan: 'FREE',
      isActive: true,
      settings: {
        timezone: 'America/Sao_Paulo',
        locale: 'pt-BR',
        theme: 'light'
      }
    }
  })

  // Criar Organização 2 - StartupXYZ (PRO)
  const startupXyz = await prisma.organization.create({
    data: {
      name: 'StartupXYZ',
      slug: 'startupxyz',
      plan: 'PRO',
      isActive: true,
      settings: {
        timezone: 'America/Sao_Paulo',
        locale: 'pt-BR',
        theme: 'dark'
      }
    }
  })

  // Criar Organização 3 - EnterpriseInc (ENTERPRISE)
  const enterpriseInc = await prisma.organization.create({
    data: {
      name: 'Enterprise Inc',
      slug: 'enterprise-inc',
      plan: 'ENTERPRISE',
      isActive: true,
      settings: {
        timezone: 'UTC',
        locale: 'en-US',
        theme: 'auto'
      }
    }
  })

  console.log('🏢 Organizações criadas')

  // Criar usuários para TechCorp
  const techCorpAdmin = await prisma.user.create({
    data: {
      name: 'João Silva',
      email: 'joao@techcorp.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      organizationId: techCorp.id,
      isActive: true,
      lastLoginAt: new Date()
    }
  })

  const techCorpScrum = await prisma.user.create({
    data: {
      name: 'Maria Santos',
      email: 'maria@techcorp.com',
      passwordHash: await bcrypt.hash('scrum123', 10),
      role: 'MEMBER',
      organizationId: techCorp.id,
      isActive: true,
      lastLoginAt: new Date()
    }
  })

  const techCorpDev1 = await prisma.user.create({
    data: {
      name: 'Pedro Costa',
      email: 'pedro@techcorp.com',
      passwordHash: await bcrypt.hash('dev123', 10),
      role: 'MEMBER',
      organizationId: techCorp.id,
      isActive: true,
      lastLoginAt: new Date()
    }
  })

  const techCorpDev2 = await prisma.user.create({
    data: {
      name: 'Ana Oliveira',
      email: 'ana@techcorp.com',
      passwordHash: await bcrypt.hash('dev123', 10),
      role: 'VIEWER',
      organizationId: techCorp.id,
      isActive: true,
      lastLoginAt: new Date()
    }
  })

  // Criar usuários para StartupXYZ
  const startupAdmin = await prisma.user.create({
    data: {
      name: 'Carlos Ferreira',
      email: 'carlos@startupxyz.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      organizationId: startupXyz.id,
      isActive: true,
      lastLoginAt: new Date()
    }
  })

  const startupDev1 = await prisma.user.create({
    data: {
      name: 'Fernanda Lima',
      email: 'fernanda@startupxyz.com',
      passwordHash: await bcrypt.hash('dev123', 10),
      role: 'MEMBER',
      organizationId: startupXyz.id,
      isActive: true,
      lastLoginAt: new Date()
    }
  })

  const startupDev2 = await prisma.user.create({
    data: {
      name: 'Roberto Alves',
      email: 'roberto@startupxyz.com',
      passwordHash: await bcrypt.hash('dev123', 10),
      role: 'MEMBER',
      organizationId: startupXyz.id,
      isActive: true,
      lastLoginAt: new Date()
    }
  })

  // Criar usuários para EnterpriseInc
  const enterpriseAdmin = await prisma.user.create({
    data: {
      name: 'John Smith',
      email: 'john@enterprise.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      organizationId: enterpriseInc.id,
      isActive: true,
      lastLoginAt: new Date()
    }
  })

  const enterpriseManager = await prisma.user.create({
    data: {
      name: 'Sarah Johnson',
      email: 'sarah@enterprise.com',
      passwordHash: await bcrypt.hash('manager123', 10),
      role: 'MEMBER',
      organizationId: enterpriseInc.id,
      isActive: true,
      lastLoginAt: new Date()
    }
  })

  console.log('👥 Usuários criados')

  // Criar projetos para TechCorp
  const techCorpProject = await prisma.project.create({
    data: {
      name: 'E-commerce Platform',
      description: 'Desenvolvimento da plataforma de e-commerce',
      organizationId: techCorp.id,
      color: '#3B82F6',
      isActive: true
    }
  })

  // Criar projetos para StartupXYZ
  const startupProject1 = await prisma.project.create({
    data: {
      name: 'Mobile App',
      description: 'Aplicativo mobile principal',
      organizationId: startupXyz.id,
      color: '#10B981',
      isActive: true
    }
  })

  const startupProject2 = await prisma.project.create({
    data: {
      name: 'Backend API',
      description: 'API REST para o mobile app',
      organizationId: startupXyz.id,
      color: '#F59E0B',
      isActive: true
    }
  })

  // Criar projetos para EnterpriseInc
  const enterpriseProject1 = await prisma.project.create({
    data: {
      name: 'CRM System',
      description: 'Sistema de gestão de clientes',
      organizationId: enterpriseInc.id,
      color: '#8B5CF6',
      isActive: true
    }
  })

  const enterpriseProject2 = await prisma.project.create({
    data: {
      name: 'Analytics Dashboard',
      description: 'Dashboard de analytics e relatórios',
      organizationId: enterpriseInc.id,
      color: '#EF4444',
      isActive: true
    }
  })

  console.log('📁 Projetos criados')

  // Criar sessões para TechCorp
  const techCorpSession = await prisma.session.create({
    data: {
      name: 'Sprint Planning - Semana 1',
      description: 'Planejamento da primeira sprint',
      organizationId: techCorp.id,
      projectId: techCorpProject.id,
      createdById: techCorpAdmin.id,
      status: 'ACTIVE',
      votingMode: 'FIBONACCI',
      autoReveal: true,
      allowObservers: true
    }
  })

  // Criar sessões para StartupXYZ
  const startupSession1 = await prisma.session.create({
    data: {
      name: 'Feature Estimation - Login',
      description: 'Estimativa da feature de login',
      organizationId: startupXyz.id,
      projectId: startupProject1.id,
      createdById: startupAdmin.id,
      status: 'ACTIVE',
      votingMode: 'FIBONACCI',
      autoReveal: false,
      allowObservers: false
    }
  })

  const startupSession2 = await prisma.session.create({
    data: {
      name: 'API Endpoints - Sprint 2',
      description: 'Estimativa dos endpoints da API',
      organizationId: startupXyz.id,
      projectId: startupProject2.id,
      createdById: startupAdmin.id,
      status: 'COMPLETED',
      votingMode: 'TSHIRT',
      autoReveal: true,
      allowObservers: true
    }
  })

  // Criar sessões para EnterpriseInc
  const enterpriseSession1 = await prisma.session.create({
    data: {
      name: 'CRM Features - Q1',
      description: 'Estimativa das features do CRM',
      organizationId: enterpriseInc.id,
      projectId: enterpriseProject1.id,
      createdById: enterpriseAdmin.id,
      status: 'ACTIVE',
      votingMode: 'FIBONACCI',
      autoReveal: true,
      allowObservers: true
    }
  })

  console.log('🎯 Sessões criadas')

  // Adicionar participantes às sessões
  await prisma.sessionParticipant.createMany({
    data: [
      // TechCorp
      {
        sessionId: techCorpSession.id,
        userId: techCorpAdmin.id,
        role: 'MODERATOR',
        isActive: true
      },
      {
        sessionId: techCorpSession.id,
        userId: techCorpScrum.id,
        role: 'VOTER',
        isActive: true
      },
      {
        sessionId: techCorpSession.id,
        userId: techCorpDev1.id,
        role: 'VOTER',
        isActive: true
      },
      {
        sessionId: techCorpSession.id,
        userId: techCorpDev2.id,
        role: 'OBSERVER',
        isActive: true
      },

      // StartupXYZ
      {
        sessionId: startupSession1.id,
        userId: startupAdmin.id,
        role: 'MODERATOR',
        isActive: true
      },
      {
        sessionId: startupSession1.id,
        userId: startupDev1.id,
        role: 'VOTER',
        isActive: true
      },
      {
        sessionId: startupSession1.id,
        userId: startupDev2.id,
        role: 'VOTER',
        isActive: true
      },

      // EnterpriseInc
      {
        sessionId: enterpriseSession1.id,
        userId: enterpriseAdmin.id,
        role: 'MODERATOR',
        isActive: true
      },
      {
        sessionId: enterpriseSession1.id,
        userId: enterpriseManager.id,
        role: 'VOTER',
        isActive: true
      }
    ]
  })

  console.log('👤 Participantes adicionados')

  // Criar tickets para TechCorp
  const techCorpTickets = await prisma.ticket.createMany({
    data: [
      {
        title: 'Implementar carrinho de compras',
        description: 'Criar funcionalidade de carrinho de compras',
        sessionId: techCorpSession.id,
        priority: 'HIGH',
        status: 'PENDING'
      },
      {
        title: 'Integração com gateway de pagamento',
        description: 'Integrar com Stripe/PayPal',
        sessionId: techCorpSession.id,
        priority: 'MEDIUM',
        status: 'PENDING'
      }
    ]
  })

  // Criar tickets para StartupXYZ
  const startupTickets = await prisma.ticket.createMany({
    data: [
      {
        title: 'Tela de login',
        description: 'Implementar tela de login com validação',
        sessionId: startupSession1.id,
        priority: 'HIGH',
        status: 'VOTING'
      },
      {
        title: 'Recuperação de senha',
        description: 'Sistema de recuperação de senha por email',
        sessionId: startupSession1.id,
        priority: 'MEDIUM',
        status: 'PENDING'
      }
    ]
  })

  // Criar tickets para EnterpriseInc
  const enterpriseTickets = await prisma.ticket.createMany({
    data: [
      {
        title: 'Dashboard de clientes',
        description: 'Criar dashboard para visualização de clientes',
        sessionId: enterpriseSession1.id,
        priority: 'HIGH',
        status: 'PENDING'
      },
      {
        title: 'Relatórios de vendas',
        description: 'Sistema de relatórios de vendas',
        sessionId: enterpriseSession1.id,
        priority: 'MEDIUM',
        status: 'PENDING'
      }
    ]
  })

  console.log('🎫 Tickets criados')

  console.log('✅ Seeds multi-tenant concluídos!')
  console.log('\n📊 Resumo:')
  console.log(`   🏢 Organizações: 3 (TechCorp, StartupXYZ, EnterpriseInc)`)
  console.log(`   👥 Usuários: 9 (3 por organização)`)
  console.log(`   📁 Projetos: 5 (1 TechCorp, 2 StartupXYZ, 2 EnterpriseInc)`)
  console.log(`   🎯 Sessões: 4 (1 TechCorp, 2 StartupXYZ, 1 EnterpriseInc)`)
  console.log(`   🎫 Tickets: 6 (2 por organização)`)
}

main()
  .catch((e) => {
    console.error('❌ Erro nos seeds multi-tenant:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 