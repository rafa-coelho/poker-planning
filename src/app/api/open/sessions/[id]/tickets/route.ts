import { NextRequest, NextResponse } from 'next/server'
import { withOpenModeCheck, checkOpenModeRateLimit, validateTicketData, verifyOpenSession } from '@/lib/middleware/openMode'
import { OpenSessionService } from '@/lib/services/openSessionService'
import { Priority } from '@prisma/client'

/**
 * POST /api/open/sessions/[id]/tickets - Cria um novo ticket
 */
async function createTicket(
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
    const { title, description, priority, creatorName } = body

    // Validar dados do ticket
    const validation = validateTicketData({ title, description })
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

    // Verificar se o usuário é o criador da sessão
    if (session.creatorName !== creatorName) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Only the session creator can create tickets',
            timestamp: new Date().toISOString()
          }
        },
        { status: 403 }
      )
    }

    // Criar ticket
    const ticket = await OpenSessionService.createTicket(sessionId, {
      title: title.trim(),
      description: description?.trim(),
      priority: priority ? Priority[priority as keyof typeof Priority] : undefined
    })

    return NextResponse.json({
      success: true,
      data: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        sessionId: ticket.sessionId,
        createdAt: ticket.createdAt
      },
      message: 'Ticket created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating ticket:', error)
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
 * PUT /api/open/sessions/[id]/tickets - Atualiza um ticket
 */
async function updateTicket(
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
    const { ticketId, title, description, priority, creatorName, action, finalEstimate } = body

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
            message: 'Only the session creator can update tickets',
            timestamp: new Date().toISOString()
          }
        },
        { status: 403 }
      )
    }

    // Verificar se o ticket existe na sessão
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

    let result: any

    // Executar ação específica
    switch (action) {
      case 'set_final_estimate':
        if (!finalEstimate) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'MISSING_ESTIMATE',
                message: 'Final estimate is required',
                timestamp: new Date().toISOString()
              }
            },
            { status: 400 }
          )
        }
        result = await OpenSessionService.setFinalEstimate(ticketId, finalEstimate)
        break
      
      case 'update_details':
        // Validar dados do ticket
        const validation = validateTicketData({ title, description })
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

        // Atualizar ticket usando Prisma diretamente
        const { prisma } = await import('@/lib/db')
        result = await prisma.openTicket.update({
          where: { id: ticketId },
          data: {
            title: title?.trim(),
            description: description?.trim(),
            priority: priority ? Priority[priority as keyof typeof Priority] : undefined
          }
        })
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
      message: `Ticket ${action} completed successfully`
    })

  } catch (error) {
    console.error('Error updating ticket:', error)
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
export const POST = withOpenModeCheck(createTicket)
export const PUT = withOpenModeCheck(updateTicket)
