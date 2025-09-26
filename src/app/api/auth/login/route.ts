import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { generateAccessToken, generateRefreshToken, generateTokenId } from '@nyx/auth'
import { LoginRequest, LoginResponse, AUTH_ERRORS } from '@/types/auth'

/**
 * POST /api/auth/login
 * Autentica um usuário existente
 */
export async function POST(req: NextRequest) {
  try {
    const body: LoginRequest = await req.json()
    const { email, password } = body

    // Validação básica
    if (!email || !password) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.VALIDATION_ERROR,
            message: 'Email e senha são obrigatórios',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      )
    }

    // Buscar usuário com organização (case-insensitive para compatibilidade)
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' }
      },
      include: { organization: true }
    })

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.INVALID_CREDENTIALS,
            message: 'Email ou senha incorretos',
            timestamp: new Date().toISOString()
          }
        },
        { status: 401 }
      )
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.USER_INACTIVE,
            message: 'Usuário está inativo. Entre em contato com o administrador',
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
            message: 'Organização está inativa. Entre em contato com o suporte',
            timestamp: new Date().toISOString()
          }
        },
        { status: 403 }
      )
    }

    // Verificar senha
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.INVALID_CREDENTIALS,
            message: 'Usuário configurado para login externo. Use SSO',
            timestamp: new Date().toISOString()
          }
        },
        { status: 401 }
      )
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.INVALID_CREDENTIALS,
            message: 'Email ou senha incorretos',
            timestamp: new Date().toISOString()
          }
        },
        { status: 401 }
      )
    }

    // Verificar se deve lembrar do usuário (futuro)
    const rememberMe = req.headers.get('x-remember-me') === 'true'

    // Gerar tokens
    const tokenId = generateTokenId()
    const accessToken = await generateAccessToken(user, user.organization, rememberMe)
    const refreshToken = generateRefreshToken(user.id, user.organization.id, tokenId)

    // Atualizar lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    const response: LoginResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organization.id,
        organizationSlug: user.organization.slug,
        avatar: user.avatar || undefined,
        locale: user.locale
      },
      accessToken,
      refreshToken,
      expiresIn: rememberMe ? 30 * 24 * 60 * 60 : 15 * 60 // 30 dias ou 15 minutos
    }

    // Log de auditoria
    console.log(`User login: ${user.email} from organization: ${user.organization.name}`)

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Login error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'LOGIN_ERROR',
          message: 'Erro interno durante o login',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
} 