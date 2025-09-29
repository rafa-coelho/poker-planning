import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { APP_CONFIG } from '@nyx/config';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string; ticketId: string }> }
) {
  // Verificar se o modo aberto está habilitado
  if (!APP_CONFIG.OPEN_MODE) {
    return NextResponse.json(
      { error: 'Modo aberto não está habilitado' },
      { status: 403 }
    );
  }

  try {
    const { sessionId, ticketId } = await context.params;

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

    // Buscar ticket
    const ticket = await prisma.openTicket.findFirst({
      where: { 
        id: ticketId,
        sessionId 
      },
      include: {
        votes: {
          include: {
            participant: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket
    });

  } catch (error) {
    console.error('Erro ao buscar ticket:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string; ticketId: string }> }
) {
  // Verificar se o modo aberto está habilitado
  if (!APP_CONFIG.OPEN_MODE) {
    return NextResponse.json(
      { error: 'Modo aberto não está habilitado' },
      { status: 403 }
    );
  }

  try {
    const { sessionId, ticketId } = await context.params;
    const body = await req.json();
    const { title, description, finalEstimate, averageVote } = body;

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

    // Buscar ticket
    const existingTicket = await prisma.openTicket.findFirst({
      where: { 
        id: ticketId,
        sessionId 
      }
    });

    if (!existingTicket) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar ticket
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (finalEstimate !== undefined) updateData.finalEstimate = finalEstimate;
    if (averageVote !== undefined) updateData.averageVote = averageVote;

    const ticket = await prisma.openTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        votes: {
          include: {
            participant: true
          }
        }
      }
    });

    // Emitir evento WebSocket via servidor WebSocket
    try {
      const wsResponse = await fetch('http://localhost:3001/emit-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'ticket_updated',
          sessionId: sessionId,
          data: { sessionId, ticket }
        })
      });
      
      if (wsResponse.ok) {
        console.log('🎫 API: Evento ticket_updated emitido com sucesso');
      }
    } catch (error) {
      console.log('❌ API: Erro ao emitir evento ticket_updated:', error);
    }

    return NextResponse.json({
      success: true,
      ticket,
      message: 'Ticket atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar ticket:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string; ticketId: string }> }
) {
  // Verificar se o modo aberto está habilitado
  if (!APP_CONFIG.OPEN_MODE) {
    return NextResponse.json(
      { error: 'Modo aberto não está habilitado' },
      { status: 403 }
    );
  }

  try {
    const { sessionId, ticketId } = await context.params;

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

    // Verificar se o ticket existe
    const existingTicket = await prisma.openTicket.findFirst({
      where: { 
        id: ticketId,
        sessionId 
      }
    });

    if (!existingTicket) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }

    // Deletar ticket (cascade irá deletar os votos também)
    await prisma.openTicket.delete({
      where: { id: ticketId }
    });

    // Emitir evento WebSocket via servidor WebSocket
    try {
      const wsResponse = await fetch('http://localhost:3001/emit-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'ticket_deleted',
          sessionId: sessionId,
          data: { sessionId, ticketId }
        })
      });
      
      if (wsResponse.ok) {
        console.log('🎫 API: Evento ticket_deleted emitido com sucesso');
      }
    } catch (error) {
      console.log('❌ API: Erro ao emitir evento ticket_deleted:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar ticket:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
