// Phase 1 minimal: placeholder for domain shared types
// Intentionally avoids importing Prisma schema. Will be expanded in Phase 1.1.

export interface OrganizationIdRef {
  organizationId: string
}

export interface EntityBase {
  id: string
  createdAt?: Date
  updatedAt?: Date
}

export type BrandId<T extends string> = string & { __brand: T }


