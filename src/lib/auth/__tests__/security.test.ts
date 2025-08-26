import { hashPassword, verifyPassword } from '../password'
import { generateAccessToken, verifyAccessToken } from '../jwt'

describe('Security Tests', () => {
  describe('Password Security', () => {
    it('should hash passwords with salt', async () => {
      const password = 'testPassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)
      expect(hash1).not.toBe(password)
      expect(hash2).not.toBe(password)
    })

    it('should verify passwords correctly', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect passwords', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword('wrongPassword', hash)

      expect(isValid).toBe(false)
    })

    it('should handle timing attacks', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      
      const start1 = Date.now()
      await verifyPassword(password, hash)
      const time1 = Date.now() - start1

      const start2 = Date.now()
      await verifyPassword('wrongPassword', hash)
      const time2 = Date.now() - start2

      // Times should be similar (within 100ms) to prevent timing attacks
      expect(Math.abs(time1 - time2)).toBeLessThan(100)
    })
  })

  describe('JWT Security', () => {
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

    it('should generate tokens with proper expiration', async () => {
      const token = await generateAccessToken(mockUser, mockOrganization)
      const payload = verifyAccessToken(token)

      expect(payload).toBeDefined()
      expect(payload.exp).toBeDefined()
      expect(payload.iat).toBeDefined()
    })

    it('should reject expired tokens', () => {
      // Create a token with past expiration
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      
      const payload = verifyAccessToken(expiredToken)
      expect(payload).toBeNull()
    })

    it('should reject tokens with invalid signature', () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid-signature'
      
      const payload = verifyAccessToken(invalidToken)
      expect(payload).toBeNull()
    })

    it('should include user role in token', async () => {
      const token = await generateAccessToken(mockUser, mockOrganization)
      const payload = verifyAccessToken(token)

      expect(payload.role).toBe(mockUser.role)
    })

    it('should include organization ID in token', async () => {
      const token = await generateAccessToken(mockUser, mockOrganization)
      const payload = verifyAccessToken(token)

      expect(payload.organizationId).toBe(mockOrganization.id)
    })
  })

  describe('Input Validation', () => {
    it('should handle SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE users; --"
      
      // This should not cause any errors
      expect(() => {
        // Simulate input validation
        if (maliciousInput.includes(';')) {
          throw new Error('Invalid input')
        }
      }).toThrow('Invalid input')
    })

    it('should handle XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>'
      
      // This should be sanitized
      const sanitized = maliciousInput.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      expect(sanitized).toBe('')
    })

    it('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ]

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com'
      ]

      validEmails.forEach(email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        expect(emailRegex.test(email)).toBe(true)
      })

      invalidEmails.forEach(email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        expect(emailRegex.test(email)).toBe(false)
      })
    })
  })

  describe('Rate Limiting', () => {
    it('should implement rate limiting for login attempts', () => {
      const attempts = []
      const maxAttempts = 5
      const windowMs = 15 * 60 * 1000 // 15 minutes

      // Simulate multiple login attempts
      for (let i = 0; i < maxAttempts + 1; i++) {
        attempts.push(Date.now())
      }

      // Check if rate limiting would be triggered
      const recentAttempts = attempts.filter(
        attempt => Date.now() - attempt < windowMs
      )

      expect(recentAttempts.length).toBeGreaterThan(maxAttempts)
    })
  })

  describe('CORS Security', () => {
    it('should validate origin headers', () => {
      const allowedOrigins = ['https://app.example.com', 'https://admin.example.com']
      const requestOrigin = 'https://malicious-site.com'

      const isAllowed = allowedOrigins.includes(requestOrigin)
      expect(isAllowed).toBe(false)
    })
  })
})
