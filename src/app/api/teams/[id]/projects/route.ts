import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withTenantIsolation } from '@/lib/middleware/tenant';
import { requirePermission } from '@/lib/middleware/authorization';

// GET /api/teams/[id]/projects - Listar projetos do time
export const GET = withTenantIsolation(async (req: NextRequest, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('teams:read')(req as any);
    if (authCheck) return authCheck;

    const teamId = req.nextUrl.pathname.split('/')[3]; // /api/teams/[id]/projects
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

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

    // Construir query para projetos do time
    const where = {
      teams: {
        some: {
          id: teamId
        }
      },
      organizationId: context.organizationId
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Buscar projetos com paginação
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
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
              sessions: true
            }
          }
        }
      }),
      prisma.project.count({ where })
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({ 
      projects,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Erro ao buscar projetos do time:', error);
    return NextResponse.json({ error: 'Erro ao buscar projetos do time', details: String(error) }, { status: 500 });
  }
});

// POST /api/teams/[id]/projects - Associar projeto ao time
export const POST = withTenantIsolation(async (req: NextRequest, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('teams:update')(req as any);
    if (authCheck) return authCheck;

    const teamId = req.nextUrl.pathname.split('/')[3];
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 });
    }

    // Verificar se o time existe
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId: context.organizationId
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });
    }

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

    // Verificar se a associação já existe
    const existingAssociation = await prisma.team.findFirst({
      where: {
        id: teamId,
        projects: {
          some: {
            id: projectId
          }
        }
      }
    });

    if (existingAssociation) {
      return NextResponse.json({ error: 'Projeto já está associado a este time' }, { status: 409 });
    }

    // Associar projeto ao time
    await prisma.team.update({
      where: { id: teamId },
      data: {
        projects: {
          connect: { id: projectId }
        }
      }
    });

    return NextResponse.json({ message: 'Projeto associado ao time com sucesso' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao associar projeto ao time:', error);
    return NextResponse.json({ error: 'Erro ao associar projeto ao time', details: String(error) }, { status: 500 });
  }
});

// DELETE /api/teams/[id]/projects - Desassociar projeto do time
export const DELETE = withTenantIsolation(async (req: NextRequest, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('teams:update')(req as any);
    if (authCheck) return authCheck;

    const teamId = req.nextUrl.pathname.split('/')[3];
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 });
    }

    // Verificar se o time existe
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId: context.organizationId
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });
    }

    // Verificar se a associação existe
    const existingAssociation = await prisma.team.findFirst({
      where: {
        id: teamId,
        projects: {
          some: {
            id: projectId
          }
        }
      }
    });

    if (!existingAssociation) {
      return NextResponse.json({ error: 'Projeto não está associado a este time' }, { status: 404 });
    }

    // Desassociar projeto do time
    await prisma.team.update({
      where: { id: teamId },
      data: {
        projects: {
          disconnect: { id: projectId }
        }
      }
    });

    return NextResponse.json({ message: 'Projeto desassociado do time com sucesso' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao desassociar projeto do time:', error);
    return NextResponse.json({ error: 'Erro ao desassociar projeto do time', details: String(error) }, { status: 500 });
  }
}); 