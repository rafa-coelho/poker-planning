import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withResourceAccess } from '@/lib/middleware/tenant'

// GET /api/tickets/[id] - Detalhe do ticket
export const GET = withResourceAccess(
  undefined as any,
  'ticket',
  async (req, context) => {
    const { pathname } = new URL(req.url)
    const id = pathname.split('/').pop()
    if (!id) return NextResponse.json({ error: 'ID do ticket é obrigatório' }, { status: 400 })
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        session: { select: { id: true, name: true, organizationId: true } }
      }
    })
    if (!ticket || ticket.session.organizationId !== context.organizationId) {
      return NextResponse.json({ error: 'Ticket não encontrado ou não pertence à organização' }, { status: 404 })
    }
    return NextResponse.json({ ticket })
  }
)

// PATCH /api/tickets/[id] - Atualizar ticket
export const PATCH = withResourceAccess(
  undefined as any,
  'ticket',
  async (req, context) => {
    const { pathname } = new URL(req.url)
    const id = pathname.split('/').pop()
    if (!id) return NextResponse.json({ error: 'ID do ticket é obrigatório' }, { status: 400 })
    const body = await req.json()
    const { title, description, priority, status } = body
    // Busca ticket e valida organização
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { session: { select: { organizationId: true } } }
    })
    if (!ticket || ticket.session.organizationId !== context.organizationId) {
      return NextResponse.json({ error: 'Ticket não encontrado ou não pertence à organização' }, { status: 404 })
    }
    const updated = await prisma.ticket.update({
      where: { id },
      data: { title, description, priority, status }
    })
    return NextResponse.json({ ticket: updated })
  }
)

// DELETE /api/tickets/[id] - Remover ticket
export const DELETE = withResourceAccess(
  undefined as any,
  'ticket',
  async (req, context) => {
    const { pathname } = new URL(req.url)
    const id = pathname.split('/').pop()
    if (!id) return NextResponse.json({ error: 'ID do ticket é obrigatório' }, { status: 400 })
    // Busca ticket e valida organização
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { session: { select: { organizationId: true } } }
    })
    if (!ticket || ticket.session.organizationId !== context.organizationId) {
      return NextResponse.json({ error: 'Ticket não encontrado ou não pertence à organização' }, { status: 404 })
    }
    await prisma.ticket.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }
) 