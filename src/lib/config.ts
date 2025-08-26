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
  
  // Modo Aberto (Open Mode)
  OPEN_MODE_ENABLED: process.env.OPEN_MODE_ENABLED === 'true', // false por padrão
  OPEN_MODE_SESSION_TTL: parseInt(process.env.OPEN_MODE_SESSION_TTL || '86400', 10), // 24 horas em segundos
  OPEN_MODE_MAX_PARTICIPANTS: parseInt(process.env.OPEN_MODE_MAX_PARTICIPANTS || '50', 10),
  OPEN_MODE_MAX_SESSIONS_PER_IP: parseInt(process.env.OPEN_MODE_MAX_SESSIONS_PER_IP || '10', 10),
  OPEN_MODE_CLEANUP_INTERVAL: parseInt(process.env.OPEN_MODE_CLEANUP_INTERVAL || '3600', 10), // 1 hora em segundos
  
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
  
  // Messaging (futuro)
  MESSAGE_BROKER_URL: process.env.MESSAGE_BROKER_URL || 'redis://localhost:6379',
  MESSAGE_BROKER_TYPE: process.env.MESSAGE_BROKER_TYPE || 'redis',
  
  // API Externa
  API_RATE_LIMIT: parseInt(process.env.API_RATE_LIMIT || '100', 10),
  API_RATE_LIMIT_WINDOW: parseInt(process.env.API_RATE_LIMIT_WINDOW || '60000', 10),
  
  // SSO (futuro)
  SSO_ENABLED: process.env.SSO_ENABLED === 'true',
  SSO_PROVIDERS: process.env.SSO_PROVIDERS?.split(',') || ['google', 'microsoft'],
  
  // Desenvolvimento
  ENABLE_SWAGGER: process.env.ENABLE_SWAGGER === 'true',
  ENABLE_DEBUG_MODE: process.env.ENABLE_DEBUG_MODE === 'true',
} as const

/**
 * Valida se as configurações obrigatórias estão presentes
 */
export function validateConfig(): void {
  const requiredConfigs = [
    'DATABASE_URL'
  ]

  // Se o modo aberto estiver habilitado, algumas configurações são opcionais
  if (APP_CONFIG.OPEN_MODE_ENABLED) {
    console.log('🔓 Modo aberto habilitado - algumas validações serão relaxadas')
  } else {
    // No modo empresarial, JWT é obrigatório
    requiredConfigs.push('JWT_SECRET', 'JWT_REFRESH_SECRET')
  }

  const missingConfigs = requiredConfigs.filter(config => !process.env[config])

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

/**
 * Inicializa serviços baseados na configuração
 */
export function initializeServices() {
  // Inicializar limpeza automática se o modo aberto estiver habilitado
  if (APP_CONFIG.OPEN_MODE_ENABLED) {
    const { CleanupService } = require('./services/cleanupService')
    CleanupService.scheduleCleanup()
    console.log('🔓 Modo aberto habilitado - serviços inicializados')
  }
} 