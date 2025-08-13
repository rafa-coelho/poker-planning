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
        // Buscar membros diretos e via teams para cálculo correto
        members: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            userId: true,
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
        teams: {
          select: {
            id: true,
            name: true,
            color: true,
            members: {
              select: {
                id: true,
                role: true,
                joinedAt: true,
                userId: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            sessions: true
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    // Processar para calcular total de membros únicos (diretos + via teams)
    const directMembers = new Set(project.members.map(m => m.userId));
    const teamMembers = new Set();
    const allMembersData = [...project.members];
    
    project.teams.forEach(team => {
      team.members.forEach(member => {
        teamMembers.add(member.userId);
        // Adicionar dados do membro do time se não for membro direto
        if (!directMembers.has(member.userId)) {
          allMembersData.push({
            id: member.id,
            role: 'MEMBER' as any, // Role padrão para membros via team
            joinedAt: member.joinedAt,
            userId: member.userId,
            user: member.user
          });
        }
      });
    });
    
    // Combinar membros diretos e via teams (únicos)
    const allMembers = new Set([...directMembers, ...teamMembers]);
    
    const processedProject = {
      ...project,
      _count: {
        ...project._count,
        members: allMembers.size // Total de membros únicos
      },
      members: allMembersData, // Todos os membros com informação da fonte
      teams: project.teams // Manter teams para exibição
    };

    return NextResponse.json({ project: processedProject });
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