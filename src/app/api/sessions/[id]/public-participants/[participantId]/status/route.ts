import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPublicParticipantToken } from '@/lib/auth/publicAuth';
import { verifyTempParticipantToken } from '@/lib/auth/tempAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; participantId: string } }
) {
  try {
    const sessionId = params.id;
    const participantId = params.participantId;

    // Buscar o participante público primeiro
    const participant = await (prisma as any).publicParticipant.findFirst({
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

    // Verificar autenticação baseada no status
    const authHeader = request.headers.get('authorization');
    
    if (participant.status === 'APPROVED') {
      // Para participantes aprovados, verificar token público
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Token de autenticação necessário para participantes aprovados',
              timestamp: new Date().toISOString()
            }
          },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const publicParticipant = verifyPublicParticipantToken(token);
      
      if (!publicParticipant || publicParticipant.participantId !== participantId) {
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
    } else if (participant.status === 'PENDING') {
      // Para participantes pendentes, verificar token temporário
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Token temporário necessário para participantes pendentes',
              timestamp: new Date().toISOString()
            }
          },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const tempParticipant = verifyTempParticipantToken(token);
      
      if (!tempParticipant || tempParticipant.participantId !== participantId) {
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
        } : null
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
