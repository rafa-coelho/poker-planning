import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'

/**
 * POST /api/auth/logout
 * Invalida os tokens do usuário (logout)
 * 
 * Nota: Em uma implementação completa, deveríamos manter uma blacklist
 * de tokens invalidados ou usar um sistema de sessões no banco.
 * Por agora, o logout é "soft" - o token continuará válido até expirar,
 * mas o frontend deve remover os tokens do storage.
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    // Log de auditoria
    console.log(`User logout: ${user.email} from organization: ${user.organizationSlug}`)

    // Em uma implementação futura, poderíamos:
    // 1. Adicionar o token a uma blacklist no Redis
    // 2. Invalidar refresh tokens específicos no banco
    // 3. Registrar o logout em logs de auditoria
    
    // Por agora, retornamos sucesso e confiamos que o frontend
    // removerá os tokens do localStorage/cookies
    
    return NextResponse.json(
      {
        message: 'Logout realizado com sucesso',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Logout error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Erro interno durante o logout',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}) 