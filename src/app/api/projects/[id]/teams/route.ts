import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withTenantIsolation } from '@/lib/middleware/tenant';
import { requirePermission } from '@/lib/middleware/authorization';

// GET /api/projects/[id]/teams - Listar times do projeto
export const GET = withTenantIsolation(async (req: NextRequest, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('projects:read')(req as any);
    if (authCheck) return authCheck;

    const projectId = req.nextUrl.pathname.split('/')[3]; // /api/projects/[id]/teams
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    // Verificar se o projeto existe e pertence à organização
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: context.organizationId
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    // Construir query para times do projeto
    const where = {
      projects: {
        some: {
          id: projectId
        }
      },
      organizationId: context.organizationId
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Buscar times com paginação
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          _count: {
            select: {
              members: true,
              projects: true
            }
          }
        }
      }),
      prisma.team.count({ where })
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({ 
      teams,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Erro ao buscar times do projeto:', error);
    return NextResponse.json({ error: 'Erro ao buscar times do projeto', details: String(error) }, { status: 500 });
  }
});

// POST /api/projects/[id]/teams - Associar time ao projeto
export const POST = withTenantIsolation(async (req: NextRequest, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('projects:update')(req as any);
    if (authCheck) return authCheck;

    const projectId = req.nextUrl.pathname.split('/')[3];
    const body = await req.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json({ error: 'ID do time é obrigatório' }, { status: 400 });
    }

    // Verificar se o projeto existe
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: context.organizationId
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    // Verificar se o time existe e pertence à organização
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId: context.organizationId
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });
    }

    // Verificar se a associação já existe
    const existingAssociation = await prisma.project.findFirst({
      where: {
        id: projectId,
        teams: {
          some: {
            id: teamId
          }
        }
      }
    });

    if (existingAssociation) {
      return NextResponse.json({ error: 'Time já está associado a este projeto' }, { status: 409 });
    }

    // Associar time ao projeto
    await prisma.project.update({
      where: { id: projectId },
      data: {
        teams: {
          connect: { id: teamId }
        }
      }
    });

    return NextResponse.json({ message: 'Time associado ao projeto com sucesso' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao associar time ao projeto:', error);
    return NextResponse.json({ error: 'Erro ao associar time ao projeto', details: String(error) }, { status: 500 });
  }
});

// DELETE /api/projects/[id]/teams - Desassociar time do projeto
export const DELETE = withTenantIsolation(async (req: NextRequest, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('projects:update')(req as any);
    if (authCheck) return authCheck;

    const projectId = req.nextUrl.pathname.split('/')[3];
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'ID do time é obrigatório' }, { status: 400 });
    }

    // Verificar se o projeto existe
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: context.organizationId
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    // Verificar se a associação existe
    const existingAssociation = await prisma.project.findFirst({
      where: {
        id: projectId,
        teams: {
          some: {
            id: teamId
          }
        }
      }
    });

    if (!existingAssociation) {
      return NextResponse.json({ error: 'Time não está associado a este projeto' }, { status: 404 });
    }

    // Desassociar time do projeto
    await prisma.project.update({
      where: { id: projectId },
      data: {
        teams: {
          disconnect: { id: teamId }
        }
      }
    });

    return NextResponse.json({ message: 'Time desassociado do projeto com sucesso' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao desassociar time do projeto:', error);
    return NextResponse.json({ error: 'Erro ao desassociar time do projeto', details: String(error) }, { status: 500 });
  }
}); 