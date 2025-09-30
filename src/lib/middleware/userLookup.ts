import { prisma } from '../db'

/**
 * Busca usuário no banco com suporte a account linking (IdP)
 * Se o token for do IdP, busca por externalId
 * Caso contrário, busca por userId normal
 */
export async function findUserByTokenPayload(decoded: any) {
  let user = null
  
  // Se for token do IdP, buscar por externalId primeiro
  if (decoded.isExternalIdp && decoded.externalSub) {
    user = await prisma.user.findFirst({
      where: {
        externalId: decoded.externalSub,
        externalSource: 'idp',
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        isActive: true
      }
    })
  }
  
  // Se não achou por externalId ou é token interno, buscar por userId
  if (!user) {
    user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        isActive: true
      }
    })
  }
  
  return user
}
