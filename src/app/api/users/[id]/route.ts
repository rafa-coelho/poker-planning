import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation } from '@/lib/middleware/tenant'

// GET /api/users/[id] - Detalhe do usuário
export const GET = withTenantIsolation(async (req, context) => {
  const { pathname } = new URL(req.url)
  const id = pathname.split('/').pop()
  if (!id) return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
  const user = await prisma.user.findFirst({
    where: { id, organizationId: context.organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true
    }
  })
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  return NextResponse.json({ user })
})

// PATCH /api/users/[id] - Atualizar dados do usuário (nome, role, isActive)
export const PATCH = withTenantIsolation(async (req, context) => {
  const { pathname } = new URL(req.url)
  const id = pathname.split('/').pop()
  if (!id) return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
  const body = await req.json()
  const { name, role, isActive } = body
  // Só permite atualizar se for da mesma organização
  const user = await prisma.user.findFirst({ where: { id, organizationId: context.organizationId } })
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  const updated = await prisma.user.update({
    where: { id },
    data: { name, role, isActive }
  })
  return NextResponse.json({ user: updated })
})

// DELETE /api/users/[id] - Soft delete (desativar usuário)
export const DELETE = withTenantIsolation(async (req, context) => {
  const { pathname } = new URL(req.url)
  const id = pathname.split('/').pop()
  if (!id) return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
  // Só permite deletar se for da mesma organização
  const user = await prisma.user.findFirst({ where: { id, organizationId: context.organizationId } })
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  await prisma.user.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}) 