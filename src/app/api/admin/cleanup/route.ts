import { NextRequest, NextResponse } from 'next/server'
import { CleanupService } from '@/lib/services/cleanupService'
import { APP_CONFIG } from '@/lib/config'

/**
 * POST /api/admin/cleanup - Executa limpeza manual (apenas em desenvolvimento)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se está em desenvolvimento
    if (APP_CONFIG.IS_PRODUCTION) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_ALLOWED_IN_PRODUCTION',
            message: 'Manual cleanup is not allowed in production',
            timestamp: new Date().toISOString()
          }
        },
        { status: 403 }
      )
    }

    // Executar limpeza
    const result = await CleanupService.manualCleanup()

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Cleanup completed successfully'
    })

  } catch (error) {
    console.error('Error during manual cleanup:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/cleanup - Obtém status da limpeza automática
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar se está em desenvolvimento
    if (APP_CONFIG.IS_PRODUCTION) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_ALLOWED_IN_PRODUCTION',
            message: 'Cleanup status is not available in production',
            timestamp: new Date().toISOString()
          }
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        openModeEnabled: APP_CONFIG.OPEN_MODE_ENABLED,
        cleanupInterval: APP_CONFIG.OPEN_MODE_CLEANUP_INTERVAL,
        sessionTTL: APP_CONFIG.OPEN_MODE_SESSION_TTL,
        maxParticipants: APP_CONFIG.OPEN_MODE_MAX_PARTICIPANTS,
        maxSessionsPerIP: APP_CONFIG.OPEN_MODE_MAX_SESSIONS_PER_IP,
        environment: APP_CONFIG.NODE_ENV
      },
      message: 'Cleanup status retrieved successfully'
    })

  } catch (error) {
    console.error('Error getting cleanup status:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}
