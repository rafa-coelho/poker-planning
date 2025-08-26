import { Plan } from '@prisma/client'

export interface PlanFeature {
  id: string
  name: string
  description: string
  included: boolean
}

export interface PlanPricing {
  id: string
  name: string
  price: number
  currency: string
  period: 'monthly' | 'yearly'
  description: string
  features: PlanFeature[]
  cta: string
  popular?: boolean
  externalId?: string
  externalSource?: string
}

export interface PlanServiceResponse {
  success: boolean
  data?: PlanPricing[]
  error?: string
}

class PlanService {
  private plans: PlanPricing[] = [
    {
      id: 'free',
      name: 'Gratuito',
      price: 0,
      currency: 'BRL',
      period: 'monthly',
      description: 'Perfeito para times pequenos começando',
      features: [
        { id: 'users', name: 'Até 5 usuários', description: 'Limite de usuários', included: true },
        { id: 'sessions', name: 'Sessões ilimitadas', description: 'Crie quantas sessões quiser', included: true },
        { id: 'fibonacci', name: 'Modo Fibonacci', description: 'Sequência Fibonacci para estimativas', included: true },
        { id: 'public', name: 'Sessões públicas', description: 'Convide participantes externos', included: true },
        { id: 'email_support', name: 'Suporte por email', description: 'Suporte básico por email', included: true },
        { id: 'reports', name: 'Relatórios básicos', description: 'Relatórios simples', included: false },
        { id: 'integrations', name: 'Integrações', description: 'Integração com outras ferramentas', included: false },
        { id: 'priority_support', name: 'Suporte prioritário', description: 'Suporte prioritário', included: false }
      ],
      cta: 'Começar Gratuito',
      externalId: 'plan_free_001',
      externalSource: 'internal'
    },
    {
      id: 'pro',
      name: 'Profissional',
      price: 29,
      currency: 'BRL',
      period: 'monthly',
      description: 'Para times em crescimento',
      features: [
        { id: 'users', name: 'Até 25 usuários', description: 'Limite de usuários', included: true },
        { id: 'sessions', name: 'Sessões ilimitadas', description: 'Crie quantas sessões quiser', included: true },
        { id: 'fibonacci', name: 'Modo Fibonacci', description: 'Sequência Fibonacci para estimativas', included: true },
        { id: 'public', name: 'Sessões públicas', description: 'Convide participantes externos', included: true },
        { id: 'email_support', name: 'Suporte por email', description: 'Suporte básico por email', included: true },
        { id: 'reports', name: 'Relatórios avançados', description: 'Relatórios detalhados e analytics', included: true },
        { id: 'integrations', name: 'Integração com Slack', description: 'Integração com Slack', included: true },
        { id: 'priority_support', name: 'Suporte prioritário', description: 'Suporte prioritário', included: true }
      ],
      cta: 'Começar Trial',
      popular: true,
      externalId: 'plan_pro_001',
      externalSource: 'internal'
    },
    {
      id: 'enterprise',
      name: 'Empresarial',
      price: 0, // Sob consulta
      currency: 'BRL',
      period: 'monthly',
      description: 'Para grandes organizações',
      features: [
        { id: 'users', name: 'Usuários ilimitados', description: 'Sem limite de usuários', included: true },
        { id: 'sessions', name: 'Sessões ilimitadas', description: 'Crie quantas sessões quiser', included: true },
        { id: 'fibonacci', name: 'Todos os modos de votação', description: 'Todos os modos disponíveis', included: true },
        { id: 'public', name: 'Sessões públicas', description: 'Convide participantes externos', included: true },
        { id: 'email_support', name: 'Suporte por email', description: 'Suporte básico por email', included: true },
        { id: 'reports', name: 'Relatórios avançados', description: 'Relatórios detalhados e analytics', included: true },
        { id: 'integrations', name: 'SSO e SAML', description: 'Single Sign-On e SAML', included: true },
        { id: 'priority_support', name: 'Gerente de conta dedicado', description: 'Suporte dedicado', included: true }
      ],
      cta: 'Falar com Vendas',
      externalId: 'plan_enterprise_001',
      externalSource: 'internal'
    }
  ]

  /**
   * Busca todos os planos disponíveis
   */
  async getPlans(): Promise<PlanServiceResponse> {
    try {
      // TODO: Em produção, buscar de API externa ou banco de dados
      // const response = await fetch('/api/external/plans')
      // return await response.json()
      
      return {
        success: true,
        data: this.plans
      }
    } catch (error) {
      console.error('[PlanService] Error fetching plans:', error)
      return {
        success: false,
        error: 'Erro ao buscar planos'
      }
    }
  }

  /**
   * Busca um plano específico por ID
   */
  async getPlanById(planId: string): Promise<PlanServiceResponse> {
    try {
      const plan = this.plans.find(p => p.id === planId)
      
      if (!plan) {
        return {
          success: false,
          error: 'Plano não encontrado'
        }
      }

      return {
        success: true,
        data: [plan]
      }
    } catch (error) {
      console.error('[PlanService] Error fetching plan:', error)
      return {
        success: false,
        error: 'Erro ao buscar plano'
      }
    }
  }

  /**
   * Busca planos por externalId (para integração com sistemas externos)
   */
  async getPlansByExternalId(externalIds: string[]): Promise<PlanServiceResponse> {
    try {
      const plans = this.plans.filter(p => 
        p.externalId && externalIds.includes(p.externalId)
      )

      return {
        success: true,
        data: plans
      }
    } catch (error) {
      console.error('[PlanService] Error fetching plans by external ID:', error)
      return {
        success: false,
        error: 'Erro ao buscar planos por ID externo'
      }
    }
  }

  /**
   * Sincroniza planos com sistema externo
   */
  async syncPlansFromExternal(): Promise<PlanServiceResponse> {
    try {
      // TODO: Implementar sincronização com sistema externo
      // const externalPlans = await fetch('/api/external/plans/sync')
      // this.plans = await externalPlans.json()
      
      console.log('[PlanService] Plans synced from external system')
      return {
        success: true,
        data: this.plans
      }
    } catch (error) {
      console.error('[PlanService] Error syncing plans:', error)
      return {
        success: false,
        error: 'Erro ao sincronizar planos'
      }
    }
  }

  /**
   * Converte dados do serviço para formato da landing page
   */
  formatForLandingPage(plans: PlanPricing[]) {
    return plans.map(plan => ({
      name: plan.name,
      price: plan.price === 0 ? 'Gratuito' : `R$ ${plan.price}`,
      period: plan.period === 'monthly' ? '/mês' : '/ano',
      description: plan.description,
      features: plan.features
        .filter(f => f.included)
        .map(f => f.name),
      cta: plan.cta,
      popular: plan.popular
    }))
  }
}

export const planService = new PlanService() 