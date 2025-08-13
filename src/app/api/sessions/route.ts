import { NextRequest, NextResponse } from 'next/server'
import { SessionService } from '@/lib/services/sessionService'
import { withTenantIsolation, TenantContext } from '@/lib/middleware/tenant'
import { SessionStatus, VotingMode } from '@prisma/client'
import i18next from 'i18next'

/**
 * GET /api/sessions - Lista sessões da organização
 */
async function listSessions(req: NextRequest, context: TenantContext) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const statusParam = searchParams.get('status')
    const status = statusParam ? (statusParam as SessionStatus) : undefined
    const search = searchParams.get('search') || undefined
    const projectId = searchParams.get('projectId') || undefined

    const result = await SessionService.listSessions(context.organizationId, {
      page,
      limit,
      status,
      search,
      projectId,
      userId: context.userId,
      userRole: context.userRole,
    })

    return NextResponse.json({
      success: true,
      data: result.sessions,
      pagination: {
        page: result.page,
        total: result.total,
        totalPages: result.totalPages,
        limit,
      }
    })
  } catch (error) {
    console.error('List sessions error:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'LIST_SESSIONS_ERROR',
          message: i18next.t('api.errors.listSessions'),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sessions - Cria uma nova sessão
 */
async function createSession(req: NextRequest, context: TenantContext) {
  try {
    const body = await req.json()
    const {
      name,
      description,
      projectId,
      votingMode,
      autoReveal,
      allowObservers,
    } = body

    if (!name) {
      return NextResponse.json(
        { 
          error: {
            code: 'NAME_REQUIRED',
            message: i18next.t('api.errors.nameRequired'),
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      )
    }

    const session = await SessionService.createSession({
      name,
      description,
      organizationId: context.organizationId,
      createdById: context.userId,
      projectId,
      votingMode: votingMode ? VotingMode[votingMode as keyof typeof VotingMode] : undefined,
      autoReveal,
      allowObservers,
    })

    // Adiciona o criador como participante
    await SessionService.addParticipant(session.id, context.userId, 'MODERATOR')

    return NextResponse.json({
      success: true,
      data: session,
      message: i18next.t('api.success.sessionCreated')
    }, { status: 201 })
  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { 
        error: {
          code: 'CREATE_SESSION_ERROR',
          message: i18next.t('api.errors.createSession'),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

// Exporta as funções com middleware de tenant isolation
export const GET = withTenantIsolation(listSessions)
export const POST = withTenantIsolation(createSession) 