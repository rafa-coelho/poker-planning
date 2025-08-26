import { NextRequest, NextResponse } from 'next/server'
import { withOpenModeCheck, checkOpenModeRateLimit, extractClientInfo, validateParticipantData, verifyOpenSession } from '@/lib/middleware/openMode'
import { OpenSessionService } from '@/lib/services/openSessionService'

/**
 * POST /api/open/sessions/[id]/join - Entra em uma sessão aberta
 */
async function joinOpenSession(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

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
    const { name } = body

    // Validar dados do participante
    const validation = validateParticipantData({ name })
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

    // Verificar se a sessão existe e está ativa
    const verification = await verifyOpenSession(sessionId)
    
    if (!verification.exists) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      )
    }

    if (verification.error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_INACTIVE',
            message: verification.error,
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      )
    }

    const session = verification.session!

    // Verificar limite de participantes
    if (session._count.participants >= 50) { // Limite hardcoded por enquanto
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_FULL',
            message: 'Session has reached maximum number of participants',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      )
    }

    // Extrair informações do cliente
    const clientInfo = extractClientInfo(request)

    try {
      // Adicionar participante à sessão
      const participant = await OpenSessionService.addParticipant(
        sessionId,
        name.trim(),
        clientInfo.ipAddress,
        clientInfo.userAgent
      )

      return NextResponse.json({
        success: true,
        data: {
          participantId: participant.id,
          name: participant.name,
          sessionId: sessionId,
          joinedAt: participant.joinedAt
        },
        message: 'Successfully joined the session'
      })

    } catch (error: any) {
      // Verificar se é erro de nome duplicado
      if (error.code === 'P2002') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NAME_ALREADY_EXISTS',
              message: 'A participant with this name already exists in the session',
              timestamp: new Date().toISOString()
            }
          },
          { status: 409 }
        )
      }

      throw error
    }

  } catch (error) {
    console.error('Error joining open session:', error)
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
 * DELETE /api/open/sessions/[id]/join - Sai de uma sessão aberta
 */
async function leaveOpenSession(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

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
    const { name } = body

    // Validar dados do participante
    const validation = validateParticipantData({ name })
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

    // Verificar se a sessão existe e está ativa
    const verification = await verifyOpenSession(sessionId)
    
    if (!verification.exists || verification.error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found or inactive',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      )
    }

    // Remover participante da sessão
    await OpenSessionService.removeParticipant(sessionId, name.trim())

    return NextResponse.json({
      success: true,
      data: {
        sessionId: sessionId,
        participantName: name.trim()
      },
      message: 'Successfully left the session'
    })

  } catch (error) {
    console.error('Error leaving open session:', error)
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
export const POST = withOpenModeCheck(joinOpenSession)
export const DELETE = withOpenModeCheck(leaveOpenSession)
