import { prisma } from '@/lib/db'
import { Ticket, TicketStatus, Priority } from '@prisma/client'

export interface CreateTicketData {
  title: string
  description?: string
  priority: Priority
  sessionId: string
  organizationId: string
}

export interface UpdateTicketData {
  title?: string
  description?: string
  priority?: Priority
  status?: TicketStatus
  finalEstimate?: string
  averageVote?: number
  votingStartedAt?: Date
  votingEndedAt?: Date
}

export type TicketWithSession = Ticket & {
  session: {
    id: string
    name: string
    votingMode: string
  }
}

/**
 * Service para gerenciamento de tickets
 */
export class TicketService {
  /**
   * Cria um novo ticket
   */
  static async createTicket(data: CreateTicketData): Promise<Ticket> {
    return prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        sessionId: data.sessionId,
        status: TicketStatus.PENDING,
      }
    })
  }

  /**
   * Lista tickets de uma sessão
   */
  static async listTicketsBySession(sessionId: string, organizationId: string): Promise<TicketWithSession[]> {
    return prisma.ticket.findMany({
      where: {
        sessionId,
        session: {
          organizationId
        }
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            votingMode: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
  }

  /**
   * Busca um ticket por ID
   */
  static async getTicketById(ticketId: string, organizationId: string): Promise<TicketWithSession | null> {
    return prisma.ticket.findFirst({
      where: {
        id: ticketId,
        session: {
          organizationId
        }
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            votingMode: true,
          }
        }
      }
    })
  }

  /**
   * Atualiza um ticket
   */
  static async updateTicket(ticketId: string, organizationId: string, data: UpdateTicketData): Promise<Ticket | null> {
    return prisma.ticket.updateMany({
      where: {
        id: ticketId,
        session: {
          organizationId
        }
      },
      data: {
        ...data,
        updatedAt: new Date(),
      }
    }).then(() => 
      prisma.ticket.findFirst({
        where: {
          id: ticketId,
          session: {
            organizationId
          }
        }
      })
    )
  }

  /**
   * Remove um ticket
   */
  static async deleteTicket(ticketId: string, organizationId: string): Promise<Ticket | null> {
    return prisma.ticket.deleteMany({
      where: {
        id: ticketId,
        session: {
          organizationId
        }
      }
    }).then(() => null)
  }

  /**
   * Inicia votação em um ticket
   */
  static async startVoting(ticketId: string, organizationId: string): Promise<Ticket | null> {
    return this.updateTicket(ticketId, organizationId, {
      status: TicketStatus.VOTING,
      votingStartedAt: new Date(),
    })
  }

  /**
   * Finaliza votação em um ticket
   */
  static async finishVoting(ticketId: string, organizationId: string, averageVote: number): Promise<Ticket | null> {
    return this.updateTicket(ticketId, organizationId, {
      status: TicketStatus.ESTIMATED,
      averageVote,
      votingEndedAt: new Date(),
    })
  }

  /**
   * Define estimativa final do ticket
   */
  static async setFinalEstimate(ticketId: string, organizationId: string, finalEstimate: string): Promise<Ticket | null> {
    return this.updateTicket(ticketId, organizationId, {
      finalEstimate,
      status: TicketStatus.ESTIMATED,
    })
  }

  /**
   * Busca o ticket atual da sessão
   */
  static async getCurrentTicket(sessionId: string, organizationId: string): Promise<TicketWithSession | null> {
    return prisma.ticket.findFirst({
      where: {
        sessionId,
        status: TicketStatus.VOTING,
        session: {
          organizationId
        }
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            votingMode: true,
          }
        }
      }
    })
  }
}