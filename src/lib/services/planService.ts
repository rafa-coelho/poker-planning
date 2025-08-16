import { Plan } from '@prisma/client'
import {
  PlanFeatures,
  PlanInfo,
  OrganizationUsage,
  LimitWarning,
  PLANS_CONFIG
} from '@/lib/config/plans'
import { APP_CONFIG } from '@/lib/config'

/**
 * 🎯 Serviço Centralizado de Planos
 * 
 * Este serviço centraliza toda a lógica de planos e features.
 * Preparado para migração futura para serviço externo de billing.
 */
export class PlanService {
  private static instance: PlanService

  // 📋 Plan data - loaded from configuration or external service
  private plans: Record<Plan, PlanInfo> = PLANS_CONFIG

  private constructor() { }

  /**
   * 📦 Singleton Pattern
   */
  public static getInstance(): PlanService {
    if (!PlanService.instance) {
      PlanService.instance = new PlanService()
    }
    return PlanService.instance
  }

  /**
   * 📋 Obtém informações de um plano específico
   */
  public getPlanInfo(planId: Plan): PlanInfo {
    const plan = this.plans[planId]
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`)
    }
    return plan
  }

  /**
   * 📋 Obtém features de um plano específico
   */
  public getPlanFeatures(planId: Plan): PlanFeatures {
    return this.getPlanInfo(planId).features
  }

  /**
   * 📋 Lista todos os planos disponíveis
   */
  public getAllPlans(): PlanInfo[] {
    return Object.values(this.plans)
  }

  /**
   * 📋 Obtém planos disponíveis para upgrade
   */
  public getUpgradePlans(currentPlan: Plan): PlanInfo[] {
    const planOrder = ['FREE', 'PRO', 'ENTERPRISE']
    const currentIndex = planOrder.indexOf(currentPlan)

    return planOrder
      .slice(currentIndex + 1)
      .map(planId => this.getPlanInfo(planId as Plan))
  }

  /**
   * ✅ Verifica se uma feature está disponível no plano
   */
  public hasFeature(planId: Plan, feature: keyof PlanFeatures): boolean {
    const features = this.getPlanFeatures(planId)
    const value = features[feature]
    return value === true || (typeof value === 'number' && value > 0)
  }

  /**
   * 📊 Verifica se um limite foi atingido
   */
  public checkLimit(
    planId: Plan,
    feature: keyof PlanFeatures,
    currentUsage: number
  ): { isExceeded: boolean; limit: number; percentage: number } {
    const features = this.getPlanFeatures(planId)
    const limit = features[feature] as number

    // -1 means unlimited
    if (limit === -1) {
      return { isExceeded: false, limit: -1, percentage: 0 }
    }

    const percentage = Math.round((currentUsage / limit) * 100)
    const isExceeded = currentUsage >= limit

    return { isExceeded, limit, percentage }
  }

  /**
   * 🚨 Verifica todos os limites da organização
   */
  public checkAllLimits(
    planId: Plan,
    usage: OrganizationUsage
  ): LimitWarning[] {
    const warnings: LimitWarning[] = []
    const features = this.getPlanFeatures(planId)

    // Check sessions
    const sessionsCheck = this.checkLimit(planId, 'maxSessions', usage.sessionsCount)
    if (sessionsCheck.isExceeded) {
      warnings.push({
        feature: 'maxSessions',
        current: usage.sessionsCount,
        limit: sessionsCheck.limit,
        percentage: sessionsCheck.percentage,
        message: `SESSION_LIMIT_REACHED:${sessionsCheck.limit}`
      })
    }

    // Check participants
    const participantsCheck = this.checkLimit(planId, 'maxParticipants', usage.participantsCount)
    if (participantsCheck.isExceeded) {
      warnings.push({
        feature: 'maxParticipants',
        current: usage.participantsCount,
        limit: participantsCheck.limit,
        percentage: participantsCheck.percentage,
        message: `PARTICIPANT_LIMIT_REACHED:${participantsCheck.limit}`
      })
    }

    // Check team members
    const teamMembersCheck = this.checkLimit(planId, 'maxTeamMembers', usage.teamMembersCount)
    if (teamMembersCheck.isExceeded) {
      warnings.push({
        feature: 'maxTeamMembers',
        current: usage.teamMembersCount,
        limit: teamMembersCheck.limit,
        percentage: teamMembersCheck.percentage,
        message: `TEAM_MEMBER_LIMIT_REACHED:${teamMembersCheck.limit}`
      })
    }

    // Check project members
    const projectMembersCheck = this.checkLimit(planId, 'maxProjectMembers', usage.projectMembersCount)
    if (projectMembersCheck.isExceeded) {
      warnings.push({
        feature: 'maxProjectMembers',
        current: usage.projectMembersCount,
        limit: projectMembersCheck.limit,
        percentage: projectMembersCheck.percentage,
        message: `PROJECT_MEMBER_LIMIT_REACHED:${projectMembersCheck.limit}`
      })
    }

    return warnings
  }

  /**
   * 💰 Calcula preço com desconto anual
   */
  public calculatePrice(planId: Plan, isYearly: boolean = false): number {
    const plan = this.getPlanInfo(planId)
    return isYearly ? plan.price.yearly : plan.price.monthly
  }

  /**
   * 💰 Calcula economia do plano anual
   */
  public calculateYearlySavings(planId: Plan): number {
    const plan = this.getPlanInfo(planId)
    const monthlyTotal = plan.price.monthly * 12
    return monthlyTotal - plan.price.yearly
  }

  /**
   * 📊 Obtém estatísticas de uso para exibição
   */
  public getUsageStats(planId: Plan, usage: OrganizationUsage) {
    const features = this.getPlanFeatures(planId)

    return {
      sessions: {
        current: usage.sessionsCount,
        limit: features.maxSessions,
        percentage: features.maxSessions === -1 ? 0 : Math.round((usage.sessionsCount / features.maxSessions) * 100)
      },
      participants: {
        current: usage.participantsCount,
        limit: features.maxParticipants,
        percentage: features.maxParticipants === -1 ? 0 : Math.round((usage.participantsCount / features.maxParticipants) * 100)
      },
      teamMembers: {
        current: usage.teamMembersCount,
        limit: features.maxTeamMembers,
        percentage: features.maxTeamMembers === -1 ? 0 : Math.round((usage.teamMembersCount / features.maxTeamMembers) * 100)
      },
      projectMembers: {
        current: usage.projectMembersCount,
        limit: features.maxProjectMembers,
        percentage: features.maxProjectMembers === -1 ? 0 : Math.round((usage.projectMembersCount / features.maxProjectMembers) * 100)
      }
    }
  }

  /**
 * 🔄 Migração futura: Configurar dados de serviço externo
 * Este método será usado quando migrarmos para um serviço de billing externo
 */
  public setExternalPlanData(plans: Record<Plan, PlanInfo>): void {
    // In production, this will come from an external service
    this.plans = plans
  }

  /**
   * 🔄 Migração futura: Obter dados de serviço externo
   */
  public async fetchExternalPlanData(): Promise<Record<Plan, PlanInfo>> {
    // In production, this will make a call to the billing service
    if (APP_CONFIG.BILLING_SERVICE_URL && APP_CONFIG.BILLING_SERVICE_API_KEY) {
      try {
        const response = await fetch(`${APP_CONFIG.BILLING_SERVICE_URL}/plans`, {
          headers: {
            'Authorization': `Bearer ${APP_CONFIG.BILLING_SERVICE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const externalPlans = await response.json()
          this.plans = externalPlans
          return externalPlans
        }
      } catch (error) {
        console.error('Failed to fetch external plan data:', error)
      }
    }

    // Fallback to local config
    return this.plans
  }

  /**
   * 🔄 Migração futura: Atualizar dados de planos do serviço externo
   */
  public async refreshPlanData(): Promise<void> {
    // In production, this will fetch from external billing service
    if (APP_CONFIG.BILLING_SERVICE_URL && APP_CONFIG.BILLING_SERVICE_API_KEY) {
      try {
        const response = await fetch(`${APP_CONFIG.BILLING_SERVICE_URL}/plans`, {
          headers: {
            'Authorization': `Bearer ${APP_CONFIG.BILLING_SERVICE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const externalPlans = await response.json()
          this.plans = externalPlans
          return
        }
      } catch (error) {
        console.error('Failed to refresh plan data:', error)
      }
    }

    // Fallback to local config
    this.plans = PLANS_CONFIG
  }
}

// 📦 Export singleton instance
export const planService = PlanService.getInstance() 