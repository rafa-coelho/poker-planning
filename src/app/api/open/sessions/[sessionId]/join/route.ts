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
    const { name } = body;

    // Validação básica
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a sessão existe e não expirou
    const session = await prisma.openSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: {
          where: { isActive: true }
        }
      }
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

    // Verificar se o participante já existe
    const existingParticipant = session.participants.find(
      p => p.name.toLowerCase() === name.toLowerCase()
    );

    if (existingParticipant) {
      return NextResponse.json(
        { error: 'Já existe um participante com este nome' },
        { status: 409 }
      );
    }

    // Criar novo participante
    const participant = await prisma.openSessionParticipant.create({
      data: {
        id: uuidv4(),
        sessionId,
        name: name.trim(),
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      participant,
      session: {
        id: session.id,
        name: session.name,
        description: session.description,
        votingMode: session.votingMode,
        isRevealed: session.isRevealed,
        currentTicketId: session.currentTicketId,
        participants: [...session.participants, participant]
      },
      message: 'Participante adicionado com sucesso'
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao adicionar participante:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
