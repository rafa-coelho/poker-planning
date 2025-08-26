import { NextRequest, NextResponse } from 'next/server'
import { withOpenModeCheck, checkOpenModeRateLimit, extractClientInfo, validateVoteData, verifyOpenSession } from '@/lib/middleware/openMode'
import { OpenSessionService } from '@/lib/services/openSessionService'

/**
 * POST /api/open/sessions/[id]/vote - Vota em um ticket
 */
async function voteOnTicket(
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
    const { participantName, cardValue, ticketId } = body

    // Validar dados do voto
    const validation = validateVoteData({ participantName, cardValue })
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

    if (!ticketId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_TICKET_ID',
            message: 'Ticket ID is required',
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

    // Verificar se o ticket existe e pertence à sessão
    const ticket = session.tickets.find(t => t.id === ticketId)
    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TICKET_NOT_FOUND',
            message: 'Ticket not found in this session',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      )
    }

    // Verificar se o ticket é o atual
    if (session.currentTicket?.id !== ticketId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TICKET_NOT_CURRENT',
            message: 'Can only vote on the current ticket',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      )
    }

    // Verificar se o participante existe na sessão
    const participant = session.participants.find(p => p.name === participantName)
    if (!participant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PARTICIPANT_NOT_FOUND',
            message: 'Participant not found in this session',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      )
    }

    // Extrair informações do cliente
    const clientInfo = extractClientInfo(request)

    try {
      // Adicionar voto
      const vote = await OpenSessionService.addVote(ticketId, {
        participantName: participantName.trim(),
        cardValue: cardValue.trim(),
        ipAddress: clientInfo.ipAddress
      })

      // Calcular média dos votos
      const averageVote = await OpenSessionService.calculateAverageVote(ticketId)

      return NextResponse.json({
        success: true,
        data: {
          voteId: vote.id,
          participantName: vote.participantName,
          cardValue: vote.cardValue,
          ticketId: ticketId,
          averageVote: averageVote,
          createdAt: vote.createdAt
        },
        message: 'Vote recorded successfully'
      })

    } catch (error: any) {
      // Verificar se é erro de voto duplicado
      if (error.code === 'P2002') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VOTE_ALREADY_EXISTS',
              message: 'You have already voted on this ticket',
              timestamp: new Date().toISOString()
            }
          },
          { status: 409 }
        )
      }

      throw error
    }

  } catch (error) {
    console.error('Error voting on ticket:', error)
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
 * DELETE /api/open/sessions/[id]/vote - Remove um voto
 */
async function removeVote(
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
    const { participantName, ticketId } = body

    if (!participantName || !ticketId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Participant name and ticket ID are required',
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

    // Remover voto (usando Prisma diretamente)
    const { prisma } = await import('@/lib/db')
    
    await prisma.openVote.deleteMany({
      where: {
        ticketId: ticketId,
        participantName: participantName.trim()
      }
    })

    // Recalcular média dos votos
    const averageVote = await OpenSessionService.calculateAverageVote(ticketId)

    return NextResponse.json({
      success: true,
      data: {
        participantName: participantName.trim(),
        ticketId: ticketId,
        averageVote: averageVote
      },
      message: 'Vote removed successfully'
    })

  } catch (error) {
    console.error('Error removing vote:', error)
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
export const POST = withOpenModeCheck(voteOnTicket)
export const DELETE = withOpenModeCheck(removeVote)
