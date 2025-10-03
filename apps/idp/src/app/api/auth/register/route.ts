import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

const JWT_SECRET = process.env.IDP_JWT_SECRET || 'idp-dev-secret'
const ISSUER = process.env.IDP_ISSUER || 'http://localhost:3100'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, organizationName } = body

    // Validações
    if (!name || !email || !password || !organizationName) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      )
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 12)

    // Criar organização
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)

    // Verificar se slug já existe
    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Nome de organização já existe' },
        { status: 400 }
      )
    }

    // Criar usuário, organização e membership em transação
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          isActive: true
        }
      })

      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          isActive: true
        }
      })

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'ADMIN' // Primeiro usuário é admin
        }
      })

      return { user, organization, membership }
    })

    // Gerar token JWT
    const now = Math.floor(Date.now() / 1000)
    const accessToken = jwt.sign(
      {
        sub: result.user.id,
        email: result.user.email,
        name: result.user.name,
        tenantId: result.organization.id,
        roles: [result.membership.role],
        features: { hasAPI: true, hasPublicSessions: true },
        iat: now
      },
      JWT_SECRET,
      { issuer: ISSUER, expiresIn: '15m' }
    )

    const idToken = jwt.sign(
      {
        sub: result.user.id,
        email: result.user.email,
        name: result.user.name,
        tenantId: result.organization.id,
        iat: now
      },
      JWT_SECRET,
      { issuer: ISSUER, expiresIn: '15m' }
    )

    console.log(`[IdP] User registered: ${email} (org: ${organizationName})`)

    return NextResponse.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug
      },
      tokens: {
        token_type: 'Bearer',
        access_token: accessToken,
        id_token: idToken,
        expires_in: 900
      }
    })
  } catch (error) {
    console.error('[IdP] Register error:', error)
    return NextResponse.json(
      { error: 'Erro interno ao criar conta' },
      { status: 500 }
    )
  }
}

