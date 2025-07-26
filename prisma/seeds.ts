import { PrismaClient, Plan, UserRole, VotingMode } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seeds do banco de dados...')

  // Limpar dados existentes (opcional para desenvolvimento)
  console.log('🧹 Limpando dados existentes...')
  await prisma.vote.deleteMany()
  await prisma.ticket.deleteMany()
  await prisma.sessionParticipant.deleteMany()
  await prisma.session.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.invite.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  // 1. Criar Organização de Demo
  console.log('🏢 Criando organização demo...')
  const demoOrg = await prisma.organization.create({
    data: {
      name: 'NyxLab - Demo',
      slug: 'nyxlab-demo',
      plan: Plan.FREE,
      settings: {
        allowGuestUsers: true,
        defaultVotingMode: 'FIBONACCI',
        sessionTimeout: 3600, // 1 hora
      },
      logoUrl: null,
      domain: 'demo.nyxlab.com'
    }
  })

  // 2. Criar Usuários de Demo
  console.log('👥 Criando usuários demo...')
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@nyxlab.com',
      name: 'Admin Demo',
      passwordHash: '$2b$10$6J4XsIakHljV9RFZfqEmuexzSA4CAjyysRg/ss36dQXZjtU/m8Mhu', // senha: 'admin123'
      role: UserRole.ADMIN,
      locale: 'pt',
      timezone: 'America/Sao_Paulo',
      organizationId: demoOrg.id,
    }
  })

  const scrumMaster = await prisma.user.create({
    data: {
      email: 'scrum@nyxlab.com',
      name: 'Scrum Master',
      passwordHash: '$2b$10$7XvCiberK1RcDs0tUyHcK.EFRgeikRhUuCCb8W5FfABB.ABrh2tHa', // senha: 'scrum123'
      role: UserRole.MEMBER,
      locale: 'pt',
      timezone: 'America/Sao_Paulo',
      organizationId: demoOrg.id,
    }
  })

  const developer1 = await prisma.user.create({
    data: {
      email: 'dev1@nyxlab.com',
      name: 'Developer 1',
      passwordHash: '$2b$10$71Yp1QjZRoxsveucav7dsuMcIf0Ploc9ZY68Q9C/yH2ugGhPZ44G.', // senha: 'dev123'
      role: UserRole.MEMBER,
      locale: 'pt',
      timezone: 'America/Sao_Paulo',
      organizationId: demoOrg.id,
    }
  })

  const developer2 = await prisma.user.create({
    data: {
      email: 'dev2@nyxlab.com',
      name: 'Developer 2',
      passwordHash: '$2b$10$71Yp1QjZRoxsveucav7dsuMcIf0Ploc9ZY68Q9C/yH2ugGhPZ44G.', // senha: 'dev123'
      role: UserRole.MEMBER,
      locale: 'pt',
      timezone: 'America/Sao_Paulo',
      organizationId: demoOrg.id,
    }
  })

  // 3. Criar Projeto de Demo
  console.log('📋 Criando projeto demo...')
  const demoProject = await prisma.project.create({
    data: {
      name: 'Poker Planning - MVP',
      description: 'Projeto de desenvolvimento do sistema de poker planning empresarial',
      color: '#3B82F6',
      organizationId: demoOrg.id,
    }
  })

  // 4. Adicionar membros ao projeto
  console.log('👥 Adicionando membros ao projeto...')
  await prisma.projectMember.createMany({
    data: [
      { projectId: demoProject.id, userId: adminUser.id, role: 'ADMIN' },
      { projectId: demoProject.id, userId: scrumMaster.id, role: 'ADMIN' },
      { projectId: demoProject.id, userId: developer1.id, role: 'MEMBER' },
      { projectId: demoProject.id, userId: developer2.id, role: 'MEMBER' },
    ]
  })

  // 5. Criar Sessão de Demo
  console.log('🎮 Criando sessão demo...')
  const demoSession = await prisma.session.create({
    data: {
      name: 'Sprint Planning - Semana 1',
      description: 'Sessão de planning para as funcionalidades da primeira sprint',
      organizationId: demoOrg.id,
      createdById: scrumMaster.id,
      projectId: demoProject.id,
      votingMode: VotingMode.FIBONACCI,
      autoReveal: false,
      allowObservers: true,
      timerDuration: 300, // 5 minutos
    }
  })

  // 6. Adicionar participantes à sessão
  console.log('👤 Adicionando participantes...')
  await prisma.sessionParticipant.createMany({
    data: [
      { sessionId: demoSession.id, userId: scrumMaster.id, role: 'MODERATOR' },
      { sessionId: demoSession.id, userId: developer1.id, role: 'VOTER' },
      { sessionId: demoSession.id, userId: developer2.id, role: 'VOTER' },
      { sessionId: demoSession.id, userId: adminUser.id, role: 'OBSERVER' },
    ]
  })

  // 7. Criar Tickets de Demo
  console.log('🎫 Criando tickets demo...')
  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        title: 'Implementar autenticação JWT',
        description: 'Criar sistema completo de autenticação com JWT, refresh tokens e middleware de autorização',
        identifier: 'PP-001',
        priority: 'HIGH',
        sessionId: demoSession.id,
      }
    }),
    prisma.ticket.create({
      data: {
        title: 'Criar API de gestão de sessões',
        description: 'Implementar endpoints CRUD para sessões de poker planning com validações',
        identifier: 'PP-002',
        priority: 'HIGH',
        sessionId: demoSession.id,
      }
    }),
    prisma.ticket.create({
      data: {
        title: 'Implementar sistema de voting em tempo real',
        description: 'Integrar WebSockets para votação colaborativa e sincronização em tempo real',
        identifier: 'PP-003',
        priority: 'MEDIUM',
        sessionId: demoSession.id,
      }
    }),
  ])

  // 8. Criar alguns votos de exemplo
  console.log('🗳️ Criando votos demo...')
  await prisma.vote.createMany({
    data: [
      // Votos para o primeiro ticket
      { 
        ticketId: tickets[0].id, 
        userId: developer1.id, 
        value: '8', 
        confidence: 4,
        comment: 'Complexidade média, já temos experiência com JWT'
      },
      { 
        ticketId: tickets[0].id, 
        userId: developer2.id, 
        value: '5', 
        confidence: 5,
        comment: 'Implementação padrão, sem grandes desafios'
      },
      // Votos para o segundo ticket
      { 
        ticketId: tickets[1].id, 
        userId: developer1.id, 
        value: '5', 
        confidence: 4,
        comment: 'CRUD básico com algumas validações'
      },
      { 
        ticketId: tickets[1].id, 
        userId: developer2.id, 
        value: '8', 
        confidence: 3,
        comment: 'Pode ter complexidade nas validações de negócio'
      },
    ]
  })

  console.log('✅ Seeds executados com sucesso!')
  console.log('')
  console.log('📊 Dados criados:')
  console.log(`   • 1 Organização: ${demoOrg.name}`)
  console.log(`   • 4 Usuários (1 admin, 1 scrum master, 2 desenvolvedores)`)
  console.log(`   • 1 Projeto: ${demoProject.name}`)
  console.log(`   • 1 Sessão: ${demoSession.name}`)
  console.log(`   • ${tickets.length} Tickets`)
  console.log(`   • 4 Votos de exemplo`)
  console.log('')
  console.log('🔑 Credenciais de acesso:')
  console.log('   Admin: admin@nyxlab.com / admin123')
  console.log('   Scrum: scrum@nyxlab.com / scrum123')
  console.log('   Dev1: dev1@nyxlab.com / dev123')
  console.log('   Dev2: dev2@nyxlab.com / dev123')
  console.log('')
  console.log('🎯 Próximos passos:')
  console.log('   • Execute: npx prisma studio (para ver os dados)')
  console.log('   • Execute: npm run dev (para iniciar a aplicação)')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seeds:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 