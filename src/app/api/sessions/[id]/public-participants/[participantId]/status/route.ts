import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPublicParticipantToken, generatePublicParticipantToken } from '@/lib/auth/publicAuth';
import { verifyTempParticipantToken } from '@/lib/auth/tempAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const { id: sessionId, participantId } = await params;

    // Buscar o participante público primeiro
    const participant = await prisma.publicParticipant.findFirst({
      where: {
        id: participantId,
        sessionId
      },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!participant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PARTICIPANT_NOT_FOUND',
            message: 'Participante não encontrado.',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      );
    }

    // Verificar autenticação baseada no token recebido (público ou temporário)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de autenticação necessário',
            timestamp: new Date().toISOString()
          }
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    const publicParticipantToken = verifyPublicParticipantToken(token);
    const tempParticipantToken = publicParticipantToken ? null : verifyTempParticipantToken(token);

    if (publicParticipantToken) {
      if (publicParticipantToken.participantId !== participantId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Token inválido ou não autorizado para este participante',
              timestamp: new Date().toISOString()
            }
          },
          { status: 401 }
        );
      }
    } else if (tempParticipantToken) {
      if (tempParticipantToken.participantId !== participantId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Token temporário inválido ou não autorizado para este participante',
              timestamp: new Date().toISOString()
            }
          },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token inválido ou não autorizado',
            timestamp: new Date().toISOString()
          }
        },
        { status: 401 }
      );
    }

    // Se o participante foi aprovado e o cliente ainda está usando um token temporário,
    // emitir um authToken público para que ele possa continuar autenticado
    let authToken: string | null = null;
    if (participant.status === 'APPROVED' && tempParticipantToken) {
      authToken = generatePublicParticipantToken(participant.id, sessionId, participant.name);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: participant.id,
        name: participant.name,
        status: participant.status,
        ipAddress: participant.ipAddress,
        userAgent: participant.userAgent,
        createdAt: participant.createdAt,
        approvedAt: participant.approvedAt,
        expiresAt: participant.expiresAt,
        approver: participant.approver ? {
          id: participant.approver.id,
          name: participant.approver.name,
          email: participant.approver.email
        } : null,
        authToken
      }
    });

  } catch (error) {
    console.error('Erro ao buscar status do participante público:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor.',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}
