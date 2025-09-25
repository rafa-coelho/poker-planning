// Re-exports for auth utilities and middlewares
// Phase 1 minimal refactor: centralize auth exports without moving original files

// JWT utilities
export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  getTokenTimeRemaining,
  extractTokenFromHeader,
  isTokenNearExpiration,
  generateTokenId,
  hasFeaturePermission,
  isWithinFeatureLimit,
  generateSecureToken,
} from '../../../src/lib/auth/jwt'

// Roles and permissions
export {
  UserRole,
  hasPermission,
  hasRole,
  hasAnyRole,
  getUserPermissions,
  canManageUser,
  getMaxAssignableRole,
  ROLE_HIERARCHY,
  PERMISSIONS,
} from '../../../src/lib/auth/roles'
export type { Permission, UserWithRole } from '../../../src/lib/auth/roles'

// Middlewares
export { authenticateRequest } from '../../../src/lib/middleware/auth'
export {
  requirePermission,
  requireRole,
  requireAuth,
  getAuthenticatedUser,
} from '../../../src/lib/middleware/authorization'
export { withTenantIsolation } from '../../../src/lib/middleware/tenant'


