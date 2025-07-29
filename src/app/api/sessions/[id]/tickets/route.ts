import { NextRequest, NextResponse } from 'next/server'
import { withTenantIsolation } from '@/lib/middleware/tenant'
import { SessionService } from '@/lib/services/sessionService'
import { TicketService } from '@/lib/services/ticketService'
import { TicketStatus, Priority } from '@prisma/client'
import i18next from '@/i18n/server'
import { TenantContext } from '@/lib/middleware/tenant'

/**
 * GET /api/sessions/[id]/tickets
 * Lista todos os tickets de uma sessão
 */
async function listTickets(req: NextRequest, context: TenantContext) {
  try {
    const sessionId = req.nextUrl.pathname.split('/')[3] // sessions/[id]/tickets
    
    // Verificar se a sessão existe e pertence à organização
    const session = await SessionService.getSessionById(sessionId, context.organizationId)
    if (!session) {
      return NextResponse.json(
        { 
          error: {
            code: 'SESSION_NOT_FOUND',
            message: i18next.t('api.errors.notFound'),
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      )
    }

    const tickets = await TicketService.listTicketsBySession(sessionId, context.organizationId)

    return NextResponse.json({
      success: true,
      data: tickets
    })
  } catch (error) {
    console.error('List tickets error:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'LIST_TICKETS_ERROR',
          message: i18next.t('api.errors.listTickets'),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sessions/[id]/tickets
 * Cria um novo ticket na sessão
 */
async function createTicket(req: NextRequest, context: TenantContext) {
  try {
    const sessionId = req.nextUrl.pathname.split('/')[3]
    const body = await req.json()
    
    const {
      title,
      description,
      priority = 'MEDIUM',
    } = body

    if (!title) {
      return NextResponse.json(
        { 
          error: {
            code: 'TITLE_REQUIRED',
            message: i18next.t('api.errors.titleRequired'),
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      )
    }

    // Verificar se a sessão existe e pertence à organização
    const session = await SessionService.getSessionById(sessionId, context.organizationId)
    if (!session) {
      return NextResponse.json(
        { 
          error: {
            code: 'SESSION_NOT_FOUND',
            message: i18next.t('api.errors.notFound'),
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      )
    }

    // Verificar se o usuário é o criador da sessão
    if (session.createdById !== context.userId) {
      return NextResponse.json(
        { 
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: i18next.t('api.errors.insufficientPermissions'),
            timestamp: new Date().toISOString()
          }
        },
        { status: 403 }
      )
    }

    const ticket = await TicketService.createTicket({
      title,
      description,
      priority: Priority[priority as keyof typeof Priority],
      sessionId,
      organizationId: context.organizationId,
    })

    // Emitir evento WebSocket
    if ((global as any).io) {
      (global as any).io.to(sessionId).emit("ticket_created", { 
        sessionId: sessionId, 
        ticket 
      });
    }

    return NextResponse.json({
      success: true,
      data: ticket,
      message: i18next.t('api.success.ticketCreated')
    }, { status: 201 })
  } catch (error) {
    console.error('Create ticket error:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'CREATE_TICKET_ERROR',
          message: i18next.t('api.errors.createTicket'),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

// Exporta as funções com middleware de tenant isolation
export const GET = withTenantIsolation(listTickets)
export const POST = withTenantIsolation(createTicket) 