import { LRUCache } from 'lru-cache'

type Options = {
  uniqueTokenPerInterval?: number
  interval?: number
}

export function rateLimit(options: Options) {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  })

  return {
    check: (request: Request, limit: number, token: string) =>
      new Promise<{ success: boolean; limit: number; remaining: number; reset: number }>((resolve) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0]
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount)
        }
        tokenCount[0] += 1

        const currentUsage = tokenCount[0]
        const isRateLimited = currentUsage >= limit
        tokenCache.set(token, tokenCount)

        resolve({
          success: !isRateLimited,
          limit,
          remaining: isRateLimited ? 0 : limit - currentUsage,
          reset: Date.now() + (options.interval || 60000),
        })
      }),
  }
}

/**
 * Middleware para aplicar rate limiting em APIs
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  options: {
    limit: number
    interval?: number
    getIdentifier?: (req: Request) => string
  }
) {
  const rateLimiter = rateLimit({
    interval: options.interval || 60000,
    uniqueTokenPerInterval: 500,
  })

  return async (request: Request) => {
    const identifier = options.getIdentifier?.(request) || 
                     request.headers.get('x-api-key') || 
                     request.headers.get('x-forwarded-for') || 
                     'anonymous'

    const { success, remaining, reset } = await rateLimiter.check(
      request,
      options.limit,
      identifier
    )

    if (!success) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          limit: options.limit,
          remaining: 0,
          reset
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': options.limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      )
    }

    // Adicionar headers de rate limit à resposta
    const response = await handler(request)
    
    // Clone response para adicionar headers
    const newResponse = new Response(response.body, response)
    newResponse.headers.set('X-RateLimit-Limit', options.limit.toString())
    newResponse.headers.set('X-RateLimit-Remaining', remaining.toString())
    newResponse.headers.set('X-RateLimit-Reset', reset.toString())

    return newResponse
  }
}
