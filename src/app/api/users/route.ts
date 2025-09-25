import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withTenantIsolation } from '@/lib/middleware/tenant'
import { requirePermission } from '@/lib/middleware/authorization'
import { UserRole } from '@/lib/auth/roles'
import { generateSecureToken } from '@/lib/auth/jwt'
import { emailService } from '@/lib/email/service'

// GET /api/users - Lista usuários da organização do usuário autenticado
export const GET = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('users:read')(req as any);
    if (authCheck) return authCheck;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') as UserRole | null;
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = { organizationId: context.organizationId };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Buscar usuários com paginação
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          avatar: true
        }
      }),
      prisma.user.count({ where })
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({ 
      users,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json({ error: 'Erro ao buscar usuários', details: String(error) }, { status: 500 });
  }
});

// POST /api/users - Criar novo usuário na organização
export const POST = withTenantIsolation(async (req, context) => {
  try {
    // Verificar permissão
    const authCheck = await requirePermission('users:create')(req as any);
    if (authCheck) return authCheck;

    const body = await req.json();
    const { email, name, role = 'MEMBER' } = body;

    // Validações
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    // Verificar se já existe usuário
    const existingUser = await prisma.user.findFirst({ 
      where: { email, organizationId: context.organizationId } 
    });
    
    if (existingUser) {
      return NextResponse.json({ error: 'Usuário já existe na organização' }, { status: 409 });
    }

    // Verificar se o usuário logado pode atribuir esta role
    const currentUser = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { role: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Gerar token de convite
    const inviteToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 horas

    // Transação para criar usuário e convite
    const result = await prisma.$transaction(async (tx) => {
      // Criar usuário (sem senha - será definida via convite)
      const user = await tx.user.create({
        data: {
          email,
          name,
          role: role as UserRole,
          organizationId: context.organizationId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      });

      // Criar convite
      const invite = await tx.invite.create({
        data: {
          email,
          role: role as UserRole,
          token: inviteToken,
          expiresAt,
          organizationId: context.organizationId,
          createdById: context.userId,
          metadata: {
            userId: user.id,
            isNewUser: true
          }
        }
      });

      return { user, invite };
    });

    // Buscar dados para o email
    const [inviterUser, organization] = await Promise.all([
      prisma.user.findUnique({
        where: { id: context.userId },
        select: { name: true }
      }),
      prisma.organization.findUnique({
        where: { id: context.organizationId },
        select: { name: true }
      })
    ]);

    if (!inviterUser || !organization) {
      return NextResponse.json({ error: 'Dados não encontrados' }, { status: 500 });
    }

    // Enviar email de convite
    if (emailService.isConfigured()) {
      const localeHeader = req.headers.get('accept-language') || undefined
      const locale = (localeHeader || '').toLowerCase().startsWith('en') ? 'en' : 'pt'
      const emailResult = await emailService.sendInviteEmail(
        email,
        name,
        inviteToken,
        organization.name,
        inviterUser.name,
        locale
      );

      if (!emailResult.success) {
        console.error('Erro ao enviar email de convite:', emailResult.error);
        // Não falha a operação, apenas loga o erro
      }
    } else {
      console.warn('Email não configurado. Convite criado mas email não enviado.');
    }

    return NextResponse.json({ 
      user: result.user,
      invite: {
        token: result.invite.token,
        expiresAt: result.invite.expiresAt,
        status: result.invite.status
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ error: 'Erro ao criar usuário', details: String(error) }, { status: 500 });
  }
}); 