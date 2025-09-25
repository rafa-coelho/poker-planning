import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { APP_CONFIG } from '@/lib/config';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  // Verificar se o modo aberto está habilitado
  if (!APP_CONFIG.OPEN_MODE) {
    return NextResponse.json(
      { error: 'Modo aberto não está habilitado' },
      { status: 403 }
    );
  }

  try {
    const { sessionId } = await context.params;

    const session = await prisma.openSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: {
          where: { isActive: true },
          orderBy: { joinedAt: 'asc' }
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          include: {
            votes: {
              include: {
                participant: true
              }
            }
          }
        },
        currentTicket: {
          include: {
            votes: {
              include: {
                participant: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se a sessão expirou
    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Sessão expirada' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('Erro ao buscar sessão:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  // Verificar se o modo aberto está habilitado
  if (!APP_CONFIG.OPEN_MODE) {
    return NextResponse.json(
      { error: 'Modo aberto não está habilitado' },
      { status: 403 }
    );
  }

  try {
    const { sessionId } = await context.params;
    const body = await req.json();
    const { isRevealed, currentTicketId } = body;

    // Verificar se a sessão existe e não expirou
    const session = await prisma.openSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Sessão expirada' },
        { status: 410 }
      );
    }

    // Atualizar sessão
    const updateData: any = {};
    if (isRevealed !== undefined) updateData.isRevealed = isRevealed;
    if (currentTicketId !== undefined) updateData.currentTicketId = currentTicketId;

    const updatedSession = await prisma.openSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        participants: {
          where: { isActive: true },
          orderBy: { joinedAt: 'asc' }
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          include: {
            votes: {
              include: {
                participant: true
              }
            }
          }
        },
        currentTicket: {
          include: {
            votes: {
              include: {
                participant: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      session: updatedSession,
      message: 'Sessão atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar sessão:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  // Verificar se o modo aberto está habilitado
  if (!APP_CONFIG.OPEN_MODE) {
    return NextResponse.json(
      { error: 'Modo aberto não está habilitado' },
      { status: 403 }
    );
  }

  try {
    const { sessionId } = await context.params;

    // Verificar se a sessão existe
    const session = await prisma.openSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Deletar sessão (cascade irá deletar participantes, tickets e votos)
    await prisma.openSession.delete({
      where: { id: sessionId }
    });

    return NextResponse.json({
      success: true,
      message: 'Sessão deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar sessão:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
