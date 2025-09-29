import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { APP_CONFIG } from '@nyx/config';
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
    const { ticketId, participantId, card } = body;

    // Validação básica
    if (!ticketId || !participantId || !card) {
      return NextResponse.json(
        { error: 'Ticket ID, participante ID e carta são obrigatórios' },
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

    // Verificar se o ticket existe
    const ticket = await prisma.openTicket.findFirst({
      where: { 
        id: ticketId,
        sessionId 
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o participante existe
    const participant = await prisma.openSessionParticipant.findFirst({
      where: { 
        id: participantId,
        sessionId,
        isActive: true
      }
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Participante não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se já existe um voto para este participante neste ticket
    const existingVote = await prisma.openVote.findUnique({
      where: {
        ticketId_participantId: {
          ticketId,
          participantId
        }
      }
    });

    let vote;
    if (existingVote) {
      // Atualizar voto existente
      vote = await prisma.openVote.update({
        where: { id: existingVote.id },
        data: { card },
        include: {
          participant: true
        }
      });
    } else {
      // Criar novo voto
      vote = await prisma.openVote.create({
        data: {
          id: uuidv4(),
          ticketId,
          participantId,
          card
        },
        include: {
          participant: true
        }
      });
    }

    // Atualizar carta selecionada do participante
    await prisma.openSessionParticipant.update({
      where: { id: participantId },
      data: { selectedCard: card }
    });

    return NextResponse.json({
      success: true,
      vote,
      message: 'Voto registrado com sucesso'
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao registrar voto:', error);
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
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID é obrigatório' },
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

    // Buscar votos do ticket
    const votes = await prisma.openVote.findMany({
      where: { ticketId },
      include: {
        participant: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({
      success: true,
      votes
    });

  } catch (error) {
    console.error('Erro ao buscar votos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
