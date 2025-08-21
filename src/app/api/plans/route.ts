import { NextRequest, NextResponse } from 'next/server'
import { planService } from '@/lib/services/planService'
import { withAuth } from '@/lib/middleware/auth'

/**
 * GET /api/plans
 * Lista todos os planos disponíveis
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const url = new URL(req.url)
    const includeCurrentPlan = url.searchParams.get('includeCurrent') === 'true'
    const includeUpgrades = url.searchParams.get('includeUpgrades') === 'true'

    // 📋 Obter todos os planos
    const allPlans = planService.getAllPlans()

    const response: Record<string, unknown> = {
      plans: allPlans.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        features: plan.features,
        isPopular: plan.isPopular,
        isEnterprise: plan.isEnterprise,
        trialDays: plan.trialDays
      }))
    }

    // 📋 Include current plan information if requested
    if (includeCurrentPlan) {
      const currentPlan = planService.getPlanInfo(user.organizationId as string)
      response.currentPlan = {
        id: currentPlan.id,
        name: currentPlan.name,
        description: currentPlan.description,
        price: currentPlan.price,
        features: currentPlan.features
      }
    }

    // 📋 Incluir planos de upgrade se solicitado
    if (includeUpgrades) {
      const upgradePlans = planService.getUpgradePlans(user.organizationId as string)
      response.upgradePlans = upgradePlans.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        features: plan.features,
        yearlySavings: planService.calculateYearlySavings(plan.id)
      }))
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Get plans error:', error)

    return NextResponse.json(
      {
        error: {
          code: 'PLANS_ERROR',
          message: 'Erro interno ao buscar planos',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
})

/**
 * POST /api/plans/compare
 * Compara planos específicos
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json()
    const { planIds } = body

    if (!planIds || !Array.isArray(planIds)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'planIds deve ser um array de IDs de planos'
          }
        },
        { status: 400 }
      )
    }

    // 📊 Comparar planos solicitados
    const comparison = planIds.map(planId => {
      try {
        const plan = planService.getPlanInfo(planId as string)
        return {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          features: plan.features,
          isPopular: plan.isPopular,
          isEnterprise: plan.isEnterprise,
          trialDays: plan.trialDays,
          yearlySavings: planService.calculateYearlySavings(plan.id)
        }
      } catch (error) {
        return {
          id: planId,
          error: 'Plano não encontrado'
        }
      }
    })

    return NextResponse.json({
      comparison,
      currentPlan: user.organizationId
    }, { status: 200 })

  } catch (error) {
    console.error('Compare plans error:', error)

    return NextResponse.json(
      {
        error: {
          code: 'COMPARE_PLANS_ERROR',
          message: 'Erro interno ao comparar planos',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}) 