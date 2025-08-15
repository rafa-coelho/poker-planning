import { PrismaClient } from '@prisma/client'

class PrismaService {
  private static instance: PrismaClient

  static getInstance(): PrismaClient {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient()
    }
    return PrismaService.instance
  }

  // Carregar sessão com participantes
  static async loadSession(sessionId: string) {
    const prisma = this.getInstance()
    
    try {
      const dbSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          name: true,
          organizationId: true,
          currentTicketId: true,
          votingMode: true,
          participants: {
            where: { isActive: true },
            select: {
              id: true,
              userId: true,
              selectedCard: true,
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })
      
      return dbSession
    } catch (error) {
      console.error('Erro ao carregar sessão:', error)
      throw error
    }
  }

  // Persistir voto do participante
  static async persistVote(sessionId: string, userId: string, cardValue: string) {
    const prisma = this.getInstance()
    
    try {
      // Buscar o participante no banco
      const dbParticipant = await prisma.sessionParticipant.findFirst({
        where: {
          sessionId: sessionId,
          userId: userId
        }
      })
      
      if (dbParticipant) {
        // Atualizar o voto do participante
        await prisma.sessionParticipant.update({
          where: { id: dbParticipant.id },
          data: { selectedCard: cardValue }
        })
      } else {
        // Se não existe, criar um registro (pode acontecer com convidados)
        await prisma.sessionParticipant.create({
          data: {
            sessionId: sessionId,
            userId: userId,
            selectedCard: cardValue,
            isActive: true
          }
        })
      }
    } catch (error) {
      console.error('Erro ao persistir voto:', error)
      throw error
    }
  }

  // Limpar votos de todos os participantes da sessão
  static async clearVotes(sessionId: string) {
    const prisma = this.getInstance()
    
    try {
      await prisma.sessionParticipant.updateMany({
        where: { sessionId: sessionId },
        data: { selectedCard: null }
      })
    } catch (error) {
      console.error('Erro ao limpar votos:', error)
      throw error
    }
  }

  // Atualizar currentTicketId da sessão
  static async updateCurrentTicket(sessionId: string, ticketId: string | null) {
    const prisma = this.getInstance()
    
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: { currentTicketId: ticketId }
      })
    } catch (error) {
      console.error('Erro ao atualizar currentTicketId:', error)
      throw error
    }
  }

  // Marcar participante como inativo (não deletar)
  static async markParticipantInactive(sessionId: string, userId: string) {
    const prisma = this.getInstance()
    
    try {
      await prisma.sessionParticipant.updateMany({
        where: {
          sessionId: sessionId,
          userId: userId
        },
        data: {
          isActive: false,
          leftAt: new Date()
        }
      })
    } catch (error) {
      console.error('Erro ao marcar participante como inativo:', error)
      throw error
    }
  }

  // Desconectar do Prisma (para cleanup)
  static async disconnect() {
    if (PrismaService.instance) {
      await PrismaService.instance.$disconnect()
    }
  }
}

export default PrismaService 