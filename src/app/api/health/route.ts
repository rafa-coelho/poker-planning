import { NextRequest, NextResponse } from 'next/server'
import { performHealthCheck } from '@/lib/utils/healthCheck'

/**
 * GET /api/health - Endpoint de saúde do sistema
 * Usado para monitoramento e debugging
 */
export async function GET(req: NextRequest) {
  try {
    const health = await performHealthCheck()
    
    const status = health.healthy ? 200 : 503
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: health.healthy ? 'healthy' : 'unhealthy',
      checks: health.checks,
      ...(health.errors && { errors: health.errors })
    }, { status })
    
  } catch (error) {
    console.error('Health check endpoint error:', error)
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
