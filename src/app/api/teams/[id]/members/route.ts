import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation } from '@/lib/middleware/tenant'
import { requirePermission } from '@/lib/middleware/authorization'
import { TeamRole } from '@prisma/client'

// GET /api/teams/[id]/members - Listar membros do time
export const GET = withTenantIsolation(async (req: NextRequest, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('teams:read')(req as any)
    if (authCheck) return authCheck

    const teamId = req.nextUrl.pathname.split('/')[3]
    if (!teamId) {
      return NextResponse.json({ error: 'ID do time é obrigatório' }, { status: 400 })
    }

    // Validar time na organização
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId: context.organizationId },
      select: { id: true }
    })

    if (!team) {
      return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 })
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { joinedAt: 'asc' },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Erro ao buscar membros do time:', error)
    return NextResponse.json({ error: 'Erro ao buscar membros do time', details: String(error) }, { status: 500 })
  }
})

// POST /api/teams/[id]/members - Adicionar usuário existente ao time
export const POST = withTenantIsolation(async (req: NextRequest, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('teams:manage_members')(req as any)
    if (authCheck) return authCheck

    const teamId = req.nextUrl.pathname.split('/')[3]
    const { userId, role } = await req.json()

    if (!teamId || !userId) {
      return NextResponse.json({ error: 'IDs de time e usuário são obrigatórios' }, { status: 400 })
    }

    // Validar time
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId: context.organizationId },
      select: { id: true }
    })
    if (!team) {
      return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 })
    }

    // Validar usuário
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: context.organizationId, isActive: true },
      select: { id: true }
    })
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se já é membro
    const exists = await prisma.teamMember.findFirst({ where: { teamId, userId } })
    if (exists) {
      return NextResponse.json({ error: 'Usuário já é membro deste time' }, { status: 409 })
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role: (role as TeamRole) || TeamRole.MEMBER
      },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: { select: { id: true, name: true, email: true, role: true, avatar: true } }
      }
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('Erro ao adicionar membro ao time:', error)
    return NextResponse.json({ error: 'Erro ao adicionar membro ao time', details: String(error) }, { status: 500 })
  }
})

// DELETE /api/teams/[id]/members?userId= - Remover membro do time
export const DELETE = withTenantIsolation(async (req: NextRequest, context) => {
  try {
    const authCheck = await requirePermission('teams:manage_members')(req as any)
    if (authCheck) return authCheck

    const teamId = req.nextUrl.pathname.split('/')[3]
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!teamId || !userId) {
      return NextResponse.json({ error: 'IDs de time e usuário são obrigatórios' }, { status: 400 })
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId: context.organizationId },
      select: { id: true }
    })
    if (!team) {
      return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 })
    }

    await prisma.teamMember.deleteMany({ where: { teamId, userId } })

    return NextResponse.json({ message: 'Membro removido com sucesso' })
  } catch (error) {
    console.error('Erro ao remover membro do time:', error)
    return NextResponse.json({ error: 'Erro ao remover membro do time', details: String(error) }, { status: 500 })
  }
})

