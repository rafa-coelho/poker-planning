// Phase 1 minimal: centralize domain types and enums via re-exports
export * from '../../../prisma/schema.prisma'
// Note: Prisma schema is not directly importable as TS; in Phase 1 we avoid
// moving code and instead will define shared TypeScript interfaces here in Phase 1.1
// For now, this package acts as a placeholder to establish the package boundary.

export interface OrganizationIdRef {
  organizationId: string
}

export interface EntityBase {
  id: string
  createdAt?: Date
  updatedAt?: Date
}


