import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rateLimit'

// Rate limiting para API externa
const apiRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minuto
  uniqueTokenPerInterval: 500,
})

export async function GET(request: NextRequest) {
  try {
    // Aplicar rate limiting
    const identifier = request.headers.get('x-api-key') || request.headers.get('x-forwarded-for') || 'anonymous'
    const { success } = await apiRateLimit.check(request, 100, identifier) // 100 requests por minuto

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    return NextResponse.json({
      version: '1.0.0',
      status: 'active',
      endpoints: {
        sessions: '/api/v1/sessions',
        users: '/api/v1/users',
        organizations: '/api/v1/organizations',
        tickets: '/api/v1/tickets',
        projects: '/api/v1/projects',
        teams: '/api/v1/teams'
      },
      documentation: '/api/v1/docs',
      rateLimit: {
        requestsPerMinute: 100,
        remaining: 99 // Será calculado dinamicamente
      }
    })
  } catch (error) {
    console.error('[API v1] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
