import { NextRequest, NextResponse } from 'next/server'
import { APP_CONFIG } from '@/lib/config'
import { OpenSessionService } from '@/lib/services/openSessionService'

/**
 * Middleware para verificar se o modo aberto está habilitado
 */
export function withOpenModeCheck<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T) => {
    if (!APP_CONFIG.OPEN_MODE_ENABLED) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OPEN_MODE_DISABLED',
            message: 'Open mode is not enabled',
            timestamp: new Date().toISOString()
          }
        },
        { status: 403 }
      )
    }

    return handler(request, ...args)
  }
}

/**
 * Middleware para rate limiting específico do modo aberto
 */
export async function checkOpenModeRateLimit(
  request: NextRequest,
  identifier?: string
): Promise<boolean> {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'

  const key = identifier || ipAddress
  
  // Implementação simples de rate limiting
  // Em produção, usar Redis ou similar
  const now = Date.now()
  const windowMs = 60000 // 1 minuto
  const maxRequests = 30 // 30 requests por minuto

  // TODO: Implementar rate limiting real com Redis
  // Por enquanto, sempre retorna true
  return true
}

/**
 * Extrai informações do cliente da requisição
 */
export function extractClientInfo(request: NextRequest) {
  return {
    ipAddress: request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }
}

/**
 * Valida dados básicos de uma sessão aberta
 */
export function validateOpenSessionData(data: any) {
  const errors: string[] = []

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Session name is required')
  }

  if (data.name && data.name.trim().length > 100) {
    errors.push('Session name must be less than 100 characters')
  }

  if (data.description && typeof data.description === 'string' && data.description.length > 500) {
    errors.push('Session description must be less than 500 characters')
  }

  if (data.creatorName && typeof data.creatorName !== 'string' || data.creatorName?.trim().length === 0) {
    errors.push('Creator name is required')
  }

  if (data.creatorName && data.creatorName.trim().length > 50) {
    errors.push('Creator name must be less than 50 characters')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Valida dados de um participante
 */
export function validateParticipantData(data: any) {
  const errors: string[] = []

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Participant name is required')
  }

  if (data.name && data.name.trim().length > 50) {
    errors.push('Participant name must be less than 50 characters')
  }

  // Verificar caracteres especiais ou inapropriados
  const nameRegex = /^[a-zA-Z0-9\s\-_\.]+$/
  if (data.name && !nameRegex.test(data.name.trim())) {
    errors.push('Participant name contains invalid characters')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Valida dados de um ticket
 */
export function validateTicketData(data: any) {
  const errors: string[] = []

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Ticket title is required')
  }

  if (data.title && data.title.trim().length > 200) {
    errors.push('Ticket title must be less than 200 characters')
  }

  if (data.description && typeof data.description === 'string' && data.description.length > 1000) {
    errors.push('Ticket description must be less than 1000 characters')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Valida dados de um voto
 */
export function validateVoteData(data: any) {
  const errors: string[] = []

  if (!data.participantName || typeof data.participantName !== 'string' || data.participantName.trim().length === 0) {
    errors.push('Participant name is required')
  }

  if (!data.cardValue || typeof data.cardValue !== 'string' || data.cardValue.trim().length === 0) {
    errors.push('Card value is required')
  }

  if (data.cardValue && data.cardValue.trim().length > 10) {
    errors.push('Card value must be less than 10 characters')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Verifica se uma sessão aberta existe e está ativa
 */
export async function verifyOpenSession(sessionId: string) {
  try {
    const session = await OpenSessionService.getSessionById(sessionId)
    
    if (!session) {
      return {
        exists: false,
        session: null,
        error: 'Session not found'
      }
    }

    if (session.status !== 'ACTIVE') {
      return {
        exists: true,
        session,
        error: 'Session is not active'
      }
    }

    if (session.expiresAt < new Date()) {
      return {
        exists: true,
        session,
        error: 'Session has expired'
      }
    }

    return {
      exists: true,
      session,
      error: null
    }
  } catch (error) {
    console.error('Error verifying open session:', error)
    return {
      exists: false,
      session: null,
      error: 'Internal server error'
    }
  }
}
