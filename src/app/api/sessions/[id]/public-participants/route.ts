import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withTenantIsolation, TenantContext } from '@/lib/middleware/tenant';

async function listPublicParticipants(req: NextRequest, context: TenantContext) {
  try {
    const sessionId = req.nextUrl.pathname.split('/')[3]; // Extract sessionId from URL

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

    // Listar participantes públicos
    const publicParticipants = await (prisma as any).publicParticipant.findMany({
      where: {
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const participants = publicParticipants.map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      ipAddress: p.ipAddress,
      userAgent: p.userAgent,
      createdAt: p.createdAt,
      approvedAt: p.approvedAt,
      expiresAt: p.expiresAt,
      approver: p.approver
        ? {
            id: p.approver.id,
            name: p.approver.name,
            email: p.approver.email
          }
        : null
    }));

    // Retornar apenas a lista para simplificar consumo no front
    return NextResponse.json({
      success: true,
      data: participants
    });

  } catch (error) {
    console.error('Erro ao listar participantes públicos:', error);
    
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

export const GET = withTenantIsolation(listPublicParticipants);
