import { NextRequest, NextResponse } from 'next/server'
import { planService } from '@/lib/services/planService'
import { OrganizationUsage } from '@/lib/config/plans'
import { withAuth } from '@/lib/middleware/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/plans/usage
 * Obtém estatísticas de uso da organização
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    // 📊 Calculate current organization usage
    const [
      sessionsCount,
      participantsCount,
      teamMembersCount,
      projectMembersCount,
      activeUsersCount
    ] = await Promise.all([
      // Count active sessions
      prisma.session.count({
        where: {
          organizationId: user.organizationId,
          status: 'ACTIVE'
        }
      }),
      
      // Count unique participants in active sessions
      prisma.sessionParticipant.count({
        where: {
          session: {
            organizationId: user.organizationId,
            status: 'ACTIVE'
          }
        }
      }),
      
      // Count team members
      prisma.teamMember.count({
        where: {
          team: {
            organizationId: user.organizationId
          }
        }
      }),
      
      // Count project members
      prisma.projectMember.count({
        where: {
          project: {
            organizationId: user.organizationId
          }
        }
      }),
      
      // Count active users (last login in last 30 days)
      prisma.user.count({
        where: {
          organizationId: user.organizationId,
          isActive: true,
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          }
        }
      })
    ])
    
    // 📊 Construir objeto de uso
    const usage: OrganizationUsage = {
      sessionsCount,
      participantsCount,
      teamMembersCount,
      projectMembersCount,
      storageUsedGB: 0, // TODO: Implement storage calculation
      activeUsersCount
    }
    
    // 📊 Obter estatísticas de uso (TODO: Implementar no novo planService)
    const usageStats = {
      sessions: { current: usage.sessionsCount, limit: -1, percentage: 0 },
      participants: { current: usage.participantsCount, limit: -1, percentage: 0 },
      teamMembers: { current: usage.teamMembersCount, limit: -1, percentage: 0 },
      projectMembers: { current: usage.projectMembersCount, limit: -1, percentage: 0 }
    }
    
    // 🚨 Verificar limites (TODO: Implementar no novo planService)
    const warnings: any[] = []
    
    // 📋 Obter informações do plano atual
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { plan: true }
    })
    
    const currentPlanResponse = await planService.getPlanById(organization?.plan || 'free')
    const currentPlan = currentPlanResponse.success && currentPlanResponse.data && currentPlanResponse.data.length > 0 
      ? currentPlanResponse.data[0]
      : {
          id: 'free',
          name: 'Gratuito',
          description: 'Plano gratuito',
          price: 0,
          currency: 'BRL',
          period: 'monthly',
          features: [
            { id: 'users', name: 'Até 5 usuários', description: 'Limite de usuários', included: true },
            { id: 'sessions', name: 'Sessões ilimitadas', description: 'Crie quantas sessões quiser', included: true },
            { id: 'fibonacci', name: 'Modo Fibonacci', description: 'Sequência Fibonacci para estimativas', included: true },
            { id: 'public', name: 'Sessões públicas', description: 'Convide participantes externos', included: true },
            { id: 'email_support', name: 'Suporte por email', description: 'Suporte básico por email', included: true }
          ]
        }
    // Obter planos de upgrade
    const allPlansResponse = await planService.getPlans()
    const allPlans = allPlansResponse.success && allPlansResponse.data ? allPlansResponse.data : []
    
    const planOrder = ['free', 'pro', 'enterprise']
    const currentPlanIndex = planOrder.indexOf(currentPlan.id)
    const upgradePlans = allPlans.filter(plan => {
      const planIndex = planOrder.indexOf(plan.id)
      return planIndex > currentPlanIndex
    })
    
    return NextResponse.json({
      usage,
      usageStats,
      warnings,
      currentPlan: {
        id: currentPlan.id,
        name: currentPlan.name,
        features: currentPlan.features
      },
      upgrade: upgradePlans.length > 0 ? {
        availablePlans: upgradePlans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          yearlySavings: plan.period === 'yearly' ? Math.round(plan.price * 0.2) : 0
        }))
      } : null
    }, { status: 200 })
    
  } catch (error) {
    console.error('Get usage error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'USAGE_ERROR',
          message: 'Erro interno ao buscar estatísticas de uso',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
})

/**
 * POST /api/plans/usage/check-limit
 * Verifica se uma ação específica excederia o limite
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json()
    const { feature, currentUsage, increment = 1 } = body
    
    if (!feature || typeof currentUsage !== 'number') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'feature e currentUsage são obrigatórios'
          }
        },
        { status: 400 }
      )
    }
    
    // 🎯 Verificar se a ação excederia o limite
    const newUsage = currentUsage + increment
    
    // Buscar organização e plano atual
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { plan: true }
    })
    
    const currentPlanResponse = await planService.getPlanById(organization?.plan || 'free')
    const currentPlan = currentPlanResponse.success && currentPlanResponse.data && currentPlanResponse.data.length > 0 
      ? currentPlanResponse.data[0]
      : { id: 'free', name: 'Gratuito' }
    
    // Obter planos de upgrade
    const allPlansResponse = await planService.getPlans()
    const allPlans = allPlansResponse.success && allPlansResponse.data ? allPlansResponse.data : []
    
    const planOrder = ['free', 'pro', 'enterprise']
    const currentPlanIndex = planOrder.indexOf(currentPlan.id)
    const upgradePlans = allPlans.filter(plan => {
      const planIndex = planOrder.indexOf(plan.id)
      return planIndex > currentPlanIndex
    })
    
    // Verificar limite baseado no plano atual
    const limitCheck = { isExceeded: false, limit: -1, percentage: 0 }
    if (currentPlan.id === 'free') {
      // Limites do plano gratuito
      const limits = {
        sessions: 10,
        participants: 5,
        teamMembers: 3,
        projectMembers: 5
      }
      const limit = limits[feature as keyof typeof limits] || -1
      limitCheck.limit = limit
      limitCheck.isExceeded = limit > 0 && newUsage > limit
      limitCheck.percentage = limit > 0 ? Math.round((newUsage / limit) * 100) : 0
    }
    
    return NextResponse.json({
      wouldExceed: limitCheck.isExceeded,
      currentUsage,
      newUsage,
      limit: limitCheck.limit,
      percentage: limitCheck.percentage,
      feature,
      currentPlan: {
        id: currentPlan.id,
        name: currentPlan.name
      },
      upgrade: upgradePlans.length > 0 ? {
        availablePlans: upgradePlans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          price: plan.price
        }))
      } : null
    }, { status: 200 })
    
  } catch (error) {
    console.error('Check limit error:', error)
    
    return NextResponse.json(
      {
        error: {
          code: 'CHECK_LIMIT_ERROR',
          message: 'Erro interno ao verificar limite',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}) 