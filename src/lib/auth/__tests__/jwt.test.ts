import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../jwt'

// Mock do planService
jest.mock('@/lib/services/planService', () => ({
  planService: {
    getPlanById: jest.fn().mockResolvedValue({
      success: true,
      data: [{
        id: 'free',
        name: 'Gratuito',
        features: {
          maxSessions: -1,
          maxParticipants: -1,
          maxTeamMembers: -1,
          maxProjectMembers: -1,
        }
      }]
    })
  }
}))

describe('JWT Authentication', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'MEMBER' as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    locale: 'pt',
    avatar: null,
    passwordHash: null,
    organizationId: 'org-123',
    externalId: null,
    externalSource: null,
  }

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    plan: 'free' as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    externalId: null,
    externalSource: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateAccessToken', () => {
    it('should generate a valid access token', async () => {
      const token = await generateAccessToken(mockUser, mockOrganization)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should generate token with remember me option', async () => {
      const token = await generateAccessToken(mockUser, mockOrganization, true)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const tokenId = 'token-123'
      const token = generateRefreshToken(mockUser.id, mockOrganization.id, tokenId)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', async () => {
      const token = await generateAccessToken(mockUser, mockOrganization)
      const payload = verifyAccessToken(token)
      
      expect(payload).toBeDefined()
      expect(payload.userId).toBe(mockUser.id)
      expect(payload.organizationId).toBe(mockOrganization.id)
      expect(payload.role).toBe(mockUser.role)
    })

    it('should return null for invalid token', () => {
      const payload = verifyAccessToken('invalid-token')
      
      expect(payload).toBeNull()
    })

    it('should return null for expired token', () => {
      // Mock JWT_SECRET to be different to simulate invalid token
      const originalSecret = process.env.JWT_SECRET
      process.env.JWT_SECRET = 'different-secret'
      
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      const payload = verifyAccessToken(token)
      
      expect(payload).toBeNull()
      
      // Restore original secret
      process.env.JWT_SECRET = originalSecret
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const tokenId = 'token-123'
      const token = generateRefreshToken(mockUser.id, mockOrganization.id, tokenId)
      const payload = verifyRefreshToken(token)
      
      expect(payload).toBeDefined()
      expect(payload.userId).toBe(mockUser.id)
      expect(payload.organizationId).toBe(mockOrganization.id)
      expect(payload.tokenId).toBe(tokenId)
    })

    it('should return null for invalid refresh token', () => {
      const payload = verifyRefreshToken('invalid-token')
      
      expect(payload).toBeNull()
    })
  })
})
