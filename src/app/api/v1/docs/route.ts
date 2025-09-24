import { NextResponse } from 'next/server'
import { APP_CONFIG } from '@/lib/config'

export async function GET() {
  const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: `${APP_CONFIG.APP_NAME} API`,
      description: `API para integração com o sistema de ${APP_CONFIG.APP_NAME} Empresarial`,
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'api@pokerplanning.com'
      }
    },
    servers: [
      {
        url: 'https://api.pokerplanning.com/v1',
        description: 'Production server'
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ],
    security: [
      {
        ApiKeyAuth: []
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key for authentication'
        }
      },
      schemas: {
        Session: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            status: { 
              type: 'string',
              enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED', 'CANCELLED']
            },
            externalId: { type: 'string' },
            externalSource: { type: 'string' },
            votingMode: {
              type: 'string',
              enum: ['FIBONACCI', 'TSHIRT', 'LINEAR', 'CUSTOM']
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            endedAt: { type: 'string', format: 'date-time' },
            organization: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                slug: { type: 'string' }
              }
            },
            createdBy: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    paths: {
      '/': {
        get: {
          summary: 'API Information',
          description: 'Get information about the API',
          responses: {
            '200': {
              description: 'API information',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      version: { type: 'string' },
                      status: { type: 'string' },
                      endpoints: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/sessions': {
        get: {
          summary: 'List Sessions',
          description: 'Get a list of sessions with pagination',
          parameters: [
            {
              name: 'organizationId',
              in: 'query',
              description: 'Filter by organization ID',
              schema: { type: 'string' }
            },
            {
              name: 'status',
              in: 'query',
              description: 'Filter by session status',
              schema: { 
                type: 'string',
                enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED', 'CANCELLED']
              }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Number of items per page (max 100)',
              schema: { type: 'integer', default: 50 }
            },
            {
              name: 'offset',
              in: 'query',
              description: 'Number of items to skip',
              schema: { type: 'integer', default: 0 }
            }
          ],
          responses: {
            '200': {
              description: 'List of sessions',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Session' }
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          limit: { type: 'integer' },
                          offset: { type: 'integer' },
                          hasMore: { type: 'boolean' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '429': {
              description: 'Rate limit exceeded',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create Session',
          description: 'Create a new session',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'organizationId'],
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    organizationId: { type: 'string' },
                    externalId: { type: 'string' },
                    externalSource: { type: 'string' },
                    votingMode: {
                      type: 'string',
                      enum: ['FIBONACCI', 'TSHIRT', 'LINEAR', 'CUSTOM']
                    },
                    status: {
                      type: 'string',
                      enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED', 'CANCELLED']
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Session created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Session' },
                      message: { type: 'string' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600' // Cache por 1 hora
    }
  })
}
