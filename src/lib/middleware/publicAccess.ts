import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth/jwt';

export interface PublicAccessContext {
  sessionId: string;
  session: any;
  user?: any;
  isLoggedIn: boolean;
  hasAccess: boolean;
  requiresApproval: boolean;
}

/**
 * Middleware para verificar acesso público a sessões
 */
export async function verifyPublicAccess(
  request: NextRequest,
  sessionId: string
): Promise<PublicAccessContext | null> {
  try {
    // 1. Verificar se a sessão existe e está ativa
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        organization: true,
        createdBy: true,
        project: true,
        participants: {
          include: {
            user: true
          }
        }
      }
    });

    if (!session) {
      return null;
    }

    // 2. Verificar se a sessão está ativa
    if (session.status !== 'ACTIVE') {
      return null;
    }

    // 3. Buscar participantes públicos aprovados (se o modelo existir)
    let publicParticipants: any[] = [];
    try {
      publicParticipants = await (prisma as any).publicParticipant.findMany({
        where: {
          sessionId: sessionId,
          status: 'APPROVED',
          expiresAt: {
            gt: new Date()
          }
        }
      });
    } catch (error) {
      console.log('Modelo PublicParticipant não encontrado, continuando sem participantes públicos');
    }

    // Adicionar participantes públicos ao objeto da sessão
    (session as any).publicParticipants = publicParticipants;

    // 4. Tentar obter usuário logado
    let user = null;
    let isLoggedIn = false;
    let hasAccess = false;

    try {
      const token = request.cookies.get('accessToken')?.value;
      if (token) {
        const payload = await verifyAccessToken(token);
        if (payload) {
          user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
              organization: true
            }
          });
          
          if (user) {
            isLoggedIn = true;
            
            // Verificar se o usuário tem acesso à sessão
            hasAccess = await checkUserAccess(user, session);
          }
        }
      }
    } catch (error) {
      // Token inválido, continuar como usuário não logado
      console.log('Token inválido para acesso público:', error);
    }

    // 5. Determinar se precisa de aprovação
    const requiresApproval = !hasAccess && !isLoggedIn;

    return {
      sessionId,
      session,
      user,
      isLoggedIn,
      hasAccess,
      requiresApproval
    };

  } catch (error) {
    console.error('Erro ao verificar acesso público:', error);
    return null;
  }
}

/**
 * Verifica se o usuário tem acesso à sessão
 */
async function checkUserAccess(user: any, session: any): Promise<boolean> {
  // 1. Verificar se é da mesma organização
  if (user.organizationId !== session.organizationId) {
    return false;
  }

  // 2. Verificar se é o criador da sessão
  if (user.id === session.createdById) {
    return true;
  }

  // 3. Verificar se é participante da sessão
  const isParticipant = session.participants.some(
    (p: any) => p.userId === user.id && p.isActive
  );

  if (isParticipant) {
    return true;
  }

  // 4. Verificar se tem permissões de admin na organização
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return true;
  }

  return false;
}

/**
 * Middleware para rate limiting de acessos públicos
 */
export async function checkPublicAccessRateLimit(
  request: NextRequest,
  sessionId: string
): Promise<boolean> {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  // Por enquanto, implementação simples
  // TODO: Implementar rate limiting real com Redis
  return true;
}

/**
 * Valida nome do participante público
 */
export function validatePublicParticipantName(name: string): {
  isValid: boolean;
  error?: string;
} {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'validation.nameRequired' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'validation.nameTooShort' };
  }

  if (name.trim().length > 50) {
    return { isValid: false, error: 'validation.nameTooLong' };
  }

  // Validar caracteres especiais
  const validNameRegex = /^[a-zA-ZÀ-ÿ0-9\s]+$/;
  if (!validNameRegex.test(name.trim())) {
    return { isValid: false, error: 'validation.nameInvalidChars' };
  }

  // Blacklist de nomes inapropriados
  const blacklist = ['admin', 'root', 'system', 'test', 'guest', 'anonymous'];
  if (blacklist.includes(name.toLowerCase().trim())) {
    return { isValid: false, error: 'validation.nameNotAllowed' };
  }

  return { isValid: true };
}
