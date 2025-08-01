import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPasswordResetToken, hashPassword } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

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

    // Buscar usuário pelo token
    const user = await prisma.user.findUnique({
      where: { resetToken: token },
      include: { organization: true }
    });

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

    // Hash da nova senha
    const hashedPassword = await hashPassword(newPassword);

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