import { prisma } from '@/lib/db'
import crypto from 'crypto'

interface ApiKeyData {
  id: string
  userId: string
  organizationId: string
  name: string
  permissions: string[]
  isActive: boolean
  lastUsedAt?: Date
}

/**
 * Verifica se uma API key é válida e retorna os dados associados
 * @param apiKey - API key para verificar
 * @returns Dados da API key ou null se inválida
 */
export async function verifyApiKey(apiKey: string): Promise<ApiKeyData | null> {
  try {
    // Em produção, buscar API key do banco de dados
    // Por enquanto, usar mock para desenvolvimento
    
    // Mock de API keys para desenvolvimento
    const mockApiKeys: Record<string, ApiKeyData> = {
      'pk_test_123456789': {
        id: '1',
        userId: 'user_1',
        organizationId: 'org_1',
        name: 'Test API Key',
        permissions: ['sessions:read', 'sessions:write'],
        isActive: true
      },
      'pk_live_987654321': {
        id: '2',
        userId: 'user_2',
        organizationId: 'org_2',
        name: 'Production API Key',
        permissions: ['sessions:read', 'sessions:write', 'users:read'],
        isActive: true
      }
    }

    const apiKeyData = mockApiKeys[apiKey]
    
    if (!apiKeyData || !apiKeyData.isActive) {
      return null
    }

    // Atualizar último uso (em produção)
    // await prisma.apiKey.update({
    //   where: { id: apiKeyData.id },
    //   data: { lastUsedAt: new Date() }
    // })

    return apiKeyData
  } catch (error) {
    console.error('[API Key] Error verifying API key:', error)
    return null
  }
}

/**
 * Verifica se a API key tem permissão para uma ação específica
 * @param apiKey - API key para verificar
 * @param permission - Permissão necessária
 * @returns true se tem permissão
 */
export async function checkApiKeyPermission(
  apiKey: string, 
  permission: string
): Promise<boolean> {
  const apiKeyData = await verifyApiKey(apiKey)
  
  if (!apiKeyData) {
    return false
  }

  return apiKeyData.permissions.includes(permission) || 
         apiKeyData.permissions.includes('*') // Permissão wildcard
}

/**
 * Gera uma nova API key
 * @param userId - ID do usuário
 * @param organizationId - ID da organização
 * @param name - Nome da API key
 * @param permissions - Lista de permissões
 * @returns API key gerada
 */
export async function generateApiKey(
  userId: string,
  organizationId: string,
  name: string,
  permissions: string[]
): Promise<string> {
  try {
    // Gerar API key única
    const apiKey = `pk_${crypto.randomBytes(32).toString('hex')}`
    
    // Em produção, salvar no banco de dados
    // await prisma.apiKey.create({
    //   data: {
    //     key: apiKey,
    //     userId,
    //     organizationId,
    //     name,
    //     permissions,
    //     isActive: true
    //   }
    // })

    console.log(`[API Key] Generated new API key: ${apiKey}`)
    
    return apiKey
  } catch (error) {
    console.error('[API Key] Error generating API key:', error)
    throw new Error('Failed to generate API key')
  }
}

/**
 * Revoga uma API key
 * @param apiKey - API key para revogar
 * @returns true se revogada com sucesso
 */
export async function revokeApiKey(apiKey: string): Promise<boolean> {
  try {
    // Em produção, desativar no banco de dados
    // await prisma.apiKey.update({
    //   where: { key: apiKey },
    //   data: { isActive: false }
    // })

    console.log(`[API Key] Revoked API key: ${apiKey}`)
    
    return true
  } catch (error) {
    console.error('[API Key] Error revoking API key:', error)
    return false
  }
}

/**
 * Lista API keys de um usuário
 * @param userId - ID do usuário
 * @returns Lista de API keys
 */
export async function listApiKeys(userId: string): Promise<any[]> {
  try {
    // Em produção, buscar do banco de dados
    // return await prisma.apiKey.findMany({
    //   where: { userId },
    //   select: {
    //     id: true,
    //     name: true,
    //     permissions: true,
    //     isActive: true,
    //     createdAt: true,
    //     lastUsedAt: true
    //   }
    // })

    // Mock para desenvolvimento
    return [
      {
        id: '1',
        name: 'Test API Key',
        permissions: ['sessions:read', 'sessions:write'],
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: new Date()
      }
    ]
  } catch (error) {
    console.error('[API Key] Error listing API keys:', error)
    return []
  }
}
