import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation } from '@nyx/auth'

// GET /api/tickets - Lista tickets da organização do usuário autenticado
export const GET = withTenantIsolation(async (req, context) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        session: { organizationId: context.organizationId }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        session: { select: { id: true, name: true } }
      }
    })
    return NextResponse.json({ tickets })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar tickets', details: String(error) }, { status: 500 })
  }
})

// POST /api/tickets - Cria novo ticket para uma sessão da organização do usuário autenticado
export const POST = withTenantIsolation(async (req, context) => {
  try {
    const body = await req.json()
    const { title, description, sessionId, priority, status } = body

    if (!title || typeof title !== 'string' || !sessionId) {
      return NextResponse.json({ error: 'Título e sessionId são obrigatórios' }, { status: 400 })
    }

    // Verifica se a sessão pertence à organização
    const session = await prisma.session.findFirst({
      where: { id: sessionId, organizationId: context.organizationId }
    })
    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada ou não pertence à organização' }, { status: 404 })
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description: description || '',
        sessionId,
        priority: priority || 'MEDIUM',
        status: status || 'PENDING'
      }
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar ticket', details: String(error) }, { status: 500 })
  }
}) 