import { NextRequest, NextResponse } from 'next/server'
import { planService } from '@/lib/services/planService'
import { withAuth } from '@/lib/middleware/auth'
import { prisma } from '@/lib/db'

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
    const response = await planService.getPlans()
    const allPlans = response.data || []

    const plansResponse: Record<string, unknown> = {
      plans: allPlans.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        features: plan.features,
        popular: plan.popular,
        period: plan.period,
        currency: plan.currency
      }))
    }

    // 📋 Include current plan information if requested
    if (includeCurrentPlan) {
      // Buscar o plano atual da organização
      const organization = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { plan: true }
      })
      
      if (organization?.plan) {
        const currentPlanResponse = await planService.getPlanById(organization.plan)
        if (currentPlanResponse.success && currentPlanResponse.data && currentPlanResponse.data.length > 0) {
          const currentPlan = currentPlanResponse.data[0]
          plansResponse.currentPlan = {
            id: currentPlan.id,
            name: currentPlan.name,
            description: currentPlan.description,
            price: currentPlan.price,
            features: currentPlan.features
          }
        }
      }
    }

    // 📋 Incluir planos de upgrade se solicitado
    if (includeUpgrades) {
      // Buscar o plano atual da organização
      const organization = await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { plan: true }
      })
      
      if (organization?.plan) {
        // TODO: Implementar lógica de upgrade plans
        plansResponse.upgradePlans = []
      }
    }

    return NextResponse.json(plansResponse, { status: 200 })

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
    const comparison = await Promise.all(planIds.map(async (planId) => {
      try {
        const planResponse = await planService.getPlanById(planId as string)
        if (planResponse.success && planResponse.data && planResponse.data.length > 0) {
          const plan = planResponse.data[0]
          return {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            features: plan.features,
            popular: plan.popular,
            period: plan.period,
            currency: plan.currency
          }
        } else {
          return {
            id: planId,
            error: 'Plano não encontrado'
          }
        }
      } catch (error) {
        return {
          id: planId,
          error: 'Plano não encontrado'
        }
      }
    }))

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