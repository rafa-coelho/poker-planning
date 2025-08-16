import { NextRequest, NextResponse } from 'next/server'
import { JWTPayload } from '@/types/auth'
import { planService } from '@/lib/services/planService'
import { PlanFeatures } from '@/lib/config/plans'
import { verifyAccessToken } from '@/lib/auth/jwt'

// 🎯 Interface for middleware configuration
export interface PlanVerificationConfig {
  feature: keyof PlanFeatures
  requireAuth?: boolean
  customErrorMessage?: string
  redirectTo?: string
}

// 🚨 Interface para erro de plano
export interface PlanError {
  code: 'PLAN_LIMIT_EXCEEDED' | 'FEATURE_NOT_AVAILABLE' | 'UPGRADE_REQUIRED'
  message: string
  currentPlan: string
  requiredPlan?: string
  feature: keyof PlanFeatures
  usage?: {
    current: number
    limit: number
    percentage: number
  }
}

/**
 * 🎯 Middleware para verificar se o plano tem acesso a uma feature
 */
export function withPlanFeature(
  config: PlanVerificationConfig,
  handler: (req: NextRequest, user: JWTPayload) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 🔐 Check authentication if necessary
      if (config.requireAuth !== false) {
        const authHeader = req.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return NextResponse.json(
            {
              error: {
                code: 'UNAUTHORIZED',
                message: 'AUTH_TOKEN_REQUIRED'
              }
            },
            { status: 401 }
          )
        }

        const token = authHeader.substring(7)
        const user = verifyAccessToken(token)

        if (!user) {
          return NextResponse.json(
            {
              error: {
                code: 'INVALID_TOKEN',
                message: 'AUTH_TOKEN_INVALID'
              }
            },
            { status: 401 }
          )
        }

        // 🎯 Check if the feature is available in the plan
        const hasFeature = planService.hasFeature(user.organizationId as any, config.feature)

        if (!hasFeature) {
          const planInfo = planService.getPlanInfo(user.organizationId as any)
          const upgradePlans = planService.getUpgradePlans(user.organizationId as any)

          const error: PlanError = {
            code: 'FEATURE_NOT_AVAILABLE',
            message: config.customErrorMessage || `Feature "${config.feature}" not available in current plan`,
            currentPlan: planInfo.id,
            requiredPlan: upgradePlans[0]?.id,
            feature: config.feature
          }

          return NextResponse.json(
            {
              error,
              upgrade: upgradePlans.length > 0 ? {
                availablePlans: upgradePlans.map(plan => ({
                  id: plan.id,
                  name: plan.name,
                  price: plan.price,
                  features: plan.features
                }))
              } : null
            },
            { status: 403 }
          )
        }

        // ✅ Feature available, execute handler
        return handler(req, user)
      }

      // If authentication is not required, execute handler directly
      return handler(req, {} as JWTPayload)

    } catch (error) {
      console.error('Plan verification error:', error)

      return NextResponse.json(
        {
          error: {
            code: 'PLAN_VERIFICATION_ERROR',
            message: 'Erro interno na verificação de plano'
          }
        },
        { status: 500 }
      )
    }
  }
}

/**
 * 📊 Middleware para verificar limites de uso
 */
export function withUsageLimit(
  feature: keyof PlanFeatures,
  getCurrentUsage: (req: NextRequest, user: JWTPayload) => Promise<number>,
  handler: (req: NextRequest, user: JWTPayload) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 🔐 Verificar autenticação
      const authHeader = req.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Token de autenticação necessário'
            }
          },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      const user = verifyAccessToken(token)

      if (!user) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_TOKEN',
              message: 'Token de autenticação inválido'
            }
          },
          { status: 401 }
        )
      }

      // 📊 Obter uso atual
      const currentUsage = await getCurrentUsage(req, user)

      // 🎯 Verificar limite
      const limitCheck = planService.checkLimit(user.organizationId as any, feature, currentUsage)

      if (limitCheck.isExceeded) {
        const planInfo = planService.getPlanInfo(user.organizationId as any)
        const upgradePlans = planService.getUpgradePlans(user.organizationId as any)

        const error: PlanError = {
          code: 'PLAN_LIMIT_EXCEEDED',
          message: `${feature} limit reached in current plan`,
          currentPlan: planInfo.id,
          requiredPlan: upgradePlans[0]?.id,
          feature: feature,
          usage: {
            current: currentUsage,
            limit: limitCheck.limit,
            percentage: limitCheck.percentage
          }
        }

        return NextResponse.json(
          {
            error,
            upgrade: upgradePlans.length > 0 ? {
              availablePlans: upgradePlans.map(plan => ({
                id: plan.id,
                name: plan.name,
                price: plan.price,
                features: plan.features
              }))
            } : null
          },
          { status: 403 }
        )
      }

      // ✅ Limit not reached, execute handler
      return handler(req, user)

    } catch (error) {
      console.error('Usage limit verification error:', error)

      return NextResponse.json(
        {
          error: {
            code: 'USAGE_LIMIT_ERROR',
            message: 'Erro interno na verificação de limite de uso'
          }
        },
        { status: 500 }
      )
    }
  }
}

/**
 * 🚨 Middleware para verificar todos os limites da organização
 */
export function withOrganizationLimits(
  getUsage: (req: NextRequest, user: JWTPayload) => Promise<any>,
  handler: (req: NextRequest, user: JWTPayload) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 🔐 Verificar autenticação
      const authHeader = req.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Token de autenticação necessário'
            }
          },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      const user = verifyAccessToken(token)

      if (!user) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_TOKEN',
              message: 'Token de autenticação inválido'
            }
          },
          { status: 401 }
        )
      }

      // 📊 Get current organization usage
      const usage = await getUsage(req, user)

      // 🚨 Verificar todos os limites
      const warnings = planService.checkAllLimits(user.organizationId as any, usage)

      if (warnings.length > 0) {
        const planInfo = planService.getPlanInfo(user.organizationId as any)
        const upgradePlans = planService.getUpgradePlans(user.organizationId as any)

        return NextResponse.json(
          {
            warnings,
            currentPlan: planInfo.id,
            upgrade: upgradePlans.length > 0 ? {
              availablePlans: upgradePlans.map(plan => ({
                id: plan.id,
                name: plan.name,
                price: plan.price,
                features: plan.features
              }))
            } : null
          },
          { status: 200 } // 200 because it's not an error, just a warning
        )
      }

      // ✅ No limits reached, execute handler
      return handler(req, user)

    } catch (error) {
      console.error('Organization limits verification error:', error)

      return NextResponse.json(
        {
          error: {
            code: 'ORGANIZATION_LIMITS_ERROR',
            message: 'Erro interno na verificação de limites da organização'
          }
        },
        { status: 500 }
      )
    }
  }
}

/**
 * 💰 Middleware para verificar se precisa de upgrade
 */
export function withUpgradeRequired(
  requiredPlan: string,
  handler: (req: NextRequest, user: JWTPayload) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 🔐 Verificar autenticação
      const authHeader = req.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Token de autenticação necessário'
            }
          },
          { status: 401 }
        )
      }

      const token = authHeader.substring(7)
      const user = verifyAccessToken(token)

      if (!user) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_TOKEN',
              message: 'Token de autenticação inválido'
            }
          },
          { status: 401 }
        )
      }

      // 💰 Check if current plan meets requirement
      const planOrder = ['FREE', 'PRO', 'ENTERPRISE']
      const currentIndex = planOrder.indexOf(user.organizationId as any)
      const requiredIndex = planOrder.indexOf(requiredPlan)

      if (currentIndex < requiredIndex) {
        const planInfo = planService.getPlanInfo(user.organizationId as any)
        const upgradePlans = planService.getUpgradePlans(user.organizationId as any)

        const error: PlanError = {
          code: 'UPGRADE_REQUIRED',
                     message: `Upgrade to ${requiredPlan} plan or higher required`,
          currentPlan: planInfo.id,
          requiredPlan: requiredPlan,
          feature: 'maxSessions' // placeholder
        }

        return NextResponse.json(
          {
            error,
            upgrade: upgradePlans.length > 0 ? {
              availablePlans: upgradePlans.map(plan => ({
                id: plan.id,
                name: plan.name,
                price: plan.price,
                features: plan.features
              }))
            } : null
          },
          { status: 403 }
        )
      }

      // ✅ Plan adequate, execute handler
      return handler(req, user)

    } catch (error) {
      console.error('Upgrade verification error:', error)

      return NextResponse.json(
        {
          error: {
            code: 'UPGRADE_VERIFICATION_ERROR',
            message: 'Erro interno na verificação de upgrade'
          }
        },
        { status: 500 }
      )
    }
  }
} 