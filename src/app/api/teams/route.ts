import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation } from '@/lib/middleware/tenant'
import { requirePermission } from '@/lib/middleware/authorization'

// GET /api/teams - Lista times da organização
export const GET = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('teams:read')(req as any);
    if (authCheck) return authCheck;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = { organizationId: context.organizationId };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Buscar times com paginação
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
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
    console.error('Erro ao buscar times:', error);
    return NextResponse.json({ error: 'Erro ao buscar times', details: String(error) }, { status: 500 });
  }
});

// POST /api/teams - Criar novo time
export const POST = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('teams:create')(req as any);
    if (authCheck) return authCheck;

    const body = await req.json();
    const { name, description, color } = body;

    // Validações
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    // Verificar se já existe time com o mesmo nome na organização
    const existingTeam = await prisma.team.findFirst({ 
      where: { 
        name, 
        organizationId: context.organizationId 
      } 
    });
    
    if (existingTeam) {
      return NextResponse.json({ error: 'Já existe um time com este nome na organização' }, { status: 409 });
    }

    // Criar time
    const team = await prisma.team.create({
      data: {
        name,
        description,
        color,
        organizationId: context.organizationId,
        createdById: context.userId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        isActive: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar time:', error);
    return NextResponse.json({ error: 'Erro ao criar time', details: String(error) }, { status: 500 });
  }
}); 