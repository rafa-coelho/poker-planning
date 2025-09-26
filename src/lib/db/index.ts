import { PrismaClient } from '@prisma/client'
import { APP_CONFIG } from '@nyx/config'

/**
 * Instância global do Prisma Client
 * Evita criar múltiplas conexões durante o desenvolvimento (hot reload)
 */

declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma = global.__prisma || new PrismaClient({
  log: APP_CONFIG.IS_DEVELOPMENT ? ['query', 'error', 'warn'] : ['error']
})

if (APP_CONFIG.IS_DEVELOPMENT) {
  global.__prisma = prisma
}

/**
 * Utility para desconectar o Prisma (útil em testes)
 */
export async function disconnectDb() {
  await prisma.$disconnect()
}

/**
 * Utility para verificar conexão com o banco
 */
export async function checkDbConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
} 