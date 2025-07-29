import { NextRequest, NextResponse } from 'next/server'
import { withTenantIsolation } from '@/lib/middleware/tenant'
import { TicketService } from '@/lib/services/ticketService'
import { SessionService } from '@/lib/services/sessionService'
import { TicketStatus, Priority } from '@prisma/client'
import i18next from '@/i18n/server'
import { TenantContext } from '@/lib/middleware/tenant'

/**
 * GET /api/tickets/[id]
 * Busca um ticket específico
 */
async function getTicket(req: NextRequest, context: TenantContext) {
  try {
    const ticketId = req.nextUrl.pathname.split('/')[3]

    // Verificar se o ticket existe e pertence à organização
    const ticket = await TicketService.getTicketById(ticketId, context.organizationId)
    if (!ticket) {
      return NextResponse.json(
        { 
          error: {
            code: 'TICKET_NOT_FOUND',
            message: i18next.t('api.errors.notFound'),
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: ticket
    })
  } catch (error) {
    console.error('Get ticket error:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'GET_TICKET_ERROR',
          message: i18next.t('api.errors.notFound'),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/tickets/[id]
 * Atualiza um ticket específico
 */
async function updateTicket(req: NextRequest, context: TenantContext) {
  try {
    const ticketId = req.nextUrl.pathname.split('/')[3]
    const body = await req.json()
    
    const {
      title,
      description,
      priority,
      status,
      finalEstimate,
      averageVote,
    } = body

    // Verificar se o ticket existe e pertence à organização
    const ticket = await TicketService.getTicketById(ticketId, context.organizationId)
    if (!ticket) {
      return NextResponse.json(
        { 
          error: {
            code: 'TICKET_NOT_FOUND',
            message: i18next.t('api.errors.notFound'),
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      )
    }

    // Verificar se o usuário é o criador da sessão
    const session = await SessionService.getSessionById(ticket.sessionId, context.organizationId)
    if (!session || session.createdById !== context.userId) {
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

    const updateData: any = {}
    
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) updateData.priority = Priority[priority as keyof typeof Priority]
    if (status !== undefined) updateData.status = status // Usar string diretamente
    if (finalEstimate !== undefined) updateData.finalEstimate = finalEstimate
    if (averageVote !== undefined) updateData.averageVote = averageVote

    const updatedTicket = await TicketService.updateTicket(ticketId, context.organizationId, updateData)

    // Emitir evento WebSocket
    if (updatedTicket && (global as any).io && updatedTicket.sessionId) {
      (global as any).io.to(updatedTicket.sessionId).emit("ticket_updated", { 
        sessionId: updatedTicket.sessionId, 
        ticket: updatedTicket 
      });
      
      // Se foi definida uma estimativa final, emitir evento específico
      if (finalEstimate !== undefined) {
        (global as any).io.to(updatedTicket.sessionId).emit("final_estimate_set", { 
          sessionId: updatedTicket.sessionId, 
          ticketId: ticketId, 
          finalEstimate 
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedTicket,
      message: i18next.t('api.success.ticketUpdated')
    })
  } catch (error) {
    console.error('Update ticket error:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'UPDATE_TICKET_ERROR',
          message: i18next.t('api.errors.updateTicket'),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tickets/[id]
 * Remove um ticket específico
 */
async function deleteTicket(req: NextRequest, context: TenantContext) {
  try {
    const ticketId = req.nextUrl.pathname.split('/')[3]

    // Verificar se o ticket existe e pertence à organização
    const ticket = await TicketService.getTicketById(ticketId, context.organizationId)
    if (!ticket) {
      return NextResponse.json(
        { 
          error: {
            code: 'TICKET_NOT_FOUND',
            message: i18next.t('api.errors.notFound'),
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      )
    }

    // Verificar se o usuário é o criador da sessão
    const session = await SessionService.getSessionById(ticket.sessionId, context.organizationId)
    if (!session || session.createdById !== context.userId) {
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

    await TicketService.deleteTicket(ticketId, context.organizationId)

    // Emitir evento WebSocket
    if (ticket && (global as any).io && ticket.sessionId) {
      (global as any).io.to(ticket.sessionId).emit("ticket_deleted", { 
        sessionId: ticket.sessionId, 
        ticketId: ticketId 
      });
    }

    return NextResponse.json({
      success: true,
      message: i18next.t('api.success.ticketDeleted')
    })
  } catch (error) {
    console.error('Delete ticket error:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'DELETE_TICKET_ERROR',
          message: i18next.t('api.errors.deleteTicket'),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

// Exporta as funções com middleware de tenant isolation
export const GET = withTenantIsolation(getTicket)
export const PUT = withTenantIsolation(updateTicket)
export const DELETE = withTenantIsolation(deleteTicket) 