import { NextRequest, NextResponse } from 'next/server'
import { performanceService } from '@/lib/services/performanceService'

// 🚀 Performance Middleware
// Monitora performance de requests e aplica otimizações

interface PerformanceContext {
  startTime: number
  requestId: string
  pathname: string
  method: string
}

/**
 * Middleware para monitorar performance de requests
 */
export function withPerformanceMonitoring(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: unknown) => {
    const perfContext: PerformanceContext = {
      startTime: Date.now(),
      requestId: generateRequestId(),
      pathname: req.nextUrl.pathname,
      method: req.method
    }

    try {
      // 📊 Registrar início do request
      performanceService.recordMetric(
        'request_start',
        perfContext.startTime,
        'timestamp',
        {
          requestId: perfContext.requestId,
          pathname: perfContext.pathname,
          method: perfContext.method
        }
      )

      // 🚀 Executar handler
      const response = await handler(req, context)

      // 📊 Registrar sucesso
      const duration = Date.now() - perfContext.startTime
      performanceService.recordMetric(
        'request_duration',
        duration,
        'ms',
        {
          requestId: perfContext.requestId,
          pathname: perfContext.pathname,
          method: perfContext.method,
          statusCode: response.status,
          success: true
        }
      )

      // 🚨 Alertar requests lentos
      if (duration > 3000) { // 3 segundos
        console.warn(`🐌 Request lento: ${perfContext.method} ${perfContext.pathname} levou ${duration}ms`)
      }

      // 📊 Adicionar headers de performance
      response.headers.set('X-Request-ID', perfContext.requestId)
      response.headers.set('X-Response-Time', `${duration}ms`)

      return response

    } catch (error) {
      // 📊 Registrar erro
      const duration = Date.now() - perfContext.startTime
      performanceService.recordMetric(
        'request_error',
        duration,
        'ms',
        {
          requestId: perfContext.requestId,
          pathname: perfContext.pathname,
          method: perfContext.method,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          success: false
        }
      )

      console.error(`❌ Erro no request: ${perfContext.method} ${perfContext.pathname}`, error)
      throw error
    }
  }
}

/**
 * Middleware para cache de responses
 */
export function withResponseCache(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>,
  cacheOptions: {
    maxAge: number // segundos
    staleWhileRevalidate?: number // segundos
    tags?: string[]
  }
) {
  return async (req: NextRequest, context?: unknown) => {
    // Verificar se é GET request
    if (req.method !== 'GET') {
      return handler(req, context)
    }

    const cacheKey = generateCacheKey(req)
    const cachedResponse = await getCachedResponse(cacheKey)

    if (cachedResponse) {
      // 📊 Registrar cache hit
      performanceService.recordMetric(
        'cache_hit',
        1,
        'count',
        { pathname: req.nextUrl.pathname }
      )

      return cachedResponse
    }

    // 📊 Registrar cache miss
    performanceService.recordMetric(
      'cache_miss',
      1,
      'count',
      { pathname: req.nextUrl.pathname }
    )

    const response = await handler(req, context)

    // Cache response se for bem-sucedida
    if (response.status === 200) {
      await cacheResponse(cacheKey, response, cacheOptions)
    }

    return response
  }
}

/**
 * Middleware para compressão de responses
 */
export function withCompression(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: unknown) => {
    const response = await handler(req, context)

    // Adicionar headers de compressão
    const acceptEncoding = req.headers.get('accept-encoding') || ''
    
    if (acceptEncoding.includes('br')) {
      response.headers.set('Content-Encoding', 'br')
    } else if (acceptEncoding.includes('gzip')) {
      response.headers.set('Content-Encoding', 'gzip')
    }

    return response
  }
}

/**
 * Middleware para rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>,
  options: {
    windowMs: number // janela de tempo em ms
    maxRequests: number // máximo de requests por janela
    keyGenerator?: (req: NextRequest) => string
  }
) {
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

  return async (req: NextRequest, context?: unknown) => {
    const key = options.keyGenerator ? options.keyGenerator(req) : req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const now = Date.now()

    // Limpar entradas expiradas
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetTime) {
        rateLimitMap.delete(k)
      }
    }

    const current = rateLimitMap.get(key)

    if (!current) {
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      })
    } else if (current.count >= options.maxRequests) {
      // 📊 Registrar rate limit excedido
      performanceService.recordMetric(
        'rate_limit_exceeded',
        1,
        'count',
        { key, pathname: req.nextUrl.pathname }
      )

      return new NextResponse(
        JSON.stringify({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Muitas requisições',
            retryAfter: Math.ceil((current.resetTime - now) / 1000)
          }
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': options.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
          }
        }
      )
    } else {
      current.count++
    }

    const response = await handler(req, context)

    // Adicionar headers de rate limit
    const currentLimit = rateLimitMap.get(key)
    if (currentLimit) {
      response.headers.set('X-RateLimit-Limit', options.maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', (options.maxRequests - currentLimit.count).toString())
      response.headers.set('X-RateLimit-Reset', new Date(currentLimit.resetTime).toISOString())
    }

    return response
  }
}

// 🔧 Utilitários

/**
 * Gera ID único para request
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Gera chave de cache baseada no request
 */
function generateCacheKey(req: NextRequest): string {
  const url = req.nextUrl
  return `${req.method}:${url.pathname}:${url.search}`
}

/**
 * Obtém response do cache
 */
async function getCachedResponse(key: string): Promise<NextResponse | null> {
  // Implementação simplificada - em produção usar Redis ou similar
  const cache = (global as { __responseCache?: Map<string, { response: NextResponse; expiresAt: number; tags: string[] }> }).__responseCache || new Map()
  const cached = cache.get(key)
  
  if (cached && Date.now() < cached.expiresAt) {
    return cached.response
  }
  
  return null
}

/**
 * Cache response
 */
async function cacheResponse(
  key: string,
  response: NextResponse,
  options: { maxAge: number; staleWhileRevalidate?: number; tags?: string[] }
): Promise<void> {
  // Implementação simplificada - em produção usar Redis ou similar
  const cache = (global as { __responseCache?: Map<string, { response: NextResponse; expiresAt: number; tags: string[] }> }).__responseCache || new Map()
  
  cache.set(key, {
    response: response.clone(),
    expiresAt: Date.now() + (options.maxAge * 1000),
    tags: options.tags || []
  })
  
  ;(global as { __responseCache?: Map<string, { response: NextResponse; expiresAt: number; tags: string[] }> }).__responseCache = cache
}

/**
 * Middleware composto com todas as otimizações
 */
export function withPerformanceOptimizations(
  handler: (req: NextRequest, context?: unknown) => Promise<NextResponse>,
  options: {
    enableCache?: boolean
    enableCompression?: boolean
    enableRateLimit?: boolean
    cacheOptions?: {
      maxAge: number
      staleWhileRevalidate?: number
      tags?: string[]
    }
    rateLimitOptions?: {
      windowMs: number
      maxRequests: number
      keyGenerator?: (req: NextRequest) => string
    }
  } = {}
) {
  let optimizedHandler = handler

  // Aplicar middlewares na ordem correta
  if (options.enableRateLimit) {
    optimizedHandler = withRateLimit(optimizedHandler, options.rateLimitOptions || {
      windowMs: 15 * 60 * 1000, // 15 minutos
      maxRequests: 100
    })
  }

  if (options.enableCache) {
    optimizedHandler = withResponseCache(optimizedHandler, options.cacheOptions || {
      maxAge: 300 // 5 minutos
    })
  }

  if (options.enableCompression) {
    optimizedHandler = withCompression(optimizedHandler)
  }

  return withPerformanceMonitoring(optimizedHandler)
}

const performanceMiddleware = {
  withPerformanceMonitoring,
  withResponseCache,
  withCompression,
  withRateLimit,
  withPerformanceOptimizations
}

export default performanceMiddleware 