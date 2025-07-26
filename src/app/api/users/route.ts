import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation } from '@/lib/middleware/tenant'

// GET /api/users - Lista usuários da organização do usuário autenticado
export const GET = withTenantIsolation(async (req, context) => {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true
      }
    })
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar usuários', details: String(error) }, { status: 500 })
  }
})

// POST /api/users - Convida novo usuário para a organização (cria invite)
export const POST = withTenantIsolation(async (req, context) => {
  try {
    const body = await req.json()
    const { email, role } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    // Verifica se já existe usuário ou convite
    const existingUser = await prisma.user.findFirst({ where: { email, organizationId: context.organizationId } })
    if (existingUser) {
      return NextResponse.json({ error: 'Usuário já existe na organização' }, { status: 409 })
    }
    const existingInvite = await prisma.invite.findFirst({ where: { email, organizationId: context.organizationId, status: 'PENDING' } })
    if (existingInvite) {
      return NextResponse.json({ error: 'Convite já enviado para este email' }, { status: 409 })
    }

    // Cria convite
    const invite = await prisma.invite.create({
      data: {
        email,
        role: role || 'MEMBER',
        organizationId: context.organizationId,
        status: 'PENDING',
        token: Math.random().toString(36).substring(2),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 dias
        createdById: context.userId
      }
    })

    // Aqui você pode disparar email de convite futuramente

    return NextResponse.json({ invite }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao convidar usuário', details: String(error) }, { status: 500 })
  }
}) 