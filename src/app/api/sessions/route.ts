import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation } from '@/lib/middleware/tenant'

// GET /api/sessions - Lista sessões da organização do usuário autenticado
export const GET = withTenantIsolation(async (req, context) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        participants: { select: { id: true, userId: true, role: true } }
      }
    })
    return NextResponse.json({ sessions })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar sessões', details: String(error) }, { status: 500 })
  }
})

// POST /api/sessions - Cria nova sessão para a organização do usuário autenticado
export const POST = withTenantIsolation(async (req, context) => {
  try {
    const body = await req.json()
    const { name, description, projectId, votingMode, autoReveal, allowObservers } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Nome da sessão é obrigatório' }, { status: 400 })
    }

    const session = await prisma.session.create({
      data: {
        name,
        description: description || '',
        organizationId: context.organizationId,
        projectId: projectId || null,
        createdById: context.userId,
        votingMode: votingMode || 'FIBONACCI',
        autoReveal: autoReveal ?? false,
        allowObservers: allowObservers ?? true
      }
    })

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar sessão', details: String(error) }, { status: 500 })
  }
}) 