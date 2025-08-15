import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPublicAccess, checkPublicAccessRateLimit, validatePublicParticipantName } from '@/lib/middleware/publicAccess';
import { generateTempParticipantToken } from '@/lib/auth/tempAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    // 1. Verificar rate limiting
    const rateLimitOk = await checkPublicAccessRateLimit(request, sessionId);
    if (!rateLimitOk) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'api.rateLimitExceeded',
            timestamp: new Date().toISOString()
          }
        },
        { status: 429 }
      );
    }

    // 2. Verificar acesso público
    const accessContext = await verifyPublicAccess(request, sessionId);
    
    if (!accessContext) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'api.sessionNotFound',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      );
    }

    // 3. Retornar informações de acesso
    return NextResponse.json({
      success: true,
      data: {
        sessionId: accessContext.sessionId,
        name: accessContext.session.name,
        description: accessContext.session.description,
        status: accessContext.session.status,

        requiresApproval: accessContext.requiresApproval,
        votingMode: accessContext.session.votingMode,
        autoReveal: accessContext.session.autoReveal,
        allowObservers: accessContext.session.allowObservers,
        currentUser: {
          isLoggedIn: accessContext.isLoggedIn,
          hasAccess: accessContext.hasAccess,
          user: accessContext.user ? {
            id: accessContext.user.id,
            name: accessContext.user.name,
            email: accessContext.user.email,
            role: accessContext.user.role
          } : null
        },
        session: {
          createdAt: accessContext.session.createdAt,
          createdBy: {
            name: accessContext.session.createdBy.name,
            email: accessContext.session.createdBy.email
          },
          participantsCount: accessContext.session.participants.length,
          publicParticipantsCount: accessContext.session.publicParticipants.length
        }
      }
    });

  } catch (error) {
    console.error('Erro ao verificar acesso público:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'api.internalError',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await request.json();
    const { name } = body;

    // 1. Verificar rate limiting
    const rateLimitOk = await checkPublicAccessRateLimit(request, sessionId);
    if (!rateLimitOk) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'api.rateLimitExceeded',
            timestamp: new Date().toISOString()
          }
        },
        { status: 429 }
      );
    }

    // 2. Verificar acesso público
    const accessContext = await verifyPublicAccess(request, sessionId);
    
    if (!accessContext) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'api.sessionNotFound',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      );
    }

    // 3. Se o usuário já tem acesso, retornar sucesso
    if (accessContext.hasAccess) {
      return NextResponse.json({
        success: true,
        data: {
          participantId: null,
          status: 'ACCESS_GRANTED',
          message: 'api.accessGranted'
        }
      });
    }

    // 4. Validar nome do participante
    const nameValidation = validatePublicParticipantName(name);
    if (!nameValidation.isValid) {
      // Traduzir a mensagem de erro
      const errorMessages: { [key: string]: string } = {
        'validation.nameRequired': 'Nome é obrigatório',
        'validation.nameTooShort': 'Nome deve ter pelo menos 2 caracteres',
        'validation.nameTooLong': 'Nome deve ter no máximo 50 caracteres',
        'validation.nameInvalidChars': 'Nome contém caracteres inválidos',
        'validation.nameNotAllowed': 'Nome não permitido'
      };

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_NAME',
            message: errorMessages[nameValidation.error!] || nameValidation.error,
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

    // 5. Verificar se já existe um participante com este nome
    const existingParticipant = await (prisma as any).publicParticipant.findFirst({
      where: {
        sessionId,
        name: name.trim(),
        status: {
          in: ['PENDING', 'APPROVED']
        }
      }
    });

    if (existingParticipant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NAME_ALREADY_EXISTS',
            message: 'api.nameAlreadyExists',
            timestamp: new Date().toISOString()
          }
        },
        { status: 409 }
      );
    }

    // 6. Verificar limite de participantes públicos
    const publicParticipantsCount = await (prisma as any).publicParticipant.count({
      where: {
        sessionId,
        status: {
          in: ['PENDING', 'APPROVED']
        }
      }
    });

    if (publicParticipantsCount >= 10) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PARTICIPANT_LIMIT_EXCEEDED',
            message: 'api.participantLimitExceeded',
            timestamp: new Date().toISOString()
          }
        },
        { status: 429 }
      );
    }

    // 7. Criar participante público
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    const publicParticipant = await (prisma as any).publicParticipant.create({
      data: {
        sessionId,
        name: name.trim(),
        ipAddress,
        userAgent,
        status: 'PENDING',
        expiresAt
      }
    });

    // 8. Log da tentativa de acesso
    console.log(`Novo participante público solicitado: ${name} para sessão ${sessionId}`, {
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });

    // 9. Gerar token temporário para o participante pendente
    const tempToken = generateTempParticipantToken(publicParticipant.id, sessionId);

    // 10. Emitir evento WebSocket para notificar o dono da sessão
    try {
      const { io } = await import('socket.io-client');
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
      
      socket.emit('public-access-request', {
        sessionId,
        participantId: publicParticipant.id,
        participantName: name
      });
      
      socket.disconnect();
    } catch (error) {
      console.error('Erro ao emitir evento WebSocket:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        participantId: publicParticipant.id,
        status: 'PENDING',
        message: 'api.participantCreated',
        expiresAt: publicParticipant.expiresAt,
        tempToken
      }
    });

  } catch (error) {
    console.error('Erro ao solicitar acesso público:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'api.internalError',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}
