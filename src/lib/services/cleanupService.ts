import { prisma } from '@/lib/db'

/**
 * Service para limpeza automática de dados
 */
export class CleanupService {
  /**
   * Executa limpeza de todos os dados expirados
   */
  static async runCleanup() {
    console.log('🧹 Iniciando limpeza automática...')
    
    const startTime = Date.now()
    let totalCleaned = 0

    try {
      // Limpar participantes públicos expirados
      const publicParticipantsCleaned = await this.cleanupExpiredPublicParticipants()
      totalCleaned += publicParticipantsCleaned

      // Limpar convites expirados
      const invitesCleaned = await this.cleanupExpiredInvites()
      totalCleaned += invitesCleaned

      // Limpar tokens de reset de senha expirados
      const resetTokensCleaned = await this.cleanupExpiredResetTokens()
      totalCleaned += resetTokensCleaned

      const duration = Date.now() - startTime
      console.log(`✅ Limpeza concluída: ${totalCleaned} registros removidos em ${duration}ms`)

      return {
        success: true,
        totalCleaned,
        duration,
        details: {
          publicParticipants: publicParticipantsCleaned,
          invites: invitesCleaned,
          resetTokens: resetTokensCleaned
        }
      }

    } catch (error) {
      console.error('❌ Erro durante limpeza automática:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalCleaned,
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Limpa participantes públicos expirados
   */
  private static async cleanupExpiredPublicParticipants(): Promise<number> {
    try {
      const result = await prisma.publicParticipant.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })

      if (result.count > 0) {
        console.log(`🧹 Limpeza automática: ${result.count} participantes públicos expirados removidos`)
      }

      return result.count
    } catch (error) {
      console.error('Erro ao limpar participantes públicos expirados:', error)
      return 0
    }
  }

  /**
   * Limpa convites expirados
   */
  private static async cleanupExpiredInvites(): Promise<number> {
    try {
      const result = await prisma.invite.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })

      if (result.count > 0) {
        console.log(`🧹 Limpeza automática: ${result.count} convites expirados removidos`)
      }

      return result.count
    } catch (error) {
      console.error('Erro ao limpar convites expirados:', error)
      return 0
    }
  }

  /**
   * Limpa tokens de reset de senha expirados
   */
  private static async cleanupExpiredResetTokens(): Promise<number> {
    try {
      const result = await prisma.user.updateMany({
        where: {
          resetTokenExpiresAt: {
            lt: new Date()
          },
          resetToken: {
            not: null
          }
        },
        data: {
          resetToken: null,
          resetTokenExpiresAt: null
        }
      })

      if (result.count > 0) {
        console.log(`🧹 Limpeza automática: ${result.count} tokens de reset expirados removidos`)
      }

      return result.count
    } catch (error) {
      console.error('Erro ao limpar tokens de reset expirados:', error)
      return 0
    }
  }



  /**
   * Executa limpeza manual (para testes ou comandos administrativos)
   */
  static async manualCleanup() {
    console.log('🔧 Executando limpeza manual...')
    return await this.runCleanup()
  }
}
