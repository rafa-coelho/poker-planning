// fetch já configurado globalmente no setup.ts

const BASE_URL = 'http://localhost:3000/api'

interface LoginResponse {
  accessToken: string
}

interface ApiResponse<T> {
  [key: string]: T
}

// Tipos para os objetos retornados pelas APIs
interface Session {
  id: string
  name: string
  description?: string
  status: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

interface Ticket {
  id: string
  title: string
  description?: string
  status: string
  sessionId: string
  createdAt: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
  description?: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  organizationId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Usuários de seeds-multi-tenant.ts
const users = {
  techcorp: { email: 'joao@techcorp.com', password: 'admin123' },
  startup: { email: 'carlos@startupxyz.com', password: 'admin123' },
  enterprise: { email: 'john@enterprise.com', password: 'admin123' }
}

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  const data = await res.json() as LoginResponse
  return data.accessToken
}

describe('Isolamento Multi-Tenant', () => {
  let techcorpToken: string
  let startupToken: string

  beforeAll(async () => {
    techcorpToken = await login(users.techcorp.email, users.techcorp.password)
    startupToken = await login(users.startup.email, users.startup.password)
  })

  it('Usuário da TechCorp NÃO vê sessões da StartupXYZ', async () => {
    // Buscar sessões da StartupXYZ
    const res = await fetch(`${BASE_URL}/sessions`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${startupToken}` }
    })
    const { sessions } = await res.json() as ApiResponse<Session[]>
    // Buscar sessões da TechCorp
    const res2 = await fetch(`${BASE_URL}/sessions`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${techcorpToken}` }
    })
    const { sessions: sessions2 } = await res2.json() as ApiResponse<Session[]>
    // IDs não podem se misturar
    const startupSessionIds = sessions.map((s: Session) => s.id)
    const techcorpSessionIds = sessions2.map((s: Session) => s.id)
    expect(startupSessionIds.some((id: string) => techcorpSessionIds.includes(id))).toBe(false)
  })

  it('Usuário da TechCorp NÃO vê tickets da StartupXYZ', async () => {
    const res = await fetch(`${BASE_URL}/tickets`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${startupToken}` }
    })
    const { tickets } = await res.json() as ApiResponse<Ticket[]>
    const res2 = await fetch(`${BASE_URL}/tickets`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${techcorpToken}` }
    })
    const { tickets: tickets2 } = await res2.json() as ApiResponse<Ticket[]>
    const startupTicketIds = tickets.map((t: Ticket) => t.id)
    const techcorpTicketIds = tickets2.map((t: Ticket) => t.id)
    expect(startupTicketIds.some((id: string) => techcorpTicketIds.includes(id))).toBe(false)
  })

  it('Usuário da TechCorp NÃO vê projetos da StartupXYZ', async () => {
    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${startupToken}` }
    })
    const { projects } = await res.json() as ApiResponse<Project[]>
    const res2 = await fetch(`${BASE_URL}/projects`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${techcorpToken}` }
    })
    const { projects: projects2 } = await res2.json() as ApiResponse<Project[]>
    const startupProjectIds = projects.map((p: Project) => p.id)
    const techcorpProjectIds = projects2.map((p: Project) => p.id)
    expect(startupProjectIds.some((id: string) => techcorpProjectIds.includes(id))).toBe(false)
  })

  it('Usuário da TechCorp NÃO vê usuários da StartupXYZ', async () => {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${startupToken}` }
    })
    const { users: startupUsers } = await res.json() as ApiResponse<User[]>
    const res2 = await fetch(`${BASE_URL}/users`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${techcorpToken}` }
    })
    const { users: techcorpUsers } = await res2.json() as ApiResponse<User[]>
    const startupUserEmails = startupUsers.map((u: User) => u.email)
    const techcorpUserEmails = techcorpUsers.map((u: User) => u.email)
    expect(startupUserEmails.some((email: string) => techcorpUserEmails.includes(email))).toBe(false)
  })
}) 