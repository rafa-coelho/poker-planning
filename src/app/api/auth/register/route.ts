import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, validatePassword } from '@/lib/auth/password'
import { generateAccessToken, generateRefreshToken, generateTokenId } from '@/lib/auth/jwt'
import { RegisterRequest, RegisterResponse, AUTH_ERRORS } from '@/types/auth'
import { Plan, UserRole } from '@prisma/client'
import { emailService } from '@/lib/email/service'

/**
 * POST /api/auth/register
 * Registra um novo usuário e opcionalmente uma nova organização
 */
export async function POST(req: NextRequest) {
  try {
    const body: RegisterRequest = await req.json()
    const { name, email, password, organizationName } = body

    // Validação básica
    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.VALIDATION_ERROR,
            message: 'Nome, email e senha são obrigatórios',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      )
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.VALIDATION_ERROR,
            message: 'Email inválido',
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      )
    }

    // Validar senha
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.WEAK_PASSWORD,
            message: 'Senha não atende aos critérios de segurança',
            details: passwordValidation.errors,
            timestamp: new Date().toISOString()
          }
        },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        {
          error: {
            code: AUTH_ERRORS.EMAIL_ALREADY_EXISTS,
            message: 'Email já está em uso',
            timestamp: new Date().toISOString()
          }
        },
        { status: 409 }
      )
    }

    // Hash da senha
    const passwordHash = await hashPassword(password)

    // Criar organização e usuário em transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar organização
      const orgName = organizationName || `${name}'s Organization`
      const orgSlug = orgName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        
      // Garantir que o slug seja único
      let finalSlug = orgSlug
      let counter = 1
      while (true) {
        const existingOrg = await tx.organization.findUnique({
          where: { slug: finalSlug }
        })
        if (!existingOrg) break
        finalSlug = `${orgSlug}-${counter}`
        counter++
      }

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: finalSlug,
          plan: Plan.FREE,
          settings: {
            allowGuestUsers: false,
            defaultVotingMode: 'FIBONACCI',
            sessionTimeout: 3600
          }
        }
      })

      // Criar usuário como admin da organização
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          passwordHash,
          role: UserRole.ADMIN, // Primeiro usuário é sempre admin
          organizationId: organization.id,
          locale: 'pt',
          timezone: 'America/Sao_Paulo'
        }
      })

      return { user, organization }
    })

    // Gerar tokens
    const tokenId = generateTokenId()
    const accessToken = generateAccessToken(result.user, result.organization, false)
    const refreshToken = generateRefreshToken(result.user.id, result.organization.id, tokenId)

    // Atualizar lastLoginAt
    await prisma.user.update({
      where: { id: result.user.id },
      data: { lastLoginAt: new Date() }
    })

    // Enviar email de boas-vindas (não bloquear se falhar)
    if (emailService.isConfigured()) {
      try {
        await emailService.sendWelcomeEmail(result.user.email, result.user.name)
        console.log('Welcome email sent to:', result.user.email)
      } catch (error) {
        console.error('Failed to send welcome email:', error)
        // Não falhar o registro se o email falhar
      }
    }

    const response: RegisterResponse = {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        organizationId: result.organization.id,
        organizationSlug: result.organization.slug
      },
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutos
      message: 'Usuário registrado com sucesso'
    }

    // Log de auditoria
    console.log(`User registered: ${result.user.email} for organization: ${result.organization.name}`)

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'REGISTRATION_ERROR',
          message: 'Erro interno durante o registro',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
} 