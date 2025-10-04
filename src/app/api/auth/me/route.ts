import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { prisma } from '@/lib/db'
import { UserProfile } from '@/types/auth'
import { Prisma } from '@prisma/client'
import { APP_CONFIG } from '@/lib/config'

/**
 * GET /api/auth/me
 * Retorna informações do usuário autenticado
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    // Buscar dados atualizados do usuário
    const isExternalIdp = APP_CONFIG.USE_EXTERNAL_IDP;
    const where: Prisma.UserWhereUniqueInput = isExternalIdp ? { externalId: user.userId } : { id: user.userId };
    const userData = await prisma.user.findUnique({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            logoUrl: true
          }
        }
      }
    })

    if (!userData) {
      return NextResponse.json(
        {
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Usuário não encontrado',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      )
    }

    if (!userData.organization) {
      return NextResponse.json(
        {
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organização do usuário não encontrada',
            timestamp: new Date().toISOString()
          }
        },
        { status: 404 }
      )
    }

    const profile: UserProfile = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      organizationId: userData.organizationId,
      organizationSlug: userData.organization.slug,
      avatar: userData.avatar || undefined,
      locale: userData.locale,
      timezone: userData.timezone,
      isActive: userData.isActive,
      lastLoginAt: userData.lastLoginAt || undefined,
      createdAt: userData.createdAt
    }

    return NextResponse.json({
      user: profile,
      organization: {
        id: userData.organization.id,
        name: userData.organization.name,
        slug: userData.organization.slug,
        plan: userData.organization.plan,
        logoUrl: userData.organization.logoUrl
      },
      permissions: user.features // Features do JWT
    }, { status: 200 })

  } catch (error) {
    console.error('Get user profile error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'PROFILE_ERROR',
          message: 'Erro interno ao buscar perfil do usuário',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
})

/**
 * PATCH /api/auth/me
 * Atualiza informações do perfil do usuário
 */
export const PATCH = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json()
    const { name, avatar, locale, timezone } = body

    // Validar dados
    const updateData: {
      name?: string;
      avatar?: string | null;
      locale?: string;
      timezone?: string;
    } = {}
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Nome deve ter pelo menos 2 caracteres',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (avatar !== undefined) {
      if (avatar && typeof avatar !== 'string') {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Avatar deve ser uma URL válida',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        )
      }
      updateData.avatar = avatar
    }

    if (locale !== undefined) {
      const allowedLocales = ['pt', 'en']
      if (!allowedLocales.includes(locale)) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Locale deve ser pt ou en',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        )
      }
      updateData.locale = locale
    }

    if (timezone !== undefined) {
      if (typeof timezone !== 'string') {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Timezone deve ser uma string válida',
              timestamp: new Date().toISOString()
            }
          },
          { status: 400 }
        )
      }
      updateData.timezone = timezone
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: user.userId },
      data: updateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            logoUrl: true
          }
        }
      }
    })

    const profile: UserProfile = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      organizationId: updatedUser.organizationId,
      organizationSlug: updatedUser.organization.slug,
      avatar: updatedUser.avatar || undefined,
      locale: updatedUser.locale,
      timezone: updatedUser.timezone,
      isActive: updatedUser.isActive,
      lastLoginAt: updatedUser.lastLoginAt || undefined,
      createdAt: updatedUser.createdAt
    }

    // Log de auditoria
    console.log(`User profile updated: ${updatedUser.email}`)

    return NextResponse.json({
      user: profile,
      message: 'Perfil atualizado com sucesso'
    }, { status: 200 })

  } catch (error) {
    console.error('Update user profile error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'UPDATE_PROFILE_ERROR',
          message: 'Erro interno ao atualizar perfil',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}) 