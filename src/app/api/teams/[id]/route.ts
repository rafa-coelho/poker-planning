import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation } from '@/lib/middleware/tenant'
import { requirePermission } from '@/lib/middleware/authorization'

// GET /api/teams/[id] - Detalhe do time
export const GET = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('teams:read')(req as any);
    if (authCheck) return authCheck;

    const { pathname } = new URL(req.url);
    const id = pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({ error: 'ID do time é obrigatório' }, { status: 400 });
    }

    const team = await prisma.team.findFirst({
      where: { id, organizationId: context.organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            projects: true
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Erro ao buscar time:', error);
    return NextResponse.json({ error: 'Erro ao buscar time', details: String(error) }, { status: 500 });
  }
});

// PATCH /api/teams/[id] - Atualizar dados do time
export const PATCH = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('teams:update')(req as any);
    if (authCheck) return authCheck;

    const { pathname } = new URL(req.url);
    const id = pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({ error: 'ID do time é obrigatório' }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, color, isActive } = body;

    // Buscar time atual
    const currentTeam = await prisma.team.findFirst({ 
      where: { id, organizationId: context.organizationId },
      select: { id: true, name: true, description: true, color: true, isActive: true }
    });

    if (!currentTeam) {
      return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.team.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        isActive: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ team: updated });
  } catch (error) {
    console.error('Erro ao atualizar time:', error);
    return NextResponse.json({ error: 'Erro ao atualizar time', details: String(error) }, { status: 500 });
  }
});

// DELETE /api/teams/[id] - Soft delete (desativar time)
export const DELETE = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('teams:delete')(req as any);
    if (authCheck) return authCheck;

    const { pathname } = new URL(req.url);
    const id = pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({ error: 'ID do time é obrigatório' }, { status: 400 });
    }

    // Buscar time
    const team = await prisma.team.findFirst({ 
      where: { id, organizationId: context.organizationId },
      select: { id: true, name: true, description: true }
    });

    if (!team) {
      return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });
    }

    // Soft delete - apenas desativar
    await prisma.team.update({ 
      where: { id }, 
      data: { isActive: false } 
    });

    return NextResponse.json({ 
      message: 'Time desativado com sucesso',
      team: { id: team.id, name: team.name, description: team.description }
    });
  } catch (error) {
    console.error('Erro ao desativar time:', error);
    return NextResponse.json({ error: 'Erro ao desativar time', details: String(error) }, { status: 500 });
  }
}); 