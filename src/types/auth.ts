import { UserRole } from '@prisma/client'

// JWT Payload Types
export interface JWTPayload {
  userId: string
  email: string
  name: string
  role: UserRole
  organizationId: string
  organizationSlug: string
  
  // Claims para controle de features (paywall futuro)
  features: {
    maxSessions: number
    maxParticipants: number
    hasAdvancedReports: boolean
    hasCustomBranding: boolean
    hasSSO: boolean
    hasAPI: boolean
  }
  
  // External integration (futuro)
  externalId?: string
  externalSource?: string
  
  // JWT standard fields
  iat: number  // issued at
  exp?: number  // expires at (opcional, jwt.sign adiciona automaticamente)
  sub?: string  // subject (userId) - opcional, jwt.sign adiciona automaticamente
  iss?: string  // issuer - opcional, jwt.sign adiciona automaticamente
}

export interface RefreshTokenPayload {
  userId: string
  tokenId: string
  organizationId: string
  iat: number
  exp?: number  // opcional, jwt.sign adiciona automaticamente
}

// API Request/Response Types
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    organizationId: string
    organizationSlug: string
    avatar?: string
    locale: string
  }
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  organizationName?: string // Se não fornecido, cria org com nome do usuário
}

export interface RegisterResponse {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    organizationId: string
    organizationSlug: string
  }
  accessToken: string
  refreshToken: string
  expiresIn: number
  message: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
  organizationId: string
  organizationSlug: string
  avatar?: string
  locale: string
  timezone: string
  isActive: boolean
  lastLoginAt?: Date
  createdAt: Date
}

// Error Types
export interface AuthError {
  code: string
  message: string
  details?: any
}

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_INACTIVE: 'USER_INACTIVE',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  ORGANIZATION_NOT_FOUND: 'ORGANIZATION_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const

export type AuthErrorCode = typeof AUTH_ERRORS[keyof typeof AUTH_ERRORS]

// Middleware Types
export interface AuthenticatedRequest {
  user: JWTPayload
}

// Feature flags para controle de paywall
export interface FeatureFlags {
  maxSessions: number
  maxParticipants: number
  hasAdvancedReports: boolean
  hasCustomBranding: boolean
  hasSSO: boolean
  hasAPI: boolean
}

export const PLAN_FEATURES: Record<string, FeatureFlags> = {
  FREE: {
    maxSessions: 5,
    maxParticipants: 10,
    hasAdvancedReports: false,
    hasCustomBranding: false,
    hasSSO: false,
    hasAPI: false
  },
  PRO: {
    maxSessions: 50,
    maxParticipants: 50,
    hasAdvancedReports: true,
    hasCustomBranding: true,
    hasSSO: false,
    hasAPI: true
  },
  ENTERPRISE: {
    maxSessions: -1, // unlimited
    maxParticipants: -1, // unlimited
    hasAdvancedReports: true,
    hasCustomBranding: true,
    hasSSO: true,
    hasAPI: true
  }
} 