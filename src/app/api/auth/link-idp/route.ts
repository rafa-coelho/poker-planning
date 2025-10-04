import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { APP_CONFIG } from '@nyx/config';

/**
 * POST /api/auth/link-idp
 * Cria ou vincula usuário do IdP no sistema local
 * NÃO usa withAuth porque precisa validar token do IdP
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Validar token do IdP
    if (!APP_CONFIG.USE_EXTERNAL_IDP || !APP_CONFIG.EXTERNAL_IDP_JWT_SECRET) {
      return NextResponse.json({ error: 'IdP não configurado' }, { status: 400 });
    }

    let idpUser: any;
    try {
      idpUser = jwt.verify(token, APP_CONFIG.EXTERNAL_IDP_JWT_SECRET, {
        issuer: APP_CONFIG.EXTERNAL_IDP_ISSUER || undefined
      });
      console.log('[IdP Link] Token validado:', { sub: idpUser.sub, email: idpUser.email });
    } catch (error: any) {
      console.error('[IdP Link] Erro ao validar token:', error.message);
      return NextResponse.json({ error: 'Token IdP inválido' }, { status: 401 });
    }

    const externalSub = idpUser.sub;
    const email = idpUser.email;
    const name = idpUser.name;
    const tenantId = idpUser.tenantId;
    const roles = idpUser.roles || ['MEMBER'];

    // Verificar se usuário já existe (por email ou externalId)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { externalId: externalSub, externalSource: 'idp' },
          { email }
        ]
      }
    });

    // Verificar se organização existe
    let organization = await prisma.organization.findFirst({
      where: { externalId: tenantId }
    });

    // Se organização não existe, criar
    if (!organization) {
      const orgName = idpUser.organizationName || `Organization ${tenantId.substring(0, 8)}`;
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
      
      organization = await prisma.organization.create({
        data: {
          name: orgName,
          slug,
          externalId: tenantId,
          externalSource: 'idp',
          plan: 'FREE',
          isActive: true
        }
      });
    }

    // Se usuário não existe, criar
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: roles[0] as any,
          organizationId: organization.id,
          externalId: externalSub,
          externalSource: 'idp',
          isActive: true,
          locale: 'pt',
          timezone: 'America/Sao_Paulo'
        }
      });
    } else if (!user.externalId) {
      // Se usuário existe mas não tem externalId, vincular
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          externalId: externalSub,
          externalSource: 'idp',
          organizationId: organization.id
        }
      });
    }

    console.log(`[IdP Link] Usuário vinculado: ${email} (${user.id})`);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId
      }
    });

  } catch (error) {
    console.error('[IdP Link] Erro:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

