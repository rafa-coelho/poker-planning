import { NextRequest, NextResponse } from 'next/server'
import { withTenantIsolation } from '@/lib/middleware/tenant'
import { SessionService } from '@/lib/services/sessionService'
import { SessionStatus, VotingMode } from '@prisma/client'
import { TenantContext } from '@/lib/middleware/tenant'
import i18next from '@/i18n/server'

/**
 * GET /api/sessions/[id]
 * Busca uma sessão específica
 */
async function getSession(req: NextRequest, context: TenantContext) {
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

    return NextResponse.json({
      success: true,
      data: session
    })
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

// Exporta as funções com middleware de tenant isolation
export const GET = withTenantIsolation(getSession)
export const PUT = withTenantIsolation(updateSession)
export const DELETE = withTenantIsolation(archiveSession) 