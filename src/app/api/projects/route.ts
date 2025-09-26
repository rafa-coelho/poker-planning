import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation, requirePermission } from '@nyx/auth'

// GET /api/projects - Lista projetos da organização
export const GET = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('projects:read')(req as any);
    if (authCheck) return authCheck;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Buscar dados do usuário para verificar role
    const currentUser = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { role: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Construir filtros baseados no role
    const where: any = { 
      organizationId: context.organizationId,
      AND: [] // Array para combinar múltiplas condições
    };
    
    // Se o usuário é MEMBER ou VIEWER, mostrar apenas projetos onde é membro direto OU membro de um time associado
    if (currentUser.role === 'MEMBER' || currentUser.role === 'VIEWER') {
      where.AND.push({
        OR: [
          // Membro direto do projeto
          {
            members: {
              some: {
                userId: context.userId
              }
            }
          },
          // Membro de um time associado ao projeto
          {
            teams: {
              some: {
                members: {
                  some: {
                    userId: context.userId
                  }
                }
              }
            }
          }
        ]
      });
    }
    // ADMIN e SUPER_ADMIN podem ver todos os projetos da organização
    
    if (search) {
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      });
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Limpar array AND se estiver vazio
    if (where.AND.length === 0) {
      delete where.AND;
    }

    // Buscar projetos com paginação
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
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
          // Incluir membros diretos e teams para calcular total de membros
          members: {
            select: { userId: true }
          },
          teams: {
            select: {
              id: true,
              name: true,
              members: {
                select: { userId: true }
              }
            }
          },
          _count: {
            select: {
              sessions: true
            }
          },

        }
      }),
      prisma.project.count({ where })
    ]);

    const pages = Math.ceil(total / limit);

    // Processar projetos para calcular total de membros únicos (diretos + via teams)
    const processedProjects = projects.map(project => {
      const directMembers = new Set(project.members.map(m => m.userId));
      const teamMembers = new Set();
      
      project.teams.forEach(team => {
        team.members.forEach(member => {
          teamMembers.add(member.userId);
        });
      });
      
      // Combinar membros diretos e via teams (únicos)
      const allMembers = new Set([...directMembers, ...teamMembers]);
      
      return {
        ...project,
        _count: {
          ...project._count,
          members: allMembers.size // Total de membros únicos
        },
        // Para MEMBERs e VIEWERs, manter apenas seus próprios dados de membro
        members: currentUser.role === 'MEMBER' || currentUser.role === 'VIEWER' 
          ? project.members.filter(m => m.userId === context.userId)
          : undefined,
        // Incluir times com informações básicas
        teams: project.teams.map(team => ({
          id: team.id,
          name: team.name
        }))
      };
    });

    return NextResponse.json({ 
      projects: processedProjects,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    return NextResponse.json({ error: 'Erro ao buscar projetos', details: String(error) }, { status: 500 });
  }
});

// POST /api/projects - Criar novo projeto
export const POST = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('projects:create')(req as any);
    if (authCheck) return authCheck;

    const body = await req.json();
    const { name, description, color } = body;

    // Validações
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    // Verificar se já existe projeto com o mesmo nome na organização
    const existingProject = await prisma.project.findFirst({ 
      where: { 
        name, 
        organizationId: context.organizationId 
      } 
    });
    
    if (existingProject) {
      return NextResponse.json({ error: 'Já existe um projeto com este nome na organização' }, { status: 409 });
    }

    // Criar projeto
    const project = await prisma.project.create({
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

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    return NextResponse.json({ error: 'Erro ao criar projeto', details: String(error) }, { status: 500 });
  }
}); 