import { PrismaClient, SessionStatus, VotingMode, ParticipantRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Criando seeds de sessões...')

  // Buscar organizações e usuários existentes
  const organizations = await prisma.organization.findMany()
  const users = await prisma.user.findMany()

  console.log(`📊 Organizações encontradas: ${organizations.length}`)
  console.log(`👥 Usuários encontrados: ${users.length}`)

  if (organizations.length === 0 || users.length === 0) {
    console.log('❌ Organizações ou usuários não encontrados. Execute primeiro: npx tsx prisma/seeds.ts')
    return
  }

  // Usar a primeira organização (que deve ser a NyxLab)
  const organization = organizations[0]
  const admin = users.find(user => user.email === 'admin@nyxlab.com')
  const scrum = users.find(user => user.email === 'scrum@nyxlab.com')
  const dev1 = users.find(user => user.email === 'dev1@nyxlab.com')
  const dev2 = users.find(user => user.email === 'dev2@nyxlab.com')

  console.log(`🏢 Organização: ${organization.name} (${organization.slug})`)
  console.log(`👤 Admin: ${admin?.email || 'não encontrado'}`)
  console.log(`👤 Scrum: ${scrum?.email || 'não encontrado'}`)
  console.log(`👤 Dev1: ${dev1?.email || 'não encontrado'}`)
  console.log(`👤 Dev2: ${dev2?.email || 'não encontrado'}`)

  if (!admin || !scrum || !dev1 || !dev2) {
    console.log('❌ Usuários não encontrados')
    return
  }

  // Criar sessões de exemplo
  const sessions = [
    {
      name: 'Sprint Planning - Backend API',
      description: 'Estimativas para desenvolvimento da API REST',
      status: SessionStatus.ACTIVE,
      votingMode: VotingMode.FIBONACCI,
      autoReveal: true,
      allowObservers: true,
      timerDuration: 300, // 5 minutos
      createdById: admin.id,
      organizationId: organization.id,
    },
    {
      name: 'Refinamento - Frontend Dashboard',
      description: 'Refinamento de histórias do dashboard empresarial',
      status: SessionStatus.ACTIVE,
      votingMode: VotingMode.TSHIRT,
      autoReveal: false,
      allowObservers: true,
      createdById: scrum.id,
      organizationId: organization.id,
    },
    {
      name: 'Sprint Review - Sistema de Pagamentos',
      description: 'Revisão das estimativas do módulo de pagamentos',
      status: SessionStatus.COMPLETED,
      votingMode: VotingMode.FIBONACCI,
      autoReveal: true,
      allowObservers: false,
      createdById: admin.id,
      organizationId: organization.id,
    },
    {
      name: 'Planning Poker - Integração Externa',
      description: 'Estimativas para integração com serviços externos',
      status: SessionStatus.ARCHIVED,
      votingMode: VotingMode.LINEAR,
      autoReveal: false,
      allowObservers: true,
      createdById: scrum.id,
      organizationId: organization.id,
    },
  ]

  console.log('📋 Criando sessões...')
  
  for (const sessionData of sessions) {
    const session = await prisma.session.create({
      data: sessionData
    })

    console.log(`✅ Sessão criada: ${session.name}`)

    // Adicionar participantes
    const participants = [
      { userId: admin.id, role: ParticipantRole.MODERATOR },
      { userId: scrum.id, role: ParticipantRole.VOTER },
      { userId: dev1.id, role: ParticipantRole.VOTER },
      { userId: dev2.id, role: ParticipantRole.OBSERVER },
    ]

    for (const participant of participants) {
      await prisma.sessionParticipant.create({
        data: {
          sessionId: session.id,
          userId: participant.userId,
          role: participant.role,
          isActive: true,
        }
      })
    }

    console.log(`👥 Participantes adicionados à sessão: ${session.name}`)
  }

  // Criar algumas sessões com projetos
  const projects = await prisma.project.findMany({
    where: { organizationId: organization.id }
  })

  if (projects.length > 0) {
    const projectSession = await prisma.session.create({
      data: {
        name: 'Sprint Planning - Projeto Principal',
        description: 'Estimativas para o projeto principal da organização',
        status: SessionStatus.ACTIVE,
        votingMode: VotingMode.FIBONACCI,
        autoReveal: true,
        allowObservers: true,
        projectId: projects[0].id,
        createdById: admin.id,
        organizationId: organization.id,
      }
    })

    // Adicionar participantes
    await prisma.sessionParticipant.createMany({
      data: [
        { sessionId: projectSession.id, userId: admin.id, role: ParticipantRole.MODERATOR, isActive: true },
        { sessionId: projectSession.id, userId: scrum.id, role: ParticipantRole.VOTER, isActive: true },
        { sessionId: projectSession.id, userId: dev1.id, role: ParticipantRole.VOTER, isActive: true },
      ]
    })

    console.log(`✅ Sessão com projeto criada: ${projectSession.name}`)
  }

  console.log('🎉 Seeds de sessões concluídos!')
  console.log('')
  console.log('📊 Resumo:')
  console.log(`   • ${sessions.length + (projects.length > 0 ? 1 : 0)} sessões criadas`)
  console.log(`   • Participantes adicionados automaticamente`)
  console.log(`   • Diferentes modos de votação testados`)
  console.log(`   • Diferentes status de sessão criados`)
  console.log('')
  console.log('🔗 Para testar as APIs:')
  console.log('   GET  /api/sessions - Listar sessões')
  console.log('   POST /api/sessions - Criar nova sessão')
  console.log('   GET  /api/sessions/[id] - Buscar sessão específica')
  console.log('   PUT  /api/sessions/[id] - Atualizar sessão')
  console.log('   DELETE /api/sessions/[id] - Arquivar sessão')
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar seeds de sessões:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })