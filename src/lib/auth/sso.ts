import { prisma } from '@/lib/db'
import { generateAccessToken, generateRefreshToken } from './jwt'

interface SSOUser {
  id: string
  email: string
  name: string
  organizationId?: string
  externalId: string
  externalSource: string
  metadata?: any
}

/**
 * Mock de autenticação SSO para desenvolvimento
 * Em produção, isso seria integrado com Auth0, Okta, Azure AD, etc.
 */
export class SSOService {
  private static instance: SSOService

  static getInstance(): SSOService {
    if (!SSOService.instance) {
      SSOService.instance = new SSOService()
    }
    return SSOService.instance
  }

  /**
   * Mock de login SSO
   * @param provider - Provedor SSO (google, microsoft, okta, etc.)
   * @param token - Token de autenticação
   * @returns Dados do usuário autenticado
   */
  async authenticateSSO(provider: string, token: string): Promise<SSOUser | null> {
    try {
      // Mock de validação de token
      const mockUsers: Record<string, SSOUser> = {
        'google_token_123': {
          id: 'sso_user_1',
          email: 'john.doe@company.com',
          name: 'John Doe',
          externalId: 'google_123456789',
          externalSource: 'google',
          metadata: {
            picture: 'https://example.com/avatar.jpg',
            locale: 'en-US'
          }
        },
        'microsoft_token_456': {
          id: 'sso_user_2',
          email: 'jane.smith@company.com',
          name: 'Jane Smith',
          externalId: 'microsoft_987654321',
          externalSource: 'microsoft',
          metadata: {
            department: 'Engineering',
            jobTitle: 'Senior Developer'
          }
        },
        'okta_token_789': {
          id: 'sso_user_3',
          email: 'admin@company.com',
          name: 'Admin User',
          externalId: 'okta_555666777',
          externalSource: 'okta',
          organizationId: 'org_1',
          metadata: {
            role: 'admin',
            permissions: ['read', 'write', 'admin']
          }
        }
      }

      const user = mockUsers[token]
      
      if (!user) {
        console.log(`[SSO] Invalid token for provider: ${provider}`)
        return null
      }

      console.log(`[SSO] Authenticated user: ${user.email} via ${provider}`)
      return user
    } catch (error) {
      console.error('[SSO] Error authenticating:', error)
      return null
    }
  }

  /**
   * Sincronizar usuário SSO com banco local
   * @param ssoUser - Dados do usuário do SSO
   * @returns Usuário local criado/atualizado
   */
  async syncSSOUser(ssoUser: SSOUser) {
    try {
      // Buscar usuário existente
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: ssoUser.email },
            { externalId: ssoUser.externalId }
          ]
        }
      })

      if (user) {
        // Atualizar usuário existente
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: ssoUser.name,
            externalId: ssoUser.externalId,
            externalSource: ssoUser.externalSource,
            lastLoginAt: new Date()
          }
        })
        console.log(`[SSO] Updated existing user: ${user.email}`)
      } else {
        // Criar novo usuário
        user = await prisma.user.create({
          data: {
            email: ssoUser.email,
            name: ssoUser.name,
            externalId: ssoUser.externalId,
            externalSource: ssoUser.externalSource,
            organizationId: ssoUser.organizationId || 'default_org', // Em produção, determinar organização
            role: 'MEMBER',
            isActive: true
          }
        })
        console.log(`[SSO] Created new user: ${user.email}`)
      }

      return user
    } catch (error) {
      console.error('[SSO] Error syncing user:', error)
      throw error
    }
  }

  /**
   * Gerar JWT para usuário SSO
   * @param user - Usuário local
   * @param organization - Organização do usuário
   * @returns Tokens JWT
   */
  async generateSSOTokens(user: any, organization: any) {
    try {
      const accessToken = generateAccessToken(user, organization)
      const refreshToken = generateRefreshToken(user.id, organization.id, 'sso-token')

      return {
        accessToken,
        refreshToken
      }
    } catch (error) {
      console.error('[SSO] Error generating tokens:', error)
      throw error
    }
  }

  /**
   * Mock de logout SSO
   * @param token - Token de logout
   * @returns true se logout bem-sucedido
   */
  async logoutSSO(token: string): Promise<boolean> {
    try {
      // Em produção, invalidar token no provedor SSO
      console.log(`[SSO] Logout successful for token: ${token}`)
      return true
    } catch (error) {
      console.error('[SSO] Error during logout:', error)
      return false
    }
  }

  /**
   * Mock de verificação de permissões SSO
   * @param user - Usuário SSO
   * @param permission - Permissão necessária
   * @returns true se tem permissão
   */
  async checkSSOPermission(user: SSOUser, permission: string): Promise<boolean> {
    try {
      // Mock de verificação de permissões
      const mockPermissions: Record<string, string[]> = {
        'google_123456789': ['read', 'write'],
        'microsoft_987654321': ['read', 'write', 'admin'],
        'okta_555666777': ['read', 'write', 'admin', 'super_admin']
      }

      const userPermissions = mockPermissions[user.externalId] || ['read']
      
      return userPermissions.includes(permission) || 
             userPermissions.includes('super_admin')
    } catch (error) {
      console.error('[SSO] Error checking permission:', error)
      return false
    }
  }
}

/**
 * Endpoint mock para callback SSO
 */
export async function handleSSOCallback(provider: string, code: string) {
  try {
    const ssoService = SSOService.getInstance()
    
    // Mock de troca de código por token
    const mockTokenMap: Record<string, string> = {
      'google_code_123': 'google_token_123',
      'microsoft_code_456': 'microsoft_token_456',
      'okta_code_789': 'okta_token_789'
    }

    const token = mockTokenMap[code]
    if (!token) {
      throw new Error('Invalid authorization code')
    }

    // Autenticar usuário
    const ssoUser = await ssoService.authenticateSSO(provider, token)
    if (!ssoUser) {
      throw new Error('SSO authentication failed')
    }

    // Sincronizar com banco local
    const localUser = await ssoService.syncSSOUser(ssoUser)
    
    // Buscar organização do usuário
    const organization = await prisma.organization.findUnique({
      where: { id: localUser.organizationId }
    })

    if (!organization) {
      throw new Error('Organization not found')
    }

    // Gerar tokens JWT
    const tokens = await ssoService.generateSSOTokens(localUser, organization)

    return {
      success: true,
      user: localUser,
      tokens
    }
  } catch (error) {
    console.error('[SSO] Error in callback:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
