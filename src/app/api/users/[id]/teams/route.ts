import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation } from '@/lib/middleware/tenant'
import { requirePermission } from '@/lib/middleware/authorization'

// GET /api/users/[id]/teams - Listar times de um usuário
export const GET = withTenantIsolation(async (req: NextRequest, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('teams:read')(req as any)
    if (authCheck) return authCheck

    const userId = req.nextUrl.pathname.split('/')[3]
    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // Validar usuário na organização
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: context.organizationId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const teams = await prisma.teamMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        team: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            isActive: true
          }
        }
      }
    })

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Erro ao buscar times do usuário:', error)
    return NextResponse.json({ error: 'Erro ao buscar times do usuário', details: String(error) }, { status: 500 })
  }
})

