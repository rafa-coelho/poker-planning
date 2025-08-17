import { prisma } from '@/lib/db'

// 🚀 Cache Service para Otimização de Performance
// Implementa cache em memória para queries frequentes

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos
  private readonly MAX_CACHE_SIZE = 1000

  /**
   * Obtém dados do cache ou executa a função
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const data = await fetcher()
    this.set(key, data, ttl)
    return data
  }

  /**
   * Obtém dados do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Define dados no cache
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Limpar cache se estiver muito grande
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanup()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Remove entrada do cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Limpa cache expirado
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Gera chave de cache para queries
   */
  generateKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    return `${prefix}:${sortedParams}`
  }

  /**
   * Obtém todas as chaves do cache
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Verifica se uma chave existe no cache
   */
  hasKey(key: string): boolean {
    return this.cache.has(key)
  }
}

// Instância global do cache
export const cacheService = new CacheService()

// 🔧 Utilitários para queries otimizadas

/**
 * Cache para sessões da organização
 */
export async function getCachedSessions(organizationId: string, filters: Record<string, unknown> = {}) {
  const key = cacheService.generateKey('sessions', { organizationId, ...filters })
  
  return cacheService.getOrSet(key, async () => {
    return prisma.session.findMany({
      where: { organizationId, ...filters },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        _count: { select: { participants: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  }, 2 * 60 * 1000) // 2 minutos
}

/**
 * Cache para usuários da organização
 */
export async function getCachedUsers(organizationId: string) {
  const key = cacheService.generateKey('users', { organizationId })
  
  return cacheService.getOrSet(key, async () => {
    return prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastLoginAt: true
      },
      orderBy: { lastLoginAt: 'desc' }
    })
  }, 5 * 60 * 1000) // 5 minutos
}

/**
 * Cache para estatísticas da organização
 */
export async function getCachedStats(organizationId: string) {
  const key = cacheService.generateKey('stats', { organizationId })
  
  return cacheService.getOrSet(key, async () => {
    const [sessionsCount, usersCount, activeSessionsCount] = await Promise.all([
      prisma.session.count({ where: { organizationId } }),
      prisma.user.count({ where: { organizationId, isActive: true } }),
      prisma.session.count({ where: { organizationId, status: 'ACTIVE' } })
    ])

    return {
      sessionsCount,
      usersCount,
      activeSessionsCount
    }
  }, 1 * 60 * 1000) // 1 minuto
}

/**
 * Invalida cache relacionado a uma organização
 */
export function invalidateOrganizationCache(organizationId: string): void {
  const keysToDelete: string[] = []
  
  for (const key of cacheService.getKeys()) {
    if (key.includes(organizationId)) {
      keysToDelete.push(key)
    }
  }
  
  keysToDelete.forEach(key => cacheService.delete(key))
}

/**
 * Invalida cache de sessões
 */
export function invalidateSessionCache(sessionId: string): void {
  const keysToDelete: string[] = []
  
  for (const key of cacheService.getKeys()) {
    if (key.includes('sessions') || key.includes(sessionId)) {
      keysToDelete.push(key)
    }
  }
  
  keysToDelete.forEach(key => cacheService.delete(key))
}

// 🧹 Limpeza automática do cache
setInterval(() => {
  cacheService.cleanup()
}, 60 * 1000) // Limpar a cada minuto

export default cacheService 