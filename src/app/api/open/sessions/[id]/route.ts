import { NextRequest, NextResponse } from 'next/server'
import { withOpenModeCheck, checkOpenModeRateLimit, verifyOpenSession } from '@/lib/middleware/openMode'
import { OpenSessionService } from '@/lib/services/openSessionService'

/**
 * GET /api/open/sessions/[id] - Obtém dados de uma sessão aberta
 */
async function getOpenSession(
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

    return NextResponse.json({
      success: true,
      data: {
        id: session.id,
        name: session.name,
        description: session.description,
        status: session.status,
        votingMode: session.votingMode,
        customCards: session.customCards,
        autoReveal: session.autoReveal,
        allowObservers: session.allowObservers,
        timerDuration: session.timerDuration,
        isRevealed: session.isRevealed,
        creatorName: session.creatorName,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        currentTicket: session.currentTicket ? {
          id: session.currentTicket.id,
          title: session.currentTicket.title,
          description: session.currentTicket.description,
          priority: session.currentTicket.priority,
          status: session.currentTicket.status,
          averageVote: session.currentTicket.averageVote,
          finalEstimate: session.currentTicket.finalEstimate,
          votes: session.isRevealed ? session.currentTicket.votes.map(vote => ({
            participantName: vote.participantName,
            cardValue: vote.cardValue
          })) : []
        } : null,
        participants: session.participants.map(p => ({
          id: p.id,
          name: p.name,
          joinedAt: p.joinedAt
        })),
        tickets: session.tickets.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: t.status,
          averageVote: t.averageVote,
          finalEstimate: t.finalEstimate,
          createdAt: t.createdAt,
          estimatedAt: t.estimatedAt
        })),
        stats: {
          participantsCount: session._count.participants,
          ticketsCount: session._count.tickets
        }
      }
    })

  } catch (error) {
    console.error('Error getting open session:', error)
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
 * PUT /api/open/sessions/[id] - Atualiza uma sessão aberta (apenas pelo criador)
 */
async function updateOpenSession(
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
    const { creatorName, action, ...data } = body

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

    const session = verification.session!

    // Verificar se o usuário é o criador da sessão
    if (session.creatorName !== creatorName) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Only the session creator can update the session',
            timestamp: new Date().toISOString()
          }
        },
        { status: 403 }
      )
    }

    let result: any

    // Executar ação específica
    switch (action) {
      case 'reveal_votes':
        result = await OpenSessionService.revealVotes(sessionId)
        break
      
      case 'hide_votes':
        result = await OpenSessionService.hideVotes(sessionId)
        break
      
      case 'end_session':
        result = await OpenSessionService.endSession(sessionId)
        break
      
      case 'set_current_ticket':
        if (!data.ticketId) {
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
        result = await OpenSessionService.setCurrentTicket(sessionId, data.ticketId)
        break
      
      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: 'Invalid action',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Session ${action} completed successfully`
    })

  } catch (error) {
    console.error('Error updating open session:', error)
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
export const GET = withOpenModeCheck(getOpenSession)
export const PUT = withOpenModeCheck(updateOpenSession)
