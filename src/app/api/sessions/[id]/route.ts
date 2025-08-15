import { NextRequest, NextResponse } from 'next/server'
import { withTenantIsolation } from '@/lib/middleware/tenant'
import { verifyPublicParticipantToken } from '@/lib/auth/publicAuth'
import { SessionService } from '@/lib/services/sessionService'
import { SessionStatus, VotingMode } from '@prisma/client'
import { TenantContext } from '@/lib/middleware/tenant'
import i18next from '@/i18n/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/sessions/[id]
 * Busca uma sessão específica
 */
async function getSessionTenant(req: NextRequest, context: TenantContext) {
  try {
    const sessionId = req.nextUrl.pathname.split('/')[3]

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

    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'GET_SESSION_ERROR',
          message: i18next.t('api.errors.notFound'),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/sessions/[id] - Atualiza uma sessão
 */
async function updateSession(req: NextRequest, context: TenantContext) {
  try {
    const sessionId = req.nextUrl.pathname.split('/').pop()!
    const body = await req.json()
    
    const {
      name,
      description,
      status,
      votingMode,
      autoReveal,
      allowObservers,
    } = body

    const session = await SessionService.updateSession(sessionId, context.organizationId, {
      name,
      description,
      status: status ? SessionStatus[status as keyof typeof SessionStatus] : undefined,
      votingMode: votingMode ? VotingMode[votingMode as keyof typeof VotingMode] : undefined,
      autoReveal,
      allowObservers,
    })

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

    return NextResponse.json({
      success: true,
      data: session,
      message: i18next.t('api.success.sessionUpdated')
    })
  } catch (error) {
    console.error('Update session error:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'UPDATE_SESSION_ERROR',
          message: i18next.t('api.errors.updateSession'),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sessions/[id] - Arquivar uma sessão
 */
async function archiveSession(req: NextRequest, context: TenantContext) {
  try {
    const sessionId = req.nextUrl.pathname.split('/').pop()!
    
    const session = await SessionService.archiveSession(sessionId, context.organizationId)
    
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

    return NextResponse.json({
      success: true,
      message: i18next.t('api.success.sessionArchived')
    })
  } catch (error) {
    console.error('Archive session error:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'ARCHIVE_SESSION_ERROR',
          message: i18next.t('api.errors.archiveSession'),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

// Handler autenticado (usuários internos)
const GET_TENANT = withTenantIsolation(getSessionTenant)

// Exporta GET permitindo convidados com token público
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.pathname.split('/')[3]
  const authHeader = req.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const guest = verifyPublicParticipantToken(token)
    if (guest && guest.sessionId === sessionId) {
      // Para convidados, retornamos payload seguro
      try {
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          include: {
            organization: true,
            createdBy: { select: { id: true, name: true, email: true } },
            participants: {
              where: { isActive: true },
              include: { user: { select: { id: true, name: true, email: true } } }
            },
            tickets: { select: { id: true, title: true, status: true, finalEstimate: true }, orderBy: { createdAt: 'asc' } },
            _count: { select: { participants: true, tickets: true } }
          }
        })
        if (!session) {
          return NextResponse.json(
            { error: { code: 'SESSION_NOT_FOUND', message: i18next.t('api.errors.notFound'), timestamp: new Date().toISOString() } },
            { status: 404 }
          )
        }
        const safe = {
          id: session.id,
          name: session.name,
          status: session.status,
          votingMode: session.votingMode,
          currentTicketId: session.currentTicketId,
          participants: session.participants.map((p: any) => ({
            id: p.id,
            role: p.role,
            isActive: p.isActive,
            joinedAt: p.joinedAt,
            user: { id: p.user.id, name: p.user.name, email: '' }
          })),
          tickets: session.tickets.map((t: any) => ({ id: t.id, title: t.title, status: t.status, finalEstimate: t.finalEstimate || null })),
          _count: session._count,
          createdBy: { name: session.createdBy.name, email: '' }
        }
        return NextResponse.json({ success: true, data: safe })
      } catch (error) {
        console.error('Guest GET session error:', error)
        return NextResponse.json(
          { error: { code: 'GET_SESSION_ERROR', message: i18next.t('api.errors.notFound'), timestamp: new Date().toISOString() } },
          { status: 500 }
        )
      }
    }
  }
  // Fallback para fluxo autenticado normal
  return GET_TENANT(req)
}

// Exporta as funções com middleware de tenant isolation para mutações
export const PUT = withTenantIsolation(updateSession)
export const DELETE = withTenantIsolation(archiveSession) 