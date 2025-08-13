// ========================================
// 🔐 SISTEMA DE ROLES E PERMISSÕES
// ========================================

// Definindo o enum localmente para evitar conflitos de TypeScript
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

// ========================================
// 📋 HIERARQUIA DE ROLES
// ========================================
export const ROLE_HIERARCHY = {
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.MEMBER]: 2,
  [UserRole.VIEWER]: 1
} as const;

// ========================================
// 🔑 PERMISSÕES POR AÇÃO
// ========================================
export const PERMISSIONS = {
  // Gestão de Usuários
  'users:read': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'users:create': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'users:update': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'users:delete': [UserRole.SUPER_ADMIN],
  'users:change_role': [UserRole.SUPER_ADMIN, UserRole.ADMIN],

  // Gestão de Times
  'teams:read': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'teams:create': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'teams:update': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'teams:delete': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'teams:manage_members': [UserRole.SUPER_ADMIN, UserRole.ADMIN],

  // Gestão de Projetos
  'projects:read': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MEMBER],
  'projects:create': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'projects:update': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'projects:delete': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'projects:manage_members': [UserRole.SUPER_ADMIN, UserRole.ADMIN],

  // Sessões de Poker
  'sessions:read': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MEMBER, UserRole.VIEWER],
  'sessions:create': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MEMBER],
  'sessions:update': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MEMBER],
  'sessions:delete': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'sessions:moderate': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MEMBER],

  // Tickets/Estimativas
  'tickets:read': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MEMBER, UserRole.VIEWER],
  'tickets:create': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MEMBER],
  'tickets:update': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MEMBER],
  'tickets:delete': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'tickets:vote': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MEMBER],

  // Relatórios e Analytics
  'reports:read': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'reports:export': [UserRole.SUPER_ADMIN, UserRole.ADMIN],

  // Configurações da Organização
  'organization:read': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'organization:update': [UserRole.SUPER_ADMIN],
  'organization:delete': [UserRole.SUPER_ADMIN],

  // Convites
  'invites:create': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'invites:read': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  'invites:delete': [UserRole.SUPER_ADMIN, UserRole.ADMIN]
} as const;

// ========================================
// 🛠️ UTILITIES DE VERIFICAÇÃO
// ========================================

/**
 * Verifica se um usuário tem uma role específica
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Verifica se um usuário tem permissão para uma ação específica
 */
export function hasPermission(userRole: UserRole, permission: keyof typeof PERMISSIONS): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(userRole as any);
}

/**
 * Verifica se um usuário tem pelo menos uma das roles fornecidas
 */
export function hasAnyRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.some(role => hasRole(userRole, role));
}

/**
 * Obtém todas as permissões de um usuário baseado em sua role
 */
export function getUserPermissions(userRole: UserRole): string[] {
  return Object.entries(PERMISSIONS)
    .filter(([_, allowedRoles]) => allowedRoles.includes(userRole as any))
    .map(([permission]) => permission);
}

/**
 * Verifica se um usuário pode gerenciar outro usuário
 */
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  // SUPER_ADMIN pode gerenciar todos
  if (managerRole === UserRole.SUPER_ADMIN) return true;
  
  // ADMIN pode gerenciar MEMBER e VIEWER
  if (managerRole === UserRole.ADMIN) {
    return targetRole === UserRole.MEMBER || targetRole === UserRole.VIEWER;
  }
  
  return false;
}

/**
 * Obtém a role mais alta que um usuário pode atribuir
 */
export function getMaxAssignableRole(userRole: UserRole): UserRole {
  switch (userRole) {
    case UserRole.SUPER_ADMIN:
      return UserRole.ADMIN;
    case UserRole.ADMIN:
      return UserRole.MEMBER;
    default:
      return UserRole.VIEWER;
  }
}

// ========================================
// 📝 TIPOS TYPESCRIPT
// ========================================

export type Permission = keyof typeof PERMISSIONS;

export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
}

// ========================================
// 🎯 CONSTANTES ÚTEIS
// ========================================

export const ROLE_LABELS = {
  [UserRole.SUPER_ADMIN]: 'Super Administrador',
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.MEMBER]: 'Membro',
  [UserRole.VIEWER]: 'Visualizador'
} as const;

export const ROLE_DESCRIPTIONS = {
  [UserRole.SUPER_ADMIN]: 'Controle total da organização',
  [UserRole.ADMIN]: 'Gestão de usuários, times e projetos',
  [UserRole.MEMBER]: 'Participação em sessões e projetos',
  [UserRole.VIEWER]: 'Apenas visualização'
} as const; 