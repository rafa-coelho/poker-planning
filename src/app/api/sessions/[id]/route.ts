import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withResourceAccess } from '@/lib/middleware/tenant'

// GET /api/sessions/[id] - Detalhe da sessão
export const GET = withResourceAccess(
  // resourceId extraído da URL
  undefined as any,
  'session',
  async (req, context) => {
    const { pathname } = new URL(req.url)
    const id = pathname.split('/').pop()
    if (!id) return NextResponse.json({ error: 'ID da sessão é obrigatório' }, { status: 400 })
    const session = await prisma.session.findUnique({
      where: { id, organizationId: context.organizationId },
      include: {
        project: { select: { id: true, name: true } },
        participants: { select: { id: true, userId: true, role: true } },
        tickets: true
      }
    })
    if (!session) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
    return NextResponse.json({ session })
  }
)

// PATCH /api/sessions/[id] - Atualizar sessão
export const PATCH = withResourceAccess(
  undefined as any,
  'session',
  async (req, context) => {
    const { pathname } = new URL(req.url)
    const id = pathname.split('/').pop()
    if (!id) return NextResponse.json({ error: 'ID da sessão é obrigatório' }, { status: 400 })
    const body = await req.json()
    const { name, description, status, votingMode, autoReveal, allowObservers } = body
    const session = await prisma.session.update({
      where: { id, organizationId: context.organizationId },
      data: {
        name,
        description,
        status,
        votingMode,
        autoReveal,
        allowObservers
      }
    })
    return NextResponse.json({ session })
  }
)

// DELETE /api/sessions/[id] - Remover sessão
export const DELETE = withResourceAccess(
  undefined as any,
  'session',
  async (req, context) => {
    const { pathname } = new URL(req.url)
    const id = pathname.split('/').pop()
    if (!id) return NextResponse.json({ error: 'ID da sessão é obrigatório' }, { status: 400 })
    await prisma.session.delete({
      where: { id, organizationId: context.organizationId }
    })
    return NextResponse.json({ ok: true })
  }
) 