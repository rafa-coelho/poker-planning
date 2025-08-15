import { createContext, useContext, ReactNode } from 'react'
import { TenantContext } from '@/lib/middleware/tenant'

export interface OrganizationContext extends TenantContext {
  // Dados da organização
  organization: {
    id: string
    name: string
    slug: string
    plan: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }
  
  // Permissões do usuário
  permissions: {
    canCreateSessions: boolean
    canManageUsers: boolean
    canViewReports: boolean
    canManageProjects: boolean
    canInviteUsers: boolean
    canDeleteData: boolean
  }
  
  // Limites baseados no plano
  limits: {
    maxUsers: number
    maxSessions: number
    maxProjects: number
    maxTicketsPerSession: number
    retentionDays: number
  }
  
  // Features disponíveis
  features: {
    realTimeVoting: boolean
    multipleVotingModes: boolean
    advancedReports: boolean
    teamManagement: boolean
    apiAccess: boolean
    customBranding: boolean
  }
}

const OrganizationContext = createContext<OrganizationContext | null>(null)

export function OrganizationProvider({ 
  children, 
  value 
}: { 
  children: ReactNode
  value: OrganizationContext 
}) {
  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization deve ser usado dentro de OrganizationProvider')
  }
  return context
}

/**
 * Hook para verificar se o usuário tem uma permissão específica
 */
export function usePermission(permission: keyof OrganizationContext['permissions']) {
  const { permissions } = useOrganization()
  return permissions[permission]
}

/**
 * Hook para verificar se uma feature está disponível
 */
export function useFeature(feature: keyof OrganizationContext['features']) {
  const { features } = useOrganization()
  return features[feature]
}

/**
 * Hook para verificar limites de uso
 */
export function useLimits() {
  const { limits } = useOrganization()
  return limits
}

/**
 * Utility para calcular se um limite foi atingido
 */
export function isLimitReached(
  currentUsage: number,
  limit: number
): boolean {
  return currentUsage >= limit
}

/**
 * Utility para calcular porcentagem de uso
 */
export function getUsagePercentage(
  currentUsage: number,
  limit: number
): number {
  if (limit === 0) return 0
  return Math.min((currentUsage / limit) * 100, 100)
}

/**
 * Utility para formatar limites de uso
 */
export function formatUsage(
  currentUsage: number,
  limit: number
): string {
  const percentage = getUsagePercentage(currentUsage, limit)
  return `${currentUsage}/${limit} (${percentage.toFixed(1)}%)`
}

/**
 * Utility para verificar se o usuário pode executar uma ação
 */
export function canPerformAction(
  action: keyof OrganizationContext['permissions'],
  context: OrganizationContext
): boolean {
  return context.permissions[action]
}

/**
 * Utility para verificar se uma feature está habilitada
 */
export function isFeatureEnabled(
  feature: keyof OrganizationContext['features'],
  context: OrganizationContext
): boolean {
  return context.features[feature]
}

/**
 * Utility para obter mensagem de erro quando limite é atingido
 */
export function getLimitErrorMessage(
  resource: string,
  limit: number
): string {
  return `Limite de ${resource} atingido (máximo: ${limit}). Faça upgrade do seu plano para aumentar os limites.`
}

/**
 * Utility para obter mensagem de erro quando feature não está disponível
 */
import { useTranslation } from 'react-i18next';

export function getFeatureErrorMessage(
  feature: string
): string {
  // Note: This function is used outside of React components
  // For now, return a generic message. In a real app, you'd use i18next.t() directly
  return `The "${feature}" feature is not available in your current plan. Upgrade to access advanced features.`
}