import { Plan } from '@prisma/client'

// 🎯 Interface para Features de Plano
export interface PlanFeatures {
  maxSessions: number
  maxParticipants: number
  hasAdvancedReports: boolean
  hasCustomBranding: boolean
  hasSSO: boolean
  hasAPI: boolean
  hasPublicSessions: boolean
  hasTeamManagement: boolean
  hasProjectManagement: boolean
  hasUserManagement: boolean
  hasAuditLogs: boolean
  hasPrioritySupport: boolean
  maxTeamMembers: number
  maxProjectMembers: number
  maxStorageGB: number
  retentionDays: number
}

// 🏷️ Interface for Plan Information
export interface PlanInfo {
  id: Plan
  name: string
  description: string
  price: {
    monthly: number
    yearly: number
    currency: string
  }
  features: PlanFeatures
  isPopular?: boolean
  isEnterprise?: boolean
  trialDays: number
  maxOrganizations?: number
}

// 📋 Configuração dos Planos
// 
// IMPORTANTE: Em produção, estes dados virão de um serviço externo de billing.
// Esta configuração local é apenas para desenvolvimento e fallback.
// 
// Para migrar para serviço externo:
// 1. Configure BILLING_SERVICE_URL e BILLING_SERVICE_API_KEY no .env
// 2. O PlanService automaticamente usará o serviço externo
// 3. Esta configuração local será usada apenas como fallback
//
export const PLANS_CONFIG: Record<Plan, PlanInfo> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    description: 'Perfeito para times pequenos e experimentação',
    price: {
      monthly: 0,
      yearly: 0,
      currency: 'BRL'
    },
    features: {
      maxSessions: 5,
      maxParticipants: 10,
      hasAdvancedReports: false,
      hasCustomBranding: false,
      hasSSO: false,
      hasAPI: false,
      hasPublicSessions: true,
      hasTeamManagement: false,
      hasProjectManagement: false,
      hasUserManagement: false,
      hasAuditLogs: false,
      hasPrioritySupport: false,
      maxTeamMembers: 0,
      maxProjectMembers: 0,
      maxStorageGB: 1,
      retentionDays: 30
    },
    trialDays: 0
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    description: 'Ideal para times em crescimento',
    price: {
      monthly: 49,
      yearly: 490,
      currency: 'BRL'
    },
    features: {
      maxSessions: 50,
      maxParticipants: 50,
      hasAdvancedReports: true,
      hasCustomBranding: true,
      hasSSO: false,
      hasAPI: true,
      hasPublicSessions: true,
      hasTeamManagement: true,
      hasProjectManagement: true,
      hasUserManagement: true,
      hasAuditLogs: true,
      hasPrioritySupport: false,
      maxTeamMembers: 20,
      maxProjectMembers: 50,
      maxStorageGB: 10,
      retentionDays: 90
    },
    isPopular: true,
    trialDays: 14
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Para grandes organizações com necessidades avançadas',
    price: {
      monthly: 199,
      yearly: 1990,
      currency: 'BRL'
    },
    features: {
      maxSessions: -1, // unlimited
      maxParticipants: -1, // unlimited
      hasAdvancedReports: true,
      hasCustomBranding: true,
      hasSSO: true,
      hasAPI: true,
      hasPublicSessions: true,
      hasTeamManagement: true,
      hasProjectManagement: true,
      hasUserManagement: true,
      hasAuditLogs: true,
      hasPrioritySupport: true,
      maxTeamMembers: -1, // unlimited
      maxProjectMembers: -1, // unlimited
      maxStorageGB: 100,
      retentionDays: 365
    },
    isEnterprise: true,
    trialDays: 30
  }
}

// 📊 Interface for Current Organization Usage
export interface OrganizationUsage {
  sessionsCount: number
  participantsCount: number
  teamMembersCount: number
  projectMembersCount: number
  storageUsedGB: number
  activeUsersCount: number
}

// 🚨 Interface para Limites Atingidos
export interface LimitWarning {
  feature: keyof PlanFeatures
  current: number
  limit: number
  percentage: number
  message: string
} 