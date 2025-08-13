/**
 * Utilitários para verificar a saúde do sistema e detectar problemas
 */

import { prisma } from '@/lib/db'
import { APP_CONFIG } from '@/lib/config'

export interface HealthStatus {
  healthy: boolean
  checks: {
    database: boolean
    jwt: boolean
    environment: boolean
  }
  errors?: string[]
}

/**
 * Verifica a saúde geral do sistema
 */
export async function performHealthCheck(): Promise<HealthStatus> {
  const errors: string[] = []
  const checks = {
    database: false,
    jwt: false,
    environment: false
  }

  // 1. Verificar conexão com banco de dados
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch (error) {
    errors.push(`Database connection failed: ${error}`)
  }

  // 2. Verificar configuração JWT
  if (APP_CONFIG.JWT_SECRET && APP_CONFIG.JWT_SECRET.length >= 32) {
    checks.jwt = true
  } else {
    errors.push('JWT_SECRET is missing or too short')
  }

  // 3. Verificar variáveis de ambiente críticas
  if (APP_CONFIG.NODE_ENV && APP_CONFIG.DATABASE_URL) {
    checks.environment = true
  } else {
    errors.push('Critical environment variables missing')
  }

  const healthy = checks.database && checks.jwt && checks.environment

  return {
    healthy,
    checks,
    ...(errors.length > 0 && { errors })
  }
}

/**
 * Middleware para verificar saúde antes de processar requests críticos
 */
export async function ensureSystemHealth(): Promise<{ isHealthy: boolean; error?: string }> {
  try {
    const health = await performHealthCheck()
    
    if (!health.healthy) {
      const errorMessage = health.errors?.join(', ') || 'System health check failed'
      return { isHealthy: false, error: errorMessage }
    }
    
    return { isHealthy: true }
  } catch (error) {
    return { 
      isHealthy: false, 
      error: `Health check failed: ${error instanceof Error ? error.message : String(error)}` 
    }
  }
}

/**
 * Verificar se uma organização específica está saudável
 */
export async function checkOrganizationHealth(organizationId: string): Promise<{
  isHealthy: boolean
  organization?: any
  error?: string
}> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { 
        id: true, 
        slug: true, 
        isActive: true,
        _count: {
          select: {
            users: true
          }
        }
      }
    })

    if (!organization) {
      return { isHealthy: false, error: 'Organization not found' }
    }

    if (!organization.isActive) {
      return { isHealthy: false, error: 'Organization is inactive' }
    }

    if (organization._count.users === 0) {
      return { isHealthy: false, error: 'Organization has no users' }
    }

    return { isHealthy: true, organization }
  } catch (error) {
    return { 
      isHealthy: false, 
      error: `Organization health check failed: ${error instanceof Error ? error.message : String(error)}` 
    }
  }
}
