import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractTokenFromHeader } from '@nyx/auth'
import { JWTPayload, AUTH_ERRORS } from '@/types/auth'

/**
 * Interface para request autenticado
 */
export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload
}

/**
 * Cria uma resposta de erro de autenticação
 */
function createAuthErrorResponse(code: string, message: string, status: number = 401) {
  return NextResponse.json(
    { 
      error: {
        code,
        message,
        timestamp: new Date().toISOString()
      }
    },
    { status }
  )
}

/**
 * Middleware de autenticação para API routes
 * @param req Request object
 * @returns User payload ou error response
 */
export function authenticateRequest(req: NextRequest): JWTPayload | NextResponse {
  const authHeader = req.headers.get('authorization')
  
  if (!authHeader) {
    return createAuthErrorResponse(
      AUTH_ERRORS.INVALID_TOKEN,
      'Token de autenticação não fornecido'
    )
  }
  
  const token = extractTokenFromHeader(authHeader)
  
  if (!token) {
    return createAuthErrorResponse(
      AUTH_ERRORS.INVALID_TOKEN,
      'Formato de token inválido. Use: Bearer <token>'
    )
  }
  
  const payload = verifyAccessToken(token)
  
  if (!payload) {
    return createAuthErrorResponse(
      AUTH_ERRORS.TOKEN_EXPIRED,
      'Token inválido ou expirado'
    )
  }
  
  // Verificar se o usuário está ativo
  if (!payload.userId) {
    return createAuthErrorResponse(
      AUTH_ERRORS.USER_NOT_FOUND,
      'Usuário não encontrado'
    )
  }
  
  return payload
}

/**
 * Middleware que requer autenticação
 * Wrapper para API routes que precisam de autenticação
 */
export function withAuth<T extends unknown[]>(
  handler: (req: NextRequest, user: JWTPayload, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = authenticateRequest(req)
    
    if (authResult instanceof NextResponse) {
      return authResult // É um erro de autenticação
    }
    
    try {
      return await handler(req, authResult, ...args)
    } catch (error) {
      console.error('Error in authenticated route:', error)
      return NextResponse.json(
        { 
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor',
            timestamp: new Date().toISOString()
          }
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware que verifica role específico
 */
export function withRole(
  requiredRole: string | string[],
  handler: (req: NextRequest, user: JWTPayload) => Promise<NextResponse>
) {
  return withAuth(async (req: NextRequest, user: JWTPayload) => {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    
    if (!roles.includes(user.role)) {
      return createAuthErrorResponse(
        AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
        `Acesso negado. Requer role: ${roles.join(' ou ')}`,
        403
      )
    }
    
    return handler(req, user)
  })
}

/**
 * Middleware que verifica se tem acesso a uma feature específica
 */
export function withFeature(
  feature: keyof JWTPayload['features'],
  handler: (req: NextRequest, user: JWTPayload) => Promise<NextResponse>
) {
  return withAuth(async (req: NextRequest, user: JWTPayload) => {
    const hasAccess = user.features[feature] === true || user.features[feature] === -1
    
    if (!hasAccess) {
      return createAuthErrorResponse(
        AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
        `Feature '${String(feature)}' não disponível no seu plano atual`,
        403
      )
    }
    
    return handler(req, user)
  })
}

/**
 * Middleware que verifica limite de uso de uma feature
 */
export function withUsageLimit(
  feature: 'maxSessions' | 'maxParticipants',
  getCurrentUsage: (organizationId: string) => Promise<number>,
  handler: (req: NextRequest, user: JWTPayload) => Promise<NextResponse>
) {
  return withAuth(async (req: NextRequest, user: JWTPayload) => {
    const limit = user.features[feature]
    
    // Se é unlimited (-1), pular verificação
    if (limit === -1) {
      return handler(req, user)
    }
    
    try {
      const currentUsage = await getCurrentUsage(user.organizationId)
      
      if (currentUsage >= limit) {
        return createAuthErrorResponse(
          AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
          `Limite de ${feature.replace('max', '').toLowerCase()} atingido (${limit})`,
          403
        )
      }
      
      return handler(req, user)
    } catch (error) {
      console.error('Error checking usage limit:', error)
      return NextResponse.json(
        { 
          error: {
            code: 'USAGE_CHECK_ERROR',
            message: 'Erro ao verificar limite de uso',
            timestamp: new Date().toISOString()
          }
        },
        { status: 500 }
      )
    }
  })
}

/**
 * Middleware opcional de autenticação
 * Se o token for fornecido e válido, adiciona user ao request
 * Se não for fornecido ou inválido, continua sem user
 */
export function withOptionalAuth(
  handler: (req: NextRequest, user?: JWTPayload) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authHeader = req.headers.get('authorization')
    let user: JWTPayload | undefined
    
    if (authHeader) {
      const token = extractTokenFromHeader(authHeader)
      if (token) {
        user = verifyAccessToken(token) || undefined
      }
    }
    
    try {
      return await handler(req, user)
    } catch (error) {
      console.error('Error in optional auth route:', error)
      return NextResponse.json(
        { 
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Erro interno do servidor',
            timestamp: new Date().toISOString()
          }
        },
        { status: 500 }
      )
    }
  }
} 