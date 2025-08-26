import { prisma } from '@/lib/db'
import { APP_CONFIG } from '@/lib/config'
import { VotingMode, SessionStatus, TicketStatus, Priority } from '@prisma/client'

export interface CreateOpenSessionData {
  name: string
  description?: string
  votingMode?: VotingMode
  customCards?: string[]
  autoReveal?: boolean
  allowObservers?: boolean
  timerDuration?: number
  creatorName: string
  creatorIp?: string
  creatorUserAgent?: string
}

export interface CreateOpenTicketData {
  title: string
  description?: string
  priority?: Priority
}

export interface OpenVoteData {
  participantName: string
  cardValue: string
  ipAddress?: string
}

export type OpenSessionWithRelations = {
  id: string
  name: string
  description: string | null
  status: SessionStatus
  votingMode: VotingMode
  customCards: string[]
  autoReveal: boolean
  allowObservers: boolean
  timerDuration: number | null
  isRevealed: boolean
  creatorName: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  endedAt: Date | null
  currentTicket: {
    id: string
    title: string
    description: string | null
    priority: Priority
    status: TicketStatus
    averageVote: number | null
    finalEstimate: string | null
    votes: Array<{
      id: string
      participantName: string
      cardValue: string
      createdAt: Date
    }>
  } | null
  participants: Array<{
    id: string
    name: string
    isActive: boolean
    joinedAt: Date
    leftAt: Date | null
  }>
  tickets: Array<{
    id: string
    title: string
    description: string | null
    priority: Priority
    status: TicketStatus
    averageVote: number | null
    finalEstimate: string | null
    createdAt: Date
    estimatedAt: Date | null
  }>
  _count: {
    participants: number
    tickets: number
  }
}

/**
 * Service para gerenciamento de sessões no modo aberto
 */
export class OpenSessionService {
  /**
   * Cria uma nova sessão aberta
   */
  static async createSession(data: CreateOpenSessionData) {
    return prisma.openSession.create({
      data: {
        name: data.name,
        description: data.description,
        votingMode: data.votingMode || VotingMode.FIBONACCI,
        customCards: data.customCards || [],
        autoReveal: data.autoReveal || false,
        allowObservers: data.allowObservers !== false,
        timerDuration: data.timerDuration,
        creatorName: data.creatorName,
        creatorIp: data.creatorIp,
        creatorUserAgent: data.creatorUserAgent,
        expiresAt: new Date(Date.now() + APP_CONFIG.OPEN_MODE_SESSION_TTL * 1000)
      }
    })
  }

  /**
   * Busca uma sessão aberta por ID
   */
  static async getSessionById(sessionId: string): Promise<OpenSessionWithRelations | null> {
    return prisma.openSession.findUnique({
      where: { id: sessionId },
      include: {
        currentTicket: {
          include: {
            votes: {
              orderBy: { createdAt: 'asc' }
            }
          }
        },
        participants: {
          where: { isActive: true },
          orderBy: { joinedAt: 'asc' }
        },
        tickets: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            participants: true,
            tickets: true
          }
        }
      }
    })
  }

  /**
   * Adiciona um participante à sessão
   */
  static async addParticipant(sessionId: string, name: string, ipAddress?: string, userAgent?: string) {
    return prisma.openSessionParticipant.create({
      data: {
        sessionId,
        name: name.trim(),
        ipAddress,
        userAgent
      }
    })
  }

  /**
   * Remove um participante da sessão
   */
  static async removeParticipant(sessionId: string, name: string) {
    return prisma.openSessionParticipant.updateMany({
      where: {
        sessionId,
        name: name.trim(),
        isActive: true
      },
      data: {
        isActive: false,
        leftAt: new Date()
      }
    })
  }

  /**
   * Cria um ticket na sessão
   */
  static async createTicket(sessionId: string, data: CreateOpenTicketData) {
    return prisma.openTicket.create({
      data: {
        sessionId,
        title: data.title,
        description: data.description,
        priority: data.priority || Priority.MEDIUM
      }
    })
  }

  /**
   * Define o ticket atual da sessão
   */
  static async setCurrentTicket(sessionId: string, ticketId: string | null) {
    return prisma.openSession.update({
      where: { id: sessionId },
      data: {
        currentTicketId: ticketId,
        isRevealed: false // Reset reveal state when changing ticket
      }
    })
  }

  /**
   * Adiciona um voto a um ticket
   */
  static async addVote(ticketId: string, data: OpenVoteData) {
    return prisma.openVote.upsert({
      where: {
        ticketId_participantName: {
          ticketId,
          participantName: data.participantName
        }
      },
      update: {
        cardValue: data.cardValue,
        ipAddress: data.ipAddress
      },
      create: {
        ticketId,
        participantName: data.participantName,
        cardValue: data.cardValue,
        ipAddress: data.ipAddress
      }
    })
  }

  /**
   * Calcula e atualiza a média de votos de um ticket
   */
  static async calculateAverageVote(ticketId: string) {
    const votes = await prisma.openVote.findMany({
      where: { ticketId },
      select: { cardValue: true }
    })

    if (votes.length === 0) {
      return null
    }

    // Converter valores de carta para números
    const numericVotes = votes
      .map(v => this.cardValueToNumber(v.cardValue))
      .filter(v => v !== null) as number[]

    if (numericVotes.length === 0) {
      return null
    }

    const average = numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length

    // Atualizar o ticket com a média
    await prisma.openTicket.update({
      where: { id: ticketId },
      data: { averageVote: average }
    })

    return average
  }

  /**
   * Define a estimativa final de um ticket
   */
  static async setFinalEstimate(ticketId: string, estimate: string) {
    return prisma.openTicket.update({
      where: { id: ticketId },
      data: {
        finalEstimate: estimate,
        status: TicketStatus.ESTIMATED,
        estimatedAt: new Date()
      }
    })
  }

  /**
   * Revela os votos de um ticket
   */
  static async revealVotes(sessionId: string) {
    return prisma.openSession.update({
      where: { id: sessionId },
      data: { isRevealed: true }
    })
  }

  /**
   * Esconde os votos de um ticket
   */
  static async hideVotes(sessionId: string) {
    return prisma.openSession.update({
      where: { id: sessionId },
      data: { isRevealed: false }
    })
  }

  /**
   * Encerra uma sessão
   */
  static async endSession(sessionId: string) {
    return prisma.openSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        endedAt: new Date()
      }
    })
  }

  /**
   * Limpa sessões expiradas
   */
  static async cleanupExpiredSessions() {
    const result = await prisma.openSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })

    console.log(`🧹 Limpeza automática: ${result.count} sessões abertas expiradas removidas`)
    return result.count
  }

  /**
   * Verifica se uma sessão está ativa
   */
  static async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await prisma.openSession.findUnique({
      where: { id: sessionId },
      select: { status: true, expiresAt: true }
    })

    if (!session) {
      return false
    }

    return session.status === SessionStatus.ACTIVE && session.expiresAt > new Date()
  }

  /**
   * Converte valor de carta para número
   */
  private static cardValueToNumber(cardValue: string): number | null {
    // Fibonacci
    if (['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89'].includes(cardValue)) {
      return parseInt(cardValue)
    }

    // T-shirt sizes
    const tshirtValues: Record<string, number> = {
      'XS': 1,
      'S': 2,
      'M': 3,
      'L': 5,
      'XL': 8,
      'XXL': 13
    }

    if (tshirtValues[cardValue]) {
      return tshirtValues[cardValue]
    }

    // Linear
    const linearValue = parseInt(cardValue)
    if (!isNaN(linearValue) && linearValue >= 1 && linearValue <= 10) {
      return linearValue
    }

    // Custom - tentar converter para número
    const customValue = parseFloat(cardValue)
    if (!isNaN(customValue)) {
      return customValue
    }

    return null
  }
}
