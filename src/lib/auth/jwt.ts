import jwt from 'jsonwebtoken'
import { JWTPayload, RefreshTokenPayload } from '@/types/auth'
import { User, Organization } from '@prisma/client'
import { APP_CONFIG } from '@nyx/config'
import { planService } from '@/lib/services/planService'

/**
 * Configurações JWT
 */
const JWT_SECRET = APP_CONFIG.JWT_SECRET
const JWT_REFRESH_SECRET = APP_CONFIG.JWT_REFRESH_SECRET
const JWT_ISSUER = APP_CONFIG.JWT_ISSUER

// Expiration times
export const TOKEN_EXPIRATION = {
  ACCESS_TOKEN: '15m',  // 15 minutos
  REFRESH_TOKEN: '7d',  // 7 dias
  REMEMBER_ME: '30d'    // 30 dias se "lembrar de mim"
} as const

/**
 * Gera access token JWT
 * @param user Dados do usuário
 * @param organization Dados da organização
 * @param rememberMe Se deve usar expiração estendida
 * @returns Token JWT
 */
export async function generateAccessToken(
  user: User, 
  organization: Organization,
  rememberMe: boolean = false
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiration = rememberMe ? TOKEN_EXPIRATION.REMEMBER_ME : TOKEN_EXPIRATION.ACCESS_TOKEN
  
  // 🎯 Obter features do plano atual (mockado por enquanto)
  const features = {
    maxSessions: -1,
    maxParticipants: -1,
    maxTeamMembers: -1,
    maxProjectMembers: -1,
    hasAdvancedReports: false,
    hasCustomBranding: false,
    hasSSO: false,
    hasAPI: false,
    hasPrioritySupport: false,
    hasCustomIntegrations: false,
    hasAuditLogs: false,
    hasAdvancedAnalytics: false,
    hasCustomRoles: false,
    hasBulkOperations: false,
    hasDataExport: false,
    hasWhiteLabel: false,
    hasPublicSessions: true,
    hasTeamManagement: true,
    hasProjectManagement: true,
    hasUserManagement: true,
    hasSessionHistory: true,
    hasVotingHistory: true,
    maxStorageGB: 1,
    retentionDays: 30
  }
  
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: organization.id,
    organizationSlug: organization.slug,
    features: features,
    externalId: user.externalId || undefined,
    externalSource: user.externalSource || undefined,
    iat: now
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiration,
    issuer: JWT_ISSUER,
    subject: user.id
  })
}

/**
 * Gera refresh token
 * @param userId ID do usuário
 * @param organizationId ID da organização
 * @param tokenId ID único do token (para revogação)
 * @returns Refresh token
 */
export function generateRefreshToken(
  userId: string, 
  organizationId: string,
  tokenId: string
): string {
  const now = Math.floor(Date.now() / 1000)
  
  const payload: RefreshTokenPayload = {
    userId,
    tokenId,
    organizationId,
    iat: now
  }
  
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: TOKEN_EXPIRATION.REFRESH_TOKEN,
    issuer: JWT_ISSUER,
    subject: userId
  })
}

/**
 * Verifica e decodifica access token
 * @param token Token JWT
 * @returns Payload decodificado ou null se inválido
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER
    }) as JWTPayload
    
    return decoded
  } catch (error) {
    console.error('Invalid access token:', error)
    return null
  }
}

/**
 * Verifica e decodifica refresh token
 * @param token Refresh token
 * @returns Payload decodificado ou null se inválido
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: JWT_ISSUER
    }) as RefreshTokenPayload
    
    return decoded
  } catch (error) {
    console.error('Invalid refresh token:', error)
    return null
  }
}

/**
 * Decodifica token sem verificar assinatura (apenas para leitura)
 * @param token Token JWT
 * @returns Payload decodificado ou null se inválido
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload
    return decoded
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

/**
 * Verifica se token está expirado
 * @param token Token JWT
 * @returns true se expirado, false caso contrário
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JWTPayload
    if (!decoded.exp) return false
    
    const now = Math.floor(Date.now() / 1000)
    return now >= decoded.exp
  } catch (error) {
    return true
  }
}

/**
 * Calcula tempo restante do token
 * @param token Token JWT
 * @returns Tempo restante em segundos, ou 0 se expirado
 */
export function getTokenTimeRemaining(token: string): number {
  try {
    const decoded = jwt.decode(token) as JWTPayload
    if (!decoded.exp) return 0
    
    const now = Math.floor(Date.now() / 1000)
    const remaining = decoded.exp - now
    
    return remaining > 0 ? remaining : 0
  } catch (error) {
    return 0
  }
}

/**
 * Extrai token do header Authorization
 * @param authHeader Header Authorization
 * @returns Token limpo ou null
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }
  
  const token = parts[1]
  if (!token || token.trim().length === 0) {
    return null
  }
  
  return token
}

/**
 * Verifica se o token está próximo do vencimento
 * @param payload Payload do JWT
 * @param thresholdMinutes Minutes before expiration to consider "near"
 * @returns Se está próximo do vencimento
 */
export function isTokenNearExpiration(payload: JWTPayload, thresholdMinutes: number = 5): boolean {
  if (!payload.exp) return false
  
  const now = Math.floor(Date.now() / 1000)
  const threshold = thresholdMinutes * 60
  
  return (payload.exp - now) <= threshold
}

/**
 * Gera ID único para refresh token
 * @returns ID único
 */
export function generateTokenId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Valida se o usuário tem permissão para uma feature
 * @param payload Payload JWT
 * @param feature Nome da feature
 * @returns Se tem permissão
 */
export function hasFeaturePermission(payload: JWTPayload, feature: keyof JWTPayload['features']): boolean {
  return payload.features[feature] === true || payload.features[feature] === -1 // -1 = unlimited
}

/**
 * Verifica limite numérico de uma feature
 * @param payload Payload JWT
 * @param feature Nome da feature
 * @param currentUsage Uso atual
 * @returns Se está dentro do limite
 */
export function isWithinFeatureLimit(
  payload: JWTPayload, 
  feature: 'maxSessions' | 'maxParticipants',
  currentUsage: number
): boolean {
  const limit = payload.features[feature]
  return limit === -1 || currentUsage < limit // -1 = unlimited
}

/**
 * Gera token seguro para convites/reset de senha
 * @returns Token seguro de 32 caracteres
 */
import crypto from 'crypto';

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
} 