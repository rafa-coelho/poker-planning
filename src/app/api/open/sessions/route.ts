import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { APP_CONFIG } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  // Verificar se o modo aberto está habilitado
  if (!APP_CONFIG.OPEN_MODE) {
    return NextResponse.json(
      { error: 'Modo aberto não está habilitado' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      name,
      description,
      creatorName,
      votingMode = 'FIBONACCI',
      autoReveal = false,
      allowObservers = true,
    } = body;

    // Validação básica
    if (!name || !creatorName) {
      return NextResponse.json(
        { error: 'Nome da sessão e nome do criador são obrigatórios' },
        { status: 400 }
      );
    }

    // Gerar ID único para a sessão
    const sessionId = uuidv4();

    // Criar sessão no banco de dados (tabela temporária)
    const session = await prisma.openSession.create({
      data: {
        id: sessionId,
        name,
        description,
        votingMode,
        autoReveal,
        allowObservers,
        creatorName,
        creatorIp: req.headers.get('x-forwarded-for') || 'unknown',
        creatorUserAgent: req.headers.get('user-agent') || 'unknown',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      },
    });

    // Adicionar o criador como participante
    const participant = await prisma.openSessionParticipant.create({
      data: {
        id: uuidv4(),
        sessionId,
        name: creatorName,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      sessionId,
      session,
      participant,
      message: 'Sessão criada com sucesso'
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar sessão aberta:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Verificar se o modo aberto está habilitado
  if (!APP_CONFIG.OPEN_MODE) {
    return NextResponse.json(
      { error: 'Modo aberto não está habilitado' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'ID da sessão é obrigatório' },
        { status: 400 }
      );
    }

    const session = await prisma.openSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: {
          where: { isActive: true },
          orderBy: { joinedAt: 'asc' }
        },
        tickets: {
          orderBy: { createdAt: 'desc' }
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
    console.error('Erro ao buscar sessão aberta:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
