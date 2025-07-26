import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withResourceAccess } from '@/lib/middleware/tenant'

// GET /api/projects/[id] - Detalhe do projeto
export const GET = withResourceAccess(
  undefined as any,
  'project',
  async (req, context) => {
    const { pathname } = new URL(req.url)
    const id = pathname.split('/').pop()
    if (!id) return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 })
    const project = await prisma.project.findUnique({
      where: { id, organizationId: context.organizationId },
      include: {
        members: { select: { id: true, userId: true, role: true } },
        sessions: { select: { id: true, name: true } }
      }
    })
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    return NextResponse.json({ project })
  }
)

// PATCH /api/projects/[id] - Atualizar projeto
export const PATCH = withResourceAccess(
  undefined as any,
  'project',
  async (req, context) => {
    const { pathname } = new URL(req.url)
    const id = pathname.split('/').pop()
    if (!id) return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 })
    const body = await req.json()
    const { name, description, color, isActive } = body
    const project = await prisma.project.update({
      where: { id, organizationId: context.organizationId },
      data: { name, description, color, isActive }
    })
    return NextResponse.json({ project })
  }
)

// DELETE /api/projects/[id] - Remover projeto
export const DELETE = withResourceAccess(
  undefined as any,
  'project',
  async (req, context) => {
    const { pathname } = new URL(req.url)
    const id = pathname.split('/').pop()
    if (!id) return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 })
    await prisma.project.delete({ where: { id, organizationId: context.organizationId } })
    return NextResponse.json({ ok: true })
  }
) 