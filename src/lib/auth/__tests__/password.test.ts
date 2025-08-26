import { hashPassword, verifyPassword, generatePasswordResetToken, verifyPasswordResetToken, computeResetTokenDigest } from '../password'

describe('Password Utilities', () => {
  const testPassword = 'testPassword123'
  const testEmail = 'test@example.com'

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const hashedPassword = await hashPassword(testPassword)
      
      expect(hashedPassword).toBeDefined()
      expect(typeof hashedPassword).toBe('string')
      expect(hashedPassword).not.toBe(testPassword)
      expect(hashedPassword.length).toBeGreaterThan(0)
    })

    it('should generate different hashes for same password', async () => {
      const hash1 = await hashPassword(testPassword)
      const hash2 = await hashPassword(testPassword)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hashedPassword = await hashPassword(testPassword)
      const isValid = await verifyPassword(testPassword, hashedPassword)
      
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const hashedPassword = await hashPassword(testPassword)
      const isValid = await verifyPassword('wrongPassword', hashedPassword)
      
      expect(isValid).toBe(false)
    })

    it('should handle empty password', async () => {
      const hashedPassword = await hashPassword(testPassword)
      const isValid = await verifyPassword('', hashedPassword)
      
      expect(isValid).toBe(false)
    })
  })

  describe('generatePasswordResetToken', () => {
    it('should generate reset token', async () => {
      const token = await generatePasswordResetToken('user-123')
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should generate different tokens for same user', async () => {
      const token1 = await generatePasswordResetToken('user-123')
      const token2 = await generatePasswordResetToken('user-123')
      
      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyPasswordResetToken', () => {
    it('should verify valid reset token', async () => {
      const token = await generatePasswordResetToken('user-123')
      const digest = computeResetTokenDigest(token)
      const isValid = await verifyPasswordResetToken(token, digest)
      
      expect(isValid).toBe(true)
    })

    it('should reject invalid token', async () => {
      const isValid = await verifyPasswordResetToken('invalid-token', 'invalid-digest')
      
      expect(isValid).toBe(false)
    })

    it('should reject token with wrong digest', async () => {
      const token = await generatePasswordResetToken('user-123')
      const isValid = await verifyPasswordResetToken(token, 'wrong-digest')
      
      expect(isValid).toBe(false)
    })
  })
})
