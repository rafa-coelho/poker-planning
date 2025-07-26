import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { JWTPayload } from '@/types/auth'

export interface TenantContext {
  organizationId: string
  organizationSlug: string
  userId: string
  userRole: string
}

/**
 * Middleware para garantir isolamento de dados por organização
 * Garante que todas as queries sejam filtradas por organizationId
 */
export function withTenantIsolation(
  handler: (req: NextRequest, context: TenantContext) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      // Extrair token do header Authorization
      const authHeader = req.headers.get('authorization')
      if (!authHeader) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Token de autenticação necessário' } },
          { status: 401 }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      if (!token) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Token inválido' } },
          { status: 401 }
        )
      }

      // Verificar token e extrair dados do usuário
      const jwt = require('jsonwebtoken')
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload

      if (!decoded.organizationId) {
        return NextResponse.json(
          { error: { code: 'INVALID_TENANT', message: 'Organização não encontrada no token' } },
          { status: 400 }
        )
      }

      // Verificar se a organização existe e está ativa
      const organization = await prisma.organization.findUnique({
        where: { id: decoded.organizationId },
        select: { id: true, slug: true, isActive: true }
      })

      if (!organization) {
        return NextResponse.json(
          { error: { code: 'ORGANIZATION_NOT_FOUND', message: 'Organização não encontrada' } },
          { status: 404 }
        )
      }

      if (!organization.isActive) {
        return NextResponse.json(
          { error: { code: 'ORGANIZATION_INACTIVE', message: 'Organização inativa' } },
          { status: 403 }
        )
      }

      // Verificar se o usuário pertence à organização
      const user = await prisma.user.findFirst({
        where: {
          id: decoded.userId,
          organizationId: decoded.organizationId,
          isActive: true
        },
        select: { id: true, role: true }
      })

      if (!user) {
        return NextResponse.json(
          { error: { code: 'USER_NOT_IN_ORGANIZATION', message: 'Usuário não pertence à organização' } },
          { status: 403 }
        )
      }

      const context: TenantContext = {
        organizationId: decoded.organizationId,
        organizationSlug: organization.slug,
        userId: decoded.userId,
        userRole: user.role
      }

      return handler(req, context)
    } catch (error) {
      console.error('Tenant isolation error:', error)
      return NextResponse.json(
        { error: { code: 'TENANT_ISOLATION_ERROR', message: 'Erro no isolamento de tenant' } },
        { status: 500 }
      )
    }
  }
}

/**
 * Utility para adicionar filtros automáticos de organização em queries Prisma
 */
export function withOrganizationFilter<T extends { organizationId?: string }>(
  query: T,
  organizationId: string
): T & { organizationId: string } {
  return {
    ...query,
    organizationId
  }
}

/**
 * Verificar se o usuário tem permissão para acessar um recurso específico
 */
export function hasResourcePermission(
  resourceOrganizationId: string,
  userOrganizationId: string,
  userRole: string
): boolean {
  // Usuário só pode acessar recursos da própria organização
  if (resourceOrganizationId !== userOrganizationId) {
    return false
  }

  // Admins podem acessar tudo dentro da organização
  if (userRole === 'ADMIN') {
    return true
  }

  // Outros roles podem acessar recursos básicos
  return ['MEMBER', 'VIEWER'].includes(userRole)
}

/**
 * Middleware para validar acesso a recursos específicos
 */
export function withResourceAccess(
  resourceId: string,
  resourceType: 'session' | 'ticket' | 'project',
  handler: (req: NextRequest, context: TenantContext) => Promise<NextResponse>
) {
  return withTenantIsolation(async (req: NextRequest, context: TenantContext) => {
    try {
      // Verificar se o recurso pertence à organização do usuário
      let resource
      
      switch (resourceType) {
        case 'session':
          resource = await prisma.session.findFirst({
            where: {
              id: resourceId,
              organizationId: context.organizationId
            },
            select: { id: true, organizationId: true }
          })
          break
          
        case 'ticket':
          resource = await prisma.ticket.findFirst({
            where: {
              id: resourceId,
              session: {
                organizationId: context.organizationId
              }
            },
            select: { id: true }
          })
          break
          
        case 'project':
          resource = await prisma.project.findFirst({
            where: {
              id: resourceId,
              organizationId: context.organizationId
            },
            select: { id: true, organizationId: true }
          })
          break
          
        default:
          return NextResponse.json(
            { error: { code: 'INVALID_RESOURCE_TYPE', message: 'Tipo de recurso inválido' } },
            { status: 400 }
          )
      }

      if (!resource) {
        return NextResponse.json(
          { error: { code: 'RESOURCE_NOT_FOUND', message: 'Recurso não encontrado' } },
          { status: 404 }
        )
      }

      return handler(req, context)
    } catch (error) {
      console.error('Resource access error:', error)
      return NextResponse.json(
        { error: { code: 'RESOURCE_ACCESS_ERROR', message: 'Erro ao verificar acesso ao recurso' } },
        { status: 500 }
      )
    }
  })
} 