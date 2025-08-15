import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withTenantIsolation, TenantContext } from '@/lib/middleware/tenant';
import { generatePublicParticipantToken } from '@/lib/auth/publicAuth';

async function getPublicParticipant(req: NextRequest, context: TenantContext) {
  try {
    const sessionId = req.nextUrl.pathname.split('/')[3]; // Extract sessionId from URL
    const participantId = req.nextUrl.pathname.split('/')[5]; // Extract participantId from URL

    // Verificar se a sessão existe e pertence à organização
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        organizationId: context.organizationId
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Sessão não encontrada.',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      );
    }

    // Buscar o participante público
    const publicParticipant = await (prisma as any).publicParticipant.findFirst({
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

    if (!publicParticipant) {
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

    return NextResponse.json({
      success: true,
      data: {
        id: publicParticipant.id,
        name: publicParticipant.name,
        status: publicParticipant.status,
        ipAddress: publicParticipant.ipAddress,
        userAgent: publicParticipant.userAgent,
        createdAt: publicParticipant.createdAt,
        approvedAt: publicParticipant.approvedAt,
        expiresAt: publicParticipant.expiresAt,
        approver: publicParticipant.approver ? {
          id: publicParticipant.approver.id,
          name: publicParticipant.approver.name,
          email: publicParticipant.approver.email
        } : null
      }
    });

  } catch (error) {
    console.error('Erro ao buscar participante público:', error);
    
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

async function updatePublicParticipant(req: NextRequest, context: TenantContext) {
  try {
    const sessionId = req.nextUrl.pathname.split('/')[3]; // Extract sessionId from URL
    const participantId = req.nextUrl.pathname.split('/')[5]; // Extract participantId from URL
    const body = await req.json();
    const { action } = body; // 'APPROVE' ou 'REJECT'

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Ação inválida. Use APPROVE ou REJECT.',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

    // Verificar se a sessão existe e pertence à organização
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        organizationId: context.organizationId
      },
      include: {
        createdBy: true
      }
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Sessão não encontrada.',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      );
    }

    // Verificar se o usuário tem permissão para aprovar/rejeitar
    const canManage = 
      context.userRole === 'SUPER_ADMIN' || 
      context.userRole === 'ADMIN' || 
      session.createdById === context.userId;

    if (!canManage) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Você não tem permissão para gerenciar participantes desta sessão.',
            timestamp: new Date().toISOString()
          }
        },
        { status: 403 }
      );
    }

    // Buscar o participante público
    const publicParticipant = await (prisma as any).publicParticipant.findFirst({
      where: {
        id: participantId,
        sessionId
      }
    });

    if (!publicParticipant) {
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

    // Verificar se já não foi processado
    if (publicParticipant.status !== 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_PROCESSED',
            message: 'Este participante já foi processado.',
            timestamp: new Date().toISOString()
          }
        },
        { status: 409 }
      );
    }

    // Atualizar o status do participante
    const updateData: any = {
      status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      updatedAt: new Date()
    };

    if (action === 'APPROVE') {
      updateData.approvedBy = context.userId;
      updateData.approvedAt = new Date();
      // Extender o tempo de expiração para 2 horas após aprovação
      updateData.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    }

    const updatedParticipant = await (prisma as any).publicParticipant.update({
      where: {
        id: participantId
      },
      data: updateData,
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

    // Log da ação
    console.log(`Participante público ${action.toLowerCase()}d: ${publicParticipant.name} para sessão ${sessionId}`, {
      action,
      approver: context.userId,
      timestamp: new Date().toISOString()
    });

    // Gerar token de autenticação se aprovado
    let authToken = null;
    if (action === 'APPROVE') {
      authToken = generatePublicParticipantToken(
        updatedParticipant.id,
        sessionId,
        updatedParticipant.name
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        participantId: updatedParticipant.id,
        status: updatedParticipant.status,
        message: action === 'APPROVE' 
          ? 'Participante aprovado com sucesso.'
          : 'Participante rejeitado com sucesso.',
        authToken,
        participant: {
          id: updatedParticipant.id,
          name: updatedParticipant.name,
          status: updatedParticipant.status,
          approvedAt: updatedParticipant.approvedAt,
          expiresAt: updatedParticipant.expiresAt,
          approver: updatedParticipant.approver ? {
            id: updatedParticipant.approver.id,
            name: updatedParticipant.approver.name,
            email: updatedParticipant.approver.email
          } : null
        }
      }
    });

  } catch (error) {
    console.error('Erro ao processar participante público:', error);
    
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

export const GET = withTenantIsolation(getPublicParticipant);
export const PUT = withTenantIsolation(updatePublicParticipant);
