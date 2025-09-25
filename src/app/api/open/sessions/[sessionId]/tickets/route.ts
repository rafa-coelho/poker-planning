import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { APP_CONFIG } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
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
    const { title, description } = body;

    // Validação básica
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Título do ticket é obrigatório' },
        { status: 400 }
      );
    }

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

    // Criar ticket
    const ticket = await prisma.openTicket.create({
      data: {
        id: uuidv4(),
        sessionId,
        title: title.trim(),
        description: description?.trim() || null,
      },
    });

    // Emitir evento WebSocket via servidor WebSocket
    console.log('🎫 API: Emitindo evento ticket_created via HTTP');
    try {
      const wsResponse = await fetch('http://localhost:3001/emit-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'ticket_created',
          sessionId: sessionId,
          data: { sessionId, ticket }
        })
      });
      
      if (wsResponse.ok) {
        console.log('🎫 API: Evento ticket_created emitido com sucesso');
      } else {
        console.log('❌ API: Falha ao emitir evento ticket_created');
      }
    } catch (error) {
      console.log('❌ API: Erro ao emitir evento ticket_created:', error);
    }

    return NextResponse.json({
      success: true,
      ticket,
      message: 'Ticket criado com sucesso'
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar ticket:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

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

    // Buscar tickets da sessão
    const tickets = await prisma.openTicket.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      include: {
        votes: {
          include: {
            participant: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      tickets
    });

  } catch (error) {
    console.error('Erro ao buscar tickets:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
