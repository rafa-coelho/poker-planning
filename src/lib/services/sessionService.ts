import { prisma } from '@/lib/db'
import { Session, SessionStatus, VotingMode, User, Organization, ParticipantRole } from '@prisma/client'

export interface CreateSessionData {
  name: string
  description?: string
  organizationId: string
  createdById: string
  projectId?: string
  votingMode?: VotingMode
  autoReveal?: boolean
  allowObservers?: boolean
}

export interface UpdateSessionData {
  name?: string
  description?: string
  status?: SessionStatus
  votingMode?: VotingMode
  autoReveal?: boolean
  allowObservers?: boolean
  currentTicketId?: string
  isRevealed?: boolean
}

// Tipo mais específico para o retorno do Prisma
export type SessionWithRelations = Session & {
  organization: Organization
  createdBy: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
  participants: Array<{
    id: string
    role: string
    isActive: boolean
    joinedAt: Date
    user: {
      id: string
      name: string
      email: string
      avatar: string | null
    }
  }>
  tickets: Array<{
    id: string
    title: string
    status: string
    finalEstimate: string | null
  }>
  _count: {
    participants: number
    tickets: number
  }
}

/**
 * Service para gerenciamento de sessões
 */
export class SessionService {
  /**
   * Cria uma nova sessão
   */
  static async createSession(data: CreateSessionData): Promise<Session> {
    return prisma.session.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId: data.organizationId,
        createdById: data.createdById,
        projectId: data.projectId,
        votingMode: data.votingMode || VotingMode.FIBONACCI,
        autoReveal: data.autoReveal || false,
        allowObservers: data.allowObservers !== false,
      }
    })
  }

  /**
   * Busca uma sessão por ID com todas as relações
   */
  static async getSessionById(sessionId: string, organizationId: string): Promise<SessionWithRelations | null> {
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        organizationId: organizationId,
      },
      include: {
        organization: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          }
        },
        participants: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              }
            }
          }
        },
        tickets: {
          select: {
            id: true,
            title: true,
            status: true,
            finalEstimate: true,
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            participants: true,
            tickets: true,
          }
        }
      }
    })

    return session as SessionWithRelations | null
  }

  /**
   * Lista sessões de uma organização com paginação
   */
  static async listSessions(
    organizationId: string,
    options: {
      page?: number
      limit?: number
      status?: SessionStatus
      search?: string
      projectId?: string
      userId?: string
      userRole?: string
    } = {}
  ): Promise<{
    sessions: SessionWithRelations[]
    total: number
    page: number
    totalPages: number
  }> {
    const { page = 1, limit = 10, status, search, projectId, userId, userRole } = options
    const skip = (page - 1) * limit

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(projectId && { projectId }),
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Restringe membros/viewers a sessões de projetos aos quais têm acesso
    if (userRole && ['MEMBER', 'VIEWER'].includes(userRole) && userId) {
      where.AND = [
        {
          OR: [
            // Participante da sessão
            { participants: { some: { userId } } },
            // Criador da sessão
            { createdById: userId },
            // Membro do projeto associado
            { project: { members: { some: { userId } } } },
            // Membro de algum time associado ao projeto
            { project: { teams: { some: { members: { some: { userId } } } } } },
          ]
        }
      ]
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          organization: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            }
          },
          participants: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                }
              }
            }
          },
          tickets: {
            select: {
              id: true,
              title: true,
              status: true,
              finalEstimate: true,
            },
            orderBy: { createdAt: 'asc' }
          },
          _count: {
            select: {
              participants: true,
              tickets: true,
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.session.count({ where })
    ])

    return {
      sessions: sessions as SessionWithRelations[],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Atualiza uma sessão
   */
  static async updateSession(
    sessionId: string,
    organizationId: string,
    data: UpdateSessionData
  ): Promise<Session | null> {
    return prisma.session.updateMany({
      where: {
        id: sessionId,
        organizationId: organizationId,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      }
    }).then(() => 
      prisma.session.findFirst({
        where: { id: sessionId, organizationId }
      })
    )
  }

  /**
   * Soft delete de uma sessão (marca como arquivada)
   */
  static async archiveSession(sessionId: string, organizationId: string): Promise<Session | null> {
    return prisma.session.updateMany({
      where: {
        id: sessionId,
        organizationId: organizationId,
        status: { not: SessionStatus.ARCHIVED }
      },
      data: {
        status: SessionStatus.ARCHIVED,
        endedAt: new Date(),
        updatedAt: new Date(),
      }
    }).then(() => 
      prisma.session.findFirst({
        where: { id: sessionId, organizationId }
      })
    )
  }

  /**
   * Adiciona um participante à sessão
   */
  static async addParticipant(
    sessionId: string,
    userId: string,
    role: ParticipantRole = ParticipantRole.VOTER
  ): Promise<void> {
    await prisma.sessionParticipant.upsert({
      where: {
        sessionId_userId: {
          sessionId,
          userId
        }
      },
      update: {
        isActive: true,
        leftAt: null,
        role,
      },
      create: {
        sessionId,
        userId,
        role,
        isActive: true,
      }
    })
  }

  /**
   * Remove um participante da sessão
   */
  static async removeParticipant(sessionId: string, userId: string): Promise<void> {
    await prisma.sessionParticipant.updateMany({
      where: {
        sessionId,
        userId,
      },
      data: {
        isActive: false,
        leftAt: new Date(),
      }
    })
  }

  /**
   * Finaliza uma sessão
   */
  static async endSession(sessionId: string, organizationId: string): Promise<Session | null> {
    return prisma.session.updateMany({
      where: {
        id: sessionId,
        organizationId: organizationId,
        status: SessionStatus.ACTIVE
      },
      data: {
        status: SessionStatus.COMPLETED,
        endedAt: new Date(),
        updatedAt: new Date(),
      }
    }).then(() => 
      prisma.session.findFirst({
        where: { id: sessionId, organizationId }
      })
    )
  }

  /**
   * Busca estatísticas de sessões por organização
   */
  static async getSessionStats(organizationId: string) {
    const [total, active, completed, archived] = await Promise.all([
      prisma.session.count({ where: { organizationId } }),
      prisma.session.count({ where: { organizationId, status: SessionStatus.ACTIVE } }),
      prisma.session.count({ where: { organizationId, status: SessionStatus.COMPLETED } }),
      prisma.session.count({ where: { organizationId, status: SessionStatus.ARCHIVED } }),
    ])

    return {
      total,
      active,
      completed,
      archived,
    }
  }
}