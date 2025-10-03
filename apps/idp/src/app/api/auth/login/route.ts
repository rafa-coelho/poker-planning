import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

const JWT_SECRET = process.env.IDP_JWT_SECRET || 'idp-dev-secret'
const ISSUER = process.env.IDP_ISSUER || 'http://localhost:3100'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    // Validações
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: true
          },
          take: 1 // Pegar primeira organização
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Usuário inativo' },
        { status: 401 }
      )
    }

    // Verificar senha
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Usuário sem senha configurada' },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      )
    }

    // Pegar primeira membership
    const membership = user.memberships[0]

    if (!membership) {
      return NextResponse.json(
        { error: 'Usuário sem organização vinculada' },
        { status: 401 }
      )
    }

    // Gerar token JWT
    const now = Math.floor(Date.now() / 1000)
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        tenantId: membership.organization.id,
        roles: [membership.role],
        features: { hasAPI: true, hasPublicSessions: true },
        iat: now
      },
      JWT_SECRET,
      { issuer: ISSUER, expiresIn: '15m' }
    )

    const idToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        tenantId: membership.organization.id,
        iat: now
      },
      JWT_SECRET,
      { issuer: ISSUER, expiresIn: '15m' }
    )

    console.log(`[IdP] User logged in: ${email}`)

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug
      },
      tokens: {
        token_type: 'Bearer',
        access_token: accessToken,
        id_token: idToken,
        expires_in: 900
      }
    })
  } catch (error) {
    console.error('[IdP] Login error:', error)
    return NextResponse.json(
      { error: 'Erro interno ao fazer login' },
      { status: 500 }
    )
  }
}

