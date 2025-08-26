import { useState, useEffect } from 'react'
import { planService, PlanPricing, PlanServiceResponse } from '@/lib/services/planService'

interface UsePlansReturn {
  plans: PlanPricing[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePlans(): UsePlansReturn {
  const [plans, setPlans] = useState<PlanPricing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response: PlanServiceResponse = await planService.getPlans()
      
      if (response.success && response.data) {
        setPlans(response.data)
      } else {
        setError(response.error || 'Erro ao carregar planos')
      }
    } catch (err) {
      setError('Erro ao carregar planos')
      console.error('[usePlans] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans
  }
}

export function usePlanById(planId: string) {
  const [plan, setPlan] = useState<PlanPricing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response: PlanServiceResponse = await planService.getPlanById(planId)
        
        if (response.success && response.data && response.data.length > 0) {
          setPlan(response.data[0])
        } else {
          setError(response.error || 'Plano não encontrado')
        }
      } catch (err) {
        setError('Erro ao carregar plano')
        console.error('[usePlanById] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (planId) {
      fetchPlan()
    }
  }, [planId])

  return {
    plan,
    loading,
    error
  }
}
