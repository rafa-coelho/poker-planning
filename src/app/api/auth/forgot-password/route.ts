import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePasswordResetToken } from '@/lib/auth/password';

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

    // Gerar token de reset de senha
    const resetToken = await generatePasswordResetToken(user.id);

    // TODO: Implementar envio de e-mail
    // Por enquanto, apenas logamos o token
    console.log('Password reset token for user:', user.email, 'Token:', resetToken);

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