import { NextRequest, NextResponse } from 'next/server'
import { withOpenModeCheck, checkOpenModeRateLimit, extractClientInfo, validateOpenSessionData } from '@/lib/middleware/openMode'
import { OpenSessionService } from '@/lib/services/openSessionService'
import { VotingMode } from '@prisma/client'

/**
 * POST /api/open/sessions - Cria uma nova sessão no modo aberto
 */
async function createOpenSession(request: NextRequest) {
  try {
    // Verificar rate limiting
    const rateLimitOk = await checkOpenModeRateLimit(request)
    if (!rateLimitOk) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            timestamp: new Date().toISOString()
          }
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      votingMode,
      customCards,
      autoReveal,
      allowObservers,
      timerDuration,
      creatorName
    } = body

    // Validar dados da sessão
    const validation = validateOpenSessionData({
      name,
      description,
      creatorName
    })

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.errors.join(', '),
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      )
    }

    // Extrair informações do cliente
    const clientInfo = extractClientInfo(request)

    // Criar sessão
    const session = await OpenSessionService.createSession({
      name: name.trim(),
      description: description?.trim(),
      votingMode: votingMode ? VotingMode[votingMode as keyof typeof VotingMode] : undefined,
      customCards: customCards || [],
      autoReveal: autoReveal || false,
      allowObservers: allowObservers !== false,
      timerDuration: timerDuration,
      creatorName: creatorName.trim(),
      creatorIp: clientInfo.ipAddress,
      creatorUserAgent: clientInfo.userAgent
    })

    return NextResponse.json({
      success: true,
      data: {
        id: session.id,
        name: session.name,
        description: session.description,
        votingMode: session.votingMode,
        customCards: session.customCards,
        autoReveal: session.autoReveal,
        allowObservers: session.allowObservers,
        timerDuration: session.timerDuration,
        creatorName: session.creatorName,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt
      },
      message: 'Session created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating open session:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/open/sessions - Lista sessões abertas (limitado para evitar abuse)
 */
async function listOpenSessions(request: NextRequest) {
  try {
    // Verificar rate limiting
    const rateLimitOk = await checkOpenModeRateLimit(request)
    if (!rateLimitOk) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            timestamp: new Date().toISOString()
          }
        },
        { status: 429 }
      )
    }

    // Por segurança, não retornamos lista de sessões abertas
    // Cada sessão deve ser acessada diretamente via ID
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_ALLOWED',
          message: 'Listing open sessions is not allowed',
          timestamp: new Date().toISOString()
        }
      },
      { status: 403 }
    )

  } catch (error) {
    console.error('Error listing open sessions:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

// Exporta as funções com middleware de verificação do modo aberto
export const POST = withOpenModeCheck(createOpenSession)
export const GET = withOpenModeCheck(listOpenSessions)
