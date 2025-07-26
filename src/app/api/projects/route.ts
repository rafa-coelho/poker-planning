import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation } from '@/lib/middleware/tenant'

// GET /api/projects - Lista projetos da organização do usuário autenticado
export const GET = withTenantIsolation(async (req, context) => {
  try {
    const projects = await prisma.project.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        members: { select: { id: true, userId: true, role: true } }
      }
    })
    return NextResponse.json({ projects })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar projetos', details: String(error) }, { status: 500 })
  }
})

// POST /api/projects - Cria novo projeto para a organização do usuário autenticado
export const POST = withTenantIsolation(async (req, context) => {
  try {
    const body = await req.json()
    const { name, description, color, isActive } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Nome do projeto é obrigatório' }, { status: 400 })
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        color: color || '#3B82F6',
        isActive: isActive ?? true,
        organizationId: context.organizationId
      }
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar projeto', details: String(error) }, { status: 500 })
  }
}) 