import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation, requirePermission } from '@nyx/auth'
import { UserRole, canManageUser } from '@/lib/auth/roles'

// GET /api/users/[id] - Detalhe do usuário
export const GET = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('users:read')(req as any);
    if (authCheck) return authCheck;

    const { pathname } = new URL(req.url);
    const id = pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    const baseUser = await prisma.user.findFirst({
      where: { id, organizationId: context.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        avatar: true,
        locale: true,
        timezone: true,
        organization: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    if (!baseUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Contagens adicionais para tela de detalhes
    const [teamsAsLeader, teamsAsMember, createdProjects, createdSessions] = await Promise.all([
      prisma.teamMember.count({ where: { userId: id, role: 'ADMIN' as any } }),
      prisma.teamMember.count({ where: { userId: id, role: { in: ['MEMBER', 'VIEWER'] as any } } }),
      prisma.project.count({ where: { createdById: id, organizationId: context.organizationId } }),
      prisma.session.count({ where: { createdById: id, organizationId: context.organizationId } })
    ])

    const user = {
      ...baseUser,
      _count: {
        teamsAsLeader,
        teamsAsMember,
        createdProjects,
        createdSessions,
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json({ error: 'Erro ao buscar usuário', details: String(error) }, { status: 500 });
  }
});

// PATCH /api/users/[id] - Atualizar dados do usuário
export const PATCH = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('users:update')(req as any);
    if (authCheck) return authCheck;

    const { pathname } = new URL(req.url);
    const id = pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    const body = await req.json();
    const { name, role, isActive } = body;

    // Buscar usuário atual
    const currentUser = await prisma.user.findFirst({ 
      where: { id, organizationId: context.organizationId },
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Buscar usuário que está fazendo a alteração
    const requestingUser = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { role: true }
    });

    if (!requestingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se pode alterar a role
    if (role && role !== currentUser.role) {
      if (!canManageUser(requestingUser.role as UserRole, currentUser.role as UserRole)) {
        return NextResponse.json({ 
          error: 'Você não tem permissão para alterar a role deste usuário' 
        }, { status: 403 });
      }
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Erro ao atualizar usuário', details: String(error) }, { status: 500 });
  }
});

// DELETE /api/users/[id] - Soft delete (desativar usuário)
export const DELETE = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('users:delete')(req as any);
    if (authCheck) return authCheck;

    const { pathname } = new URL(req.url);
    const id = pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    // Verificar se não está tentando deletar a si mesmo
    if (id === context.userId) {
      return NextResponse.json({ error: 'Você não pode desativar sua própria conta' }, { status: 400 });
    }

    // Buscar usuário
    const user = await prisma.user.findFirst({ 
      where: { id, organizationId: context.organizationId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se o usuário logado pode deletar este usuário
    const requestingUser = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { role: true }
    });

    if (!requestingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (!canManageUser(requestingUser.role as UserRole, user.role as UserRole)) {
      return NextResponse.json({ 
        error: 'Você não tem permissão para desativar este usuário' 
      }, { status: 403 });
    }

    // Soft delete - apenas desativar
    await prisma.user.update({ 
      where: { id }, 
      data: { isActive: false } 
    });

    return NextResponse.json({ 
      message: 'Usuário desativado com sucesso',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    return NextResponse.json({ error: 'Erro ao desativar usuário', details: String(error) }, { status: 500 });
  }
}); 