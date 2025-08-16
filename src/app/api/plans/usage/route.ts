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
    
    // 📊 Obter estatísticas de uso
    const usageStats = planService.getUsageStats(user.organizationId as any, usage)
    
    // 🚨 Verificar limites
    const warnings = planService.checkAllLimits(user.organizationId as any, usage)
    
    // 📋 Obter informações do plano atual
    const currentPlan = planService.getPlanInfo(user.organizationId as any)
    const upgradePlans = planService.getUpgradePlans(user.organizationId as any)
    
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
        availablePlans: upgradePlans.map(plan => ({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          yearlySavings: planService.calculateYearlySavings(plan.id)
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
    const limitCheck = planService.checkLimit(user.organizationId as any, feature, newUsage)
    
    const currentPlan = planService.getPlanInfo(user.organizationId as any)
    const upgradePlans = planService.getUpgradePlans(user.organizationId as any)
    
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
        availablePlans: upgradePlans.map(plan => ({
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