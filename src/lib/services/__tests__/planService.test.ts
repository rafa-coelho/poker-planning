import { planService } from '../planService'

describe('PlanService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPlans', () => {
    it('should return all plans', async () => {
      const response = await planService.getPlans()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data.length).toBeGreaterThan(0)
    })

    it('should return plans with correct structure', async () => {
      const response = await planService.getPlans()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()

      const plan = response.data[0]
      expect(plan).toHaveProperty('id')
      expect(plan).toHaveProperty('name')
      expect(plan).toHaveProperty('price')
      expect(plan).toHaveProperty('currency')
      expect(plan).toHaveProperty('period')
      expect(plan).toHaveProperty('description')
      expect(plan).toHaveProperty('features')
      expect(plan).toHaveProperty('cta')
    })
  })

  describe('getPlanById', () => {
    it('should return plan by id', async () => {
      const response = await planService.getPlanById('free')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.length).toBe(1)
      expect(response.data[0].id).toBe('free')
    })

    it('should return error for non-existent plan', async () => {
      const response = await planService.getPlanById('non-existent')

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })
  })

  describe('getPlanById', () => {
    it('should return plan with features', async () => {
      const response = await planService.getPlanById('free')

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.length).toBe(1)
      expect(response.data[0].features).toBeDefined()
      expect(Array.isArray(response.data[0].features)).toBe(true)
    })
  })

  describe('getPlansByExternalId', () => {
    it('should return plans by external ID', async () => {
      const response = await planService.getPlansByExternalId(['plan_free_001'])

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data.length).toBeGreaterThan(0)
    })

    it('should return empty array for non-existent external ID', async () => {
      const response = await planService.getPlansByExternalId(['non-existent'])

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.length).toBe(0)
    })
  })

  describe('syncPlansFromExternal', () => {
    it('should sync plans from external system', async () => {
      const response = await planService.syncPlansFromExternal()

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
    })
  })

  describe('formatForLandingPage', () => {
    it('should format plans for landing page', () => {
      const plans = [
        {
          id: 'free',
          name: 'Gratuito',
          price: 0,
          currency: 'BRL',
          period: 'monthly' as const,
          description: 'Plano gratuito',
          features: [
            { id: 'feature1', name: 'Feature 1', description: 'Descrição 1', included: true },
            { id: 'feature2', name: 'Feature 2', description: 'Descrição 2', included: false },
          ],
          cta: 'Começar Gratuito',
        }
      ]

      const formatted = planService.formatForLandingPage(plans)

      expect(Array.isArray(formatted)).toBe(true)
      expect(formatted[0]).toHaveProperty('name')
      expect(formatted[0]).toHaveProperty('price')
      expect(formatted[0]).toHaveProperty('features')
    })
  })
})
