import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePasswordResetToken, computeResetTokenDigest } from '@/lib/auth/password';
import { emailService } from '@/lib/email/service';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { 
          error: {
            code: 'EMAIL_REQUIRED',
            message: 'E-mail é obrigatório',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

    // Verificar se o email está configurado
    if (!emailService.isConfigured()) {
      console.warn('Email service not configured');
      return NextResponse.json(
        { 
          error: {
            code: 'EMAIL_NOT_CONFIGURED',
            message: 'Serviço de email não configurado',
            timestamp: new Date().toISOString()
          }
        },
        { status: 503 }
      );
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      include: { organization: true }
    });

    if (!user) {
      // Por segurança, não revelar se o usuário existe ou não
      return NextResponse.json(
        { 
          message: 'Se o e-mail existir em nossa base, você receberá um link de recuperação'
        },
        { status: 200 }
      );
    }

    // Verificar se já existe um token válido
    if (user.resetToken && user.resetTokenExpiresAt && user.resetTokenExpiresAt > new Date()) {
      return NextResponse.json(
        { 
          error: {
            code: 'RESET_TOKEN_EXISTS',
            message: 'Já existe um link de recuperação válido. Verifique seu email ou aguarde alguns minutos.',
            timestamp: new Date().toISOString()
          }
        },
        { status: 429 }
      );
    }

    // Gerar token de reset de senha
    const resetToken = await generatePasswordResetToken(user.id);

    // Persistir token (hash) e expiração (1h)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const hashed = computeResetTokenDigest(resetToken);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashed,
        resetTokenExpiresAt: expiresAt
      }
    });

    // Enviar email de reset
    const emailResult = await emailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.name
    );

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      
      // Se falhou por rate limit, retornar erro específico
      if (emailResult.error?.includes('Rate limit')) {
        return NextResponse.json(
          { 
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Muitas tentativas. Tente novamente em alguns minutos.',
              timestamp: new Date().toISOString()
            }
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { 
          error: {
            code: 'EMAIL_SEND_FAILED',
            message: 'Erro ao enviar email. Tente novamente.',
            timestamp: new Date().toISOString()
          }
        },
        { status: 500 }
      );
    }

    console.log('Password reset email sent to:', user.email);

    return NextResponse.json(
      { 
        message: 'Se o e-mail existir em nossa base, você receberá um link de recuperação'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);
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