import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withRateLimit } from '@/lib/middleware/rateLimit'
import { verifyApiKey } from '@/lib/auth/apiKey'

// Rate limiting: 100 requests por minuto
const rateLimitedHandler = withRateLimit(
  async (request: Request) => {
    const req = request as NextRequest
    
    // Verificar API key
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      )
    }

    const apiKeyData = await verifyApiKey(apiKey)
    if (!apiKeyData) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    // Processar requisição
    switch (req.method) {
      case 'GET':
        return await handleGetSessions(req, apiKeyData)
      case 'POST':
        return await handleCreateSession(req, apiKeyData)
      default:
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        )
    }
  },
  {
    limit: 100,
    interval: 60000, // 1 minuto
    getIdentifier: (req) => req.headers.get('x-api-key') || 'anonymous'
  }
)

export { rateLimitedHandler as GET, rateLimitedHandler as POST }

async function handleGetSessions(req: NextRequest, apiKeyData: any) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construir query
    const where: any = {}
    
    if (organizationId) {
      where.organizationId = organizationId
    }
    
    if (status) {
      where.status = status
    }

    // Buscar sessões
    const sessions = await prisma.session.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        externalId: true,
        externalSource: true,
        votingMode: true,
        createdAt: true,
        updatedAt: true,
        endedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            participants: true,
            tickets: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100), // Máximo 100 por página
      skip: offset
    })

    // Contar total
    const total = await prisma.session.count({ where })

    return NextResponse.json({
      data: sessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('[API v1] Error getting sessions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleCreateSession(req: NextRequest, apiKeyData: any) {
  try {
    const body = await req.json()
    
    // Validação básica
    if (!body.name || !body.organizationId) {
      return NextResponse.json(
        { error: 'Name and organizationId are required' },
        { status: 400 }
      )
    }

    // Verificar se organização existe
    const organization = await prisma.organization.findUnique({
      where: { id: body.organizationId },
      include: {
        users: {
          take: 1,
          where: { isActive: true }
        }
      }
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Criar sessão
    const session = await prisma.session.create({
      data: {
        name: body.name,
        description: body.description,
        organizationId: body.organizationId,
        createdById: apiKeyData.userId || organization.users[0]?.id || 'system',
        externalId: body.externalId,
        externalSource: body.externalSource,
        votingMode: body.votingMode || 'FIBONACCI',
        status: body.status || 'ACTIVE'
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      data: session,
      message: 'Session created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('[API v1] Error creating session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
