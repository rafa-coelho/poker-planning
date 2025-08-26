'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { planService } from '@/lib/services/planService'
import { PlanInfo } from '@/lib/config/plans'
import { useAuth } from '@/lib/hooks/useAuth'

interface PlanUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  trigger?: 'limit_exceeded' | 'feature_unavailable' | 'manual'
  feature?: string
  currentUsage?: number
  limit?: number
}

export default function PlanUpgradeModal({
  isOpen,
  onClose,
  trigger = 'manual',
  feature,
  currentUsage,
  limit
}: PlanUpgradeModalProps) {
  const { t } = useTranslation('dashboard')
  const { apiService } = useAuth()
  const [plans, setPlans] = useState<PlanInfo[]>([])
  const [currentPlan, setCurrentPlan] = useState<PlanInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  // 📋 Carregar planos disponíveis
  useEffect(() => {
    if (isOpen) {
      loadPlans()
    }
  }, [isOpen])

  const loadPlans = async () => {
    try {
      setLoading(true)

      // Obter planos via API
      const response = await apiService.get('/api/plans?includeCurrent=true&includeUpgrades=true')

      if (response.success && response.data) {
        const data = response.data as any
        setPlans(data.plans || [])
        setCurrentPlan(data.currentPlan || null)

        // Selecionar primeiro plano de upgrade automaticamente
        if (data.upgradePlans?.length > 0) {
          setSelectedPlan(data.upgradePlans[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading plans:', error)
    } finally {
      setLoading(false)
    }
  }

  // 💰 Calcular preço do plano selecionado
  const getSelectedPlanPrice = () => {
    if (!selectedPlan) return 0
    const plan = plans.find(p => p.id === selectedPlan)
    if (!plan) return 0
    
    const price = typeof plan.price === 'number' ? plan.price : 0
    
    if (billingCycle === 'yearly') {
      // Calcular preço anual com 20% de desconto
      return Math.round(price * 12 * 0.8)
    }
    return price
  }

  // 💰 Calcular economia anual
  const getYearlySavings = () => {
    if (!selectedPlan || billingCycle !== 'yearly') return 0
    const plan = plans.find(p => p.id === selectedPlan)
    if (!plan) return 0
    
    const price = typeof plan.price === 'number' ? plan.price : 0
    const monthlyTotal = price * 12
    const yearlyPrice = Math.round(price * 12 * 0.8)
    return monthlyTotal - yearlyPrice
  }

  // 🎯 Obter mensagem baseada no trigger
  const getTriggerMessage = () => {
    switch (trigger) {
      case 'limit_exceeded':
        return feature && currentUsage && limit
          ? t('plans.limitReached', { feature, current: currentUsage, limit })
          : t('plans.limitWarning')

      case 'feature_unavailable':
        return feature
          ? t('plans.featureUnavailable', { feature })
          : t('plans.limitWarning')

      default:
        return t('plans.upgradeDescription')
    }
  }

  // 🚀 Processar upgrade
  const handleUpgrade = async () => {
    if (!selectedPlan) return

    try {
      setLoading(true)

      // TODO: Integrar com sistema de billing externo
      // Por enquanto, apenas simular
      console.log('Upgrading to plan:', selectedPlan, 'billing cycle:', billingCycle)

      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Fechar modal e recarregar dados
      onClose()
      window.location.reload() // Recarregar para atualizar features

    } catch (error) {
      console.error('Error processing upgrade:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('plans.upgradeTitle')}
              </h2>
              <p className="text-gray-600 mt-1">
                {getTriggerMessage()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Billing Cycle Toggle */}
              <div className="flex justify-center mb-8">
                <div className="bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === 'monthly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    {t('plans.monthly')}
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === 'yearly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    {t('plans.yearly')}
                    {billingCycle === 'yearly' && (
                      <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {t('plans.savings')}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {plans.map((plan) => {
                  const isCurrentPlan = currentPlan?.id === plan.id
                  const isSelected = selectedPlan === plan.id
                  const isUpgrade = currentPlan && planOrder.indexOf(plan.id) > planOrder.indexOf(currentPlan.id)

                  return (
                    <div
                      key={plan.id}
                      className={`relative border-2 rounded-lg p-6 transition-all cursor-pointer ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        } ${isCurrentPlan ? 'opacity-60' : ''}`}
                      onClick={() => !isCurrentPlan && setSelectedPlan(plan.id)}
                    >
                      {/* Popular Badge */}
                      {plan.isPopular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                            {t('plans.popular')}
                          </span>
                        </div>
                      )}

                      {/* Enterprise Badge */}
                      {plan.isEnterprise && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-purple-600 text-white text-xs px-3 py-1 rounded-full">
                            {t('plans.enterprise')}
                          </span>
                        </div>
                      )}

                      {/* Plan Info */}
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4">
                          {plan.description}
                        </p>

                        {/* Price */}
                        <div className="mb-4">
                          <div className="text-3xl font-bold text-gray-900">
                            R$ {typeof plan.price === 'object' ? plan.price.monthly : plan.price}
                            <span className="text-lg font-normal text-gray-600">
                              {billingCycle === 'yearly' ? t('plans.perYear') : t('plans.perMonth')}
                            </span>
                          </div>
                          {billingCycle === 'yearly' && getYearlySavings() > 0 && (
                            <p className="text-green-600 text-sm mt-1">
                              {t('plans.yearlySavings', { amount: getYearlySavings() })}
                            </p>
                          )}
                        </div>

                        {/* Features */}
                        <div className="space-y-2 text-left">
                                                                <div className="flex items-center text-sm">
                                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        {plan.features.maxSessions === -1 ? t('plans.unlimitedSessions') : t('plans.sessions', { count: plan.features.maxSessions })}
                                      </div>
                                      <div className="flex items-center text-sm">
                                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        {plan.features.maxParticipants === -1 ? t('plans.unlimitedParticipants') : t('plans.participants', { count: plan.features.maxParticipants })}
                                      </div>
                                                                {plan.features.hasAdvancedReports && (
                                        <div className="flex items-center text-sm">
                                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                          {t('plans.advancedReports')}
                                        </div>
                                      )}
                                      {plan.features.hasTeamManagement && (
                                        <div className="flex items-center text-sm">
                                          <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                          {t('plans.teamManagement')}
                                        </div>
                                      )}
                        </div>

                                                            {/* Current Plan Indicator */}
                                    {isCurrentPlan && (
                                      <div className="mt-4 p-2 bg-gray-100 rounded text-sm text-gray-600">
                                        {t('plans.currentPlan')}
                                      </div>
                                    )}
            
                                    {/* Trial Info */}
                                    {plan.trialDays > 0 && (
                                      <div className="mt-4 p-2 bg-green-100 rounded text-sm text-green-700">
                                        {t('plans.trialDays', { days: plan.trialDays })}
                                      </div>
                                    )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                                            <button
                              onClick={onClose}
                              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              {t('plans.cancel')}
                            </button>
                            <button
                              onClick={handleUpgrade}
                              disabled={!selectedPlan || loading || selectedPlan === currentPlan?.id}
                              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {loading ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  {t('plans.processing')}
                                </div>
                              ) : (
                                t('plans.upgradeTo', { planName: plans.find(p => p.id === selectedPlan)?.name || t('plans.upgradeTitle') })
                              )}
                            </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper para ordenar planos
const planOrder = ['FREE', 'PRO', 'ENTERPRISE'] 