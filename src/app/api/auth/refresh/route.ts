import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyRefreshToken, generateAccessToken, generateRefreshToken, generateTokenId } from '@/lib/auth/jwt'
import { RefreshTokenRequest, RefreshTokenResponse, AUTH_ERRORS } from '@/types/auth'

/**
 * POST /api/auth/refresh
 * Renova access token usando refresh token válido
 */
export async function POST(req: NextRequest) {
  try {
    const body: RefreshTokenRequest = await req.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.REFRESH_TOKEN_INVALID,
            message: 'Refresh token é obrigatório',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      )
    }

    // Verificar e decodificar refresh token
    const payload = verifyRefreshToken(refreshToken)
    
    if (!payload) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.REFRESH_TOKEN_INVALID,
            message: 'Refresh token inválido ou expirado',
            timestamp: new Date().toISOString()
          }
        },
        { status: 401 }
      )
    }

    // Buscar usuário e organização
    const user = await prisma.user.findUnique({
      where: { 
        id: payload.userId 
      },
      include: {
        organization: true
      }
    })

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.USER_NOT_FOUND,
            message: 'Usuário não encontrado',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      )
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.USER_INACTIVE,
            message: 'Usuário está inativo',
            timestamp: new Date().toISOString()
          }
        },
        { status: 403 }
      )
    }

    // Verificar se organização está ativa
    if (!user.organization.isActive) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.ORGANIZATION_NOT_FOUND,
            message: 'Organização está inativa',
            timestamp: new Date().toISOString()
          }
        },
        { status: 403 }
      )
    }

    // Verificar se o usuário ainda pertence à mesma organização
    if (user.organizationId !== payload.organizationId) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.REFRESH_TOKEN_INVALID,
            message: 'Token não corresponde à organização atual do usuário',
            timestamp: new Date().toISOString()
          }
        },
        { status: 401 }
      )
    }

    // Gerar novos tokens
    const newTokenId = generateTokenId()
    const newAccessToken = generateAccessToken(user, user.organization, false)
    const newRefreshToken = generateRefreshToken(user.id, user.organization.id, newTokenId)

    // Em uma implementação futura, poderíamos:
    // 1. Invalidar o refresh token antigo (blacklist)
    // 2. Armazenar o novo refresh token no banco com expiração
    // 3. Implementar rotação de refresh tokens

    const response: RefreshTokenResponse = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60 // 15 minutos
    }

    // Log de auditoria
    console.log(`Token refreshed for user: ${user.email}`)

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Token refresh error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'REFRESH_ERROR',
          message: 'Erro interno durante a renovação do token',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
} 