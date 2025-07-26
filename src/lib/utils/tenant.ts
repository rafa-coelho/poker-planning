import { prisma } from '@/lib/db'
import { TenantContext } from '@/lib/middleware/tenant'

/**
 * Utility para aplicar filtros automáticos de organização em queries Prisma
 */
export class TenantQueryBuilder {
  private organizationId: string

  constructor(organizationId: string) {
    this.organizationId = organizationId
  }

  /**
   * Aplicar filtro de organização em query de sessões
   */
  sessions(additionalWhere: any = {}) {
    return {
      ...additionalWhere,
      organizationId: this.organizationId
    }
  }

  /**
   * Aplicar filtro de organização em query de tickets
   */
  tickets(additionalWhere: any = {}) {
    return {
      ...additionalWhere,
      session: {
        organizationId: this.organizationId
      }
    }
  }

  /**
   * Aplicar filtro de organização em query de projetos
   */
  projects(additionalWhere: any = {}) {
    return {
      ...additionalWhere,
      organizationId: this.organizationId
    }
  }

  /**
   * Aplicar filtro de organização em query de usuários
   */
  users(additionalWhere: any = {}) {
    return {
      ...additionalWhere,
      organizationId: this.organizationId
    }
  }

  /**
   * Aplicar filtro de organização em query de convites
   */
  invites(additionalWhere: any = {}) {
    return {
      ...additionalWhere,
      organizationId: this.organizationId
    }
  }

  /**
   * Aplicar filtro de organização em query de votos
   */
  votes(additionalWhere: any = {}) {
    return {
      ...additionalWhere,
      ticket: {
        session: {
          organizationId: this.organizationId
        }
      }
    }
  }
}

/**
 * Utility para validar se um recurso pertence à organização
 */
export async function validateResourceOwnership(
  resourceId: string,
  resourceType: 'session' | 'ticket' | 'project' | 'user',
  organizationId: string
): Promise<boolean> {
  try {
    let resource

    switch (resourceType) {
      case 'session':
        resource = await prisma.session.findFirst({
          where: {
            id: resourceId,
            organizationId
          },
          select: { id: true }
        })
        break

      case 'ticket':
        resource = await prisma.ticket.findFirst({
          where: {
            id: resourceId,
            session: {
              organizationId
            }
          },
          select: { id: true }
        })
        break

      case 'project':
        resource = await prisma.project.findFirst({
          where: {
            id: resourceId,
            organizationId
          },
          select: { id: true }
        })
        break

      case 'user':
        resource = await prisma.user.findFirst({
          where: {
            id: resourceId,
            organizationId
          },
          select: { id: true }
        })
        break

      default:
        return false
    }

    return !!resource
  } catch (error) {
    console.error('Error validating resource ownership:', error)
    return false
  }
}

/**
 * Utility para obter estatísticas da organização
 */
export async function getOrganizationStats(organizationId: string) {
  try {
    const [
      totalUsers,
      totalSessions,
      totalProjects,
      totalTickets,
      activeSessions
    ] = await Promise.all([
      prisma.user.count({
        where: { organizationId, isActive: true }
      }),
      prisma.session.count({
        where: { organizationId }
      }),
      prisma.project.count({
        where: { organizationId }
      }),
      prisma.ticket.count({
        where: {
          session: { organizationId }
        }
      }),
      prisma.session.count({
        where: {
          organizationId,
          status: 'ACTIVE'
        }
      })
    ])

    return {
      totalUsers,
      totalSessions,
      totalProjects,
      totalTickets,
      activeSessions
    }
  } catch (error) {
    console.error('Error getting organization stats:', error)
    return {
      totalUsers: 0,
      totalSessions: 0,
      totalProjects: 0,
      totalTickets: 0,
      activeSessions: 0
    }
  }
}

/**
 * Utility para verificar limites da organização
 */
export async function checkOrganizationLimits(
  organizationId: string,
  plan: string
): Promise<{
  canCreateSession: boolean
  canInviteUser: boolean
  canCreateProject: boolean
  warnings: string[]
}> {
  try {
    const stats = await getOrganizationStats(organizationId)
    const warnings: string[] = []

    // Definir limites baseados no plano
    const limits = {
      FREE: { maxUsers: 5, maxSessions: 10, maxProjects: 3 },
      PRO: { maxUsers: 25, maxSessions: 100, maxProjects: 10 },
      ENTERPRISE: { maxUsers: -1, maxSessions: -1, maxProjects: -1 } // Ilimitado
    }

    const planLimits = limits[plan as keyof typeof limits] || limits.FREE

    // Verificar se pode criar sessão
    const canCreateSession = planLimits.maxSessions === -1 || 
      stats.totalSessions < planLimits.maxSessions

    // Verificar se pode convidar usuário
    const canInviteUser = planLimits.maxUsers === -1 || 
      stats.totalUsers < planLimits.maxUsers

    // Verificar se pode criar projeto
    const canCreateProject = planLimits.maxProjects === -1 || 
      stats.totalProjects < planLimits.maxProjects

    // Adicionar warnings
    if (!canCreateSession) {
      warnings.push(`Limite de sessões atingido (${stats.totalSessions}/${planLimits.maxSessions})`)
    }

    if (!canInviteUser) {
      warnings.push(`Limite de usuários atingido (${stats.totalUsers}/${planLimits.maxUsers})`)
    }

    if (!canCreateProject) {
      warnings.push(`Limite de projetos atingido (${stats.totalProjects}/${planLimits.maxProjects})`)
    }

    return {
      canCreateSession,
      canInviteUser,
      canCreateProject,
      warnings
    }
  } catch (error) {
    console.error('Error checking organization limits:', error)
    return {
      canCreateSession: false,
      canInviteUser: false,
      canCreateProject: false,
      warnings: ['Erro ao verificar limites da organização']
    }
  }
}

/**
 * Utility para obter contexto completo da organização
 */
export async function getOrganizationContext(organizationId: string) {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            lastLoginAt: true
          }
        }
      }
    })

    if (!organization) {
      throw new Error('Organization not found')
    }

    const stats = await getOrganizationStats(organizationId)
    const limits = await checkOrganizationLimits(organizationId, organization.plan)

    return {
      organization,
      stats,
      limits
    }
  } catch (error) {
    console.error('Error getting organization context:', error)
    throw error
  }
}

/**
 * Utility para criar query builder com contexto de tenant
 */
export function createTenantQueryBuilder(context: TenantContext): TenantQueryBuilder {
  return new TenantQueryBuilder(context.organizationId)
} 