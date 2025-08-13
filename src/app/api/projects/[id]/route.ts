import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation } from '@/lib/middleware/tenant'
import { requirePermission } from '@/lib/middleware/authorization'

// GET /api/projects/[id] - Detalhe do projeto
export const GET = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('projects:read')(req as any);
    if (authCheck) return authCheck;

    const { pathname } = new URL(req.url);
    const id = pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
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
            sessions: true
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    return NextResponse.json({ error: 'Erro ao buscar projeto', details: String(error) }, { status: 500 });
  }
});

// PATCH /api/projects/[id] - Atualizar dados do projeto
export const PATCH = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('projects:update')(req as any);
    if (authCheck) return authCheck;

    const { pathname } = new URL(req.url);
    const id = pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, color, isActive } = body;

    // Buscar projeto atual
    const currentProject = await prisma.project.findFirst({ 
      where: { id, organizationId: context.organizationId },
      select: { id: true, name: true, description: true, color: true, isActive: true }
    });

    if (!currentProject) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.project.update({
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

    return NextResponse.json({ project: updated });
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    return NextResponse.json({ error: 'Erro ao atualizar projeto', details: String(error) }, { status: 500 });
  }
});

// DELETE /api/projects/[id] - Soft delete (desativar projeto)
export const DELETE = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('projects:delete')(req as any);
    if (authCheck) return authCheck;

    const { pathname } = new URL(req.url);
    const id = pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 });
    }

    // Buscar projeto
    const project = await prisma.project.findFirst({ 
      where: { id, organizationId: context.organizationId },
      select: { id: true, name: true, description: true }
    });

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    // Soft delete - apenas desativar
    await prisma.project.update({ 
      where: { id }, 
      data: { isActive: false } 
    });

    return NextResponse.json({ 
      message: 'Projeto desativado com sucesso',
      project: { id: project.id, name: project.name, description: project.description }
    });
  } catch (error) {
    console.error('Erro ao desativar projeto:', error);
    return NextResponse.json({ error: 'Erro ao desativar projeto', details: String(error) }, { status: 500 });
  }
}); 