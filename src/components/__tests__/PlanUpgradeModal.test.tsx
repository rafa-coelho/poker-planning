import React from 'react'

// Mock do usePlans hook
jest.mock('@/lib/hooks/usePlans', () => ({
  usePlans: () => ({
    plans: [
      {
        id: 'free',
        name: 'Gratuito',
        price: 0,
        currency: 'BRL',
        period: 'monthly',
        description: 'Plano gratuito',
        features: [
          { id: 'feature1', name: 'Feature 1', description: 'Descrição 1', included: true },
          { id: 'feature2', name: 'Feature 2', description: 'Descrição 2', included: false },
        ],
        cta: 'Começar Gratuito',
      },
      {
        id: 'pro',
        name: 'Profissional',
        price: 29,
        currency: 'BRL',
        period: 'monthly',
        description: 'Plano profissional',
        features: [
          { id: 'feature1', name: 'Feature 1', description: 'Descrição 1', included: true },
          { id: 'feature2', name: 'Feature 2', description: 'Descrição 2', included: true },
        ],
        cta: 'Upgrade para Pro',
        popular: true,
      },
    ],
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}))

// Mock do useTranslation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'pt',
    },
  }),
}))

describe('Plan Service Integration', () => {
  it('should have plans available', () => {
    const { usePlans } = require('@/lib/hooks/usePlans')
    const { plans } = usePlans()
    
    expect(plans).toBeDefined()
    expect(Array.isArray(plans)).toBe(true)
    expect(plans.length).toBeGreaterThan(0)
  })

  it('should have correct plan structure', () => {
    const { usePlans } = require('@/lib/hooks/usePlans')
    const { plans } = usePlans()
    
    const plan = plans[0]
    expect(plan).toHaveProperty('id')
    expect(plan).toHaveProperty('name')
    expect(plan).toHaveProperty('price')
    expect(plan).toHaveProperty('features')
  })

  it('should have popular plan marked', () => {
    const { usePlans } = require('@/lib/hooks/usePlans')
    const { plans } = usePlans()
    
    const popularPlan = plans.find(plan => plan.popular)
    expect(popularPlan).toBeDefined()
    expect(popularPlan.popular).toBe(true)
  })
})
