/**
 * Configuração centralizada da aplicação
 * Todas as variáveis de ambiente devem ser acessadas através deste arquivo
 */

export const APP_CONFIG = {
  // Informações da aplicação
  APP_NAME: process.env.APP_NAME || 'Poker Planning',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
  APP_DESCRIPTION: process.env.APP_DESCRIPTION || 'Plataforma de Poker Planning para estimativas ágeis',
  
  // Ambiente
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  
  // Servidor
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || 'localhost',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  
  // Banco de dados
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-for-development',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  JWT_ISSUER: process.env.JWT_ISSUER || 'poker-planning-app',
  
  // Senhas
  PASSWORD_SALT_ROUNDS: parseInt(process.env.PASSWORD_SALT_ROUNDS || '12', 10),
  
  // Email (para implementação futura)
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'sendgrid', // sendgrid, resend, etc.
  EMAIL_API_KEY: process.env.EMAIL_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@pokerplanning.com',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Poker Planning',
  
  // WebSocket
  WS_PORT: parseInt(process.env.WS_PORT || '3001', 10),
  
  // Logs
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutos
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Features
  ENABLE_REGISTRATION: process.env.ENABLE_REGISTRATION !== 'false', // true por padrão
  ENABLE_PASSWORD_RESET: process.env.ENABLE_PASSWORD_RESET !== 'false', // true por padrão
  ENABLE_EMAIL_VERIFICATION: process.env.ENABLE_EMAIL_VERIFICATION === 'true', // false por padrão
  
  // Multi-tenancy
  DEFAULT_ORGANIZATION_PLAN: process.env.DEFAULT_ORGANIZATION_PLAN || 'FREE',
  
  // Billing Service (futuro)
  BILLING_SERVICE_URL: process.env.BILLING_SERVICE_URL || '',
  BILLING_SERVICE_API_KEY: process.env.BILLING_SERVICE_API_KEY || '',
  
  // Segurança
  SESSION_SECRET: process.env.SESSION_SECRET || 'fallback-session-secret',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Cache
  REDIS_URL: process.env.REDIS_URL || '',
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hora
  
  // Analytics (futuro)
  ANALYTICS_ENABLED: process.env.ANALYTICS_ENABLED === 'true',
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  
  // Pagamentos (futuro)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  
  // Integrações (futuro)
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || '',
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL || '',
  
  // Desenvolvimento
  ENABLE_SWAGGER: process.env.ENABLE_SWAGGER === 'true',
  ENABLE_DEBUG_MODE: process.env.ENABLE_DEBUG_MODE === 'true',
} as const

/**
 * Valida se as configurações obrigatórias estão presentes
 */
export function validateConfig(): void {
  const requiredConfigs = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ]
  
  const missingConfigs = requiredConfigs.filter(config => !APP_CONFIG[config as keyof typeof APP_CONFIG])
  
  if (missingConfigs.length > 0) {
    throw new Error(`Configurações obrigatórias ausentes: ${missingConfigs.join(', ')}`)
  }
}

/**
 * Configurações específicas por ambiente
 */
export const ENV_CONFIG = {
  development: {
    LOG_LEVEL: 'debug',
    ENABLE_DEBUG_MODE: true,
    ENABLE_SWAGGER: true,
  },
  production: {
    LOG_LEVEL: 'info',
    ENABLE_DEBUG_MODE: false,
    ENABLE_SWAGGER: false,
  },
  test: {
    LOG_LEVEL: 'error',
    ENABLE_DEBUG_MODE: false,
    ENABLE_SWAGGER: false,
  }
} as const

/**
 * Obtém configuração específica do ambiente atual
 */
export function getEnvConfig<T extends keyof typeof ENV_CONFIG.development>(
  key: T
): boolean | string {
  const env = APP_CONFIG.NODE_ENV as keyof typeof ENV_CONFIG
  return ENV_CONFIG[env]?.[key] ?? ENV_CONFIG.development[key]
} 