import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPasswordResetToken, hashPassword } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword, type } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { 
          error: {
            code: 'INVALID_REQUEST',
            message: 'Token e nova senha são obrigatórios',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

    // Validar força da senha
    if (newPassword.length < 6) {
      return NextResponse.json(
        { 
          error: {
            code: 'WEAK_PASSWORD',
            message: 'A senha deve ter pelo menos 6 caracteres',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

    let user = null as any;
    let isInvite = type === 'invite';

    if (isInvite) {
      // Processar convite
      const invite = await prisma.invite.findUnique({
        where: { token },
        include: {
          organization: true
        }
      });

      if (!invite) {
        return NextResponse.json(
          { 
            error: {
              code: 'INVALID_TOKEN',
              message: 'Convite inválido ou não encontrado',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
      }

      // Verificar se o convite expirou
      if (invite.expiresAt < new Date()) {
        return NextResponse.json(
          { 
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Convite expirado',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
      }

      // Verificar se o convite já foi aceito
      if (invite.status !== 'PENDING') {
        return NextResponse.json(
          { 
            error: {
              code: 'INVITE_ALREADY_USED',
              message: 'Convite já foi aceito',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
      }

      // Buscar usuário pelo metadata do convite
      const userId = (invite.metadata as any)?.userId;
      if (userId) {
        user = await prisma.user.findUnique({
          where: { id: userId },
          include: { organization: true }
        });
      }

      if (!user) {
        return NextResponse.json(
          { 
            error: {
              code: 'USER_NOT_FOUND',
              message: 'Usuário associado ao convite não encontrado',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
      }

    } else {
      // Processar reset de senha
      // Buscar usuário por token: agora com digest sha256, não dá para usar igualdade direta
      // Então buscamos usuários com resetToken não nulo e comparamos via verifyPasswordResetToken
      const candidate = await prisma.user.findFirst({
        where: { resetToken: { not: null } },
        select: { id: true, email: true, resetToken: true, resetTokenExpiresAt: true }
      })
      
      if (candidate && candidate.resetToken && await verifyPasswordResetToken(token, candidate.resetToken)) {
        user = await prisma.user.findUnique({ where: { id: candidate.id }, include: { organization: true } })
      }

      if (!user) {
        return NextResponse.json(
          { 
            error: {
              code: 'INVALID_TOKEN',
              message: 'Token de reset inválido ou expirado',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
      }

      // Verificar se o token expirou
      if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
        return NextResponse.json(
          { 
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Token de reset expirado',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
      }

      // Verificar se o token é válido
      const isValidToken = await verifyPasswordResetToken(token, user.resetToken || '');
      if (!isValidToken) {
        return NextResponse.json(
          { 
            error: {
              code: 'INVALID_TOKEN',
              message: 'Token de reset inválido',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        );
      }
    }

    // Hash da nova senha
    const hashedPassword = await hashPassword(newPassword);

    if (isInvite) {
      // Transação para atualizar usuário e marcar convite como aceito
      await prisma.$transaction(async (tx) => {
        // Atualizar senha do usuário
        await tx.user.update({
          where: { id: user.id },
          data: {
            passwordHash: hashedPassword,
            updatedAt: new Date()
          }
        });

        // Marcar convite como aceito
        await tx.invite.update({
          where: { token },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date()
          }
        });
      });

      console.log('Invite accepted and password set for user:', user.email);

      return NextResponse.json(
        { 
          message: 'Convite aceito e senha definida com sucesso'
        },
        { status: 200 }
      );

    } else {
      // Atualizar senha e limpar token de reset
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          resetToken: null,
          resetTokenExpiresAt: null,
          updatedAt: new Date()
        }
      });

      console.log('Password reset successful for user:', user.email);

      return NextResponse.json(
        { 
          message: 'Senha alterada com sucesso'
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { 
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
} 