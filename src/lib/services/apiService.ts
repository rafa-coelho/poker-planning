/**
 * Service centralizado para todas as chamadas de API
 * Inclui tratamento automático de refresh de token
 */

import i18next from 'i18next';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    timestamp: string;
  };
  pagination?: {
    page: number;
    total: number;
    totalPages: number;
    limit: number;
  };
}

interface Session {
  id: string;
  name: string;
  description?: string;
  currentTicketId: string|null;
  status: string;
  votingMode: string;
  autoReveal: boolean;
  allowObservers: boolean;
  isRevealed: boolean;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
  participants: Array<{
    id: string;
    role: string;
    isActive: boolean;
    joinedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
  }>;
  tickets: Array<{
    id: string;
    title: string;
    status: string;
    finalEstimate?: string;
  }>;
  _count: {
    participants: number;
    tickets: number;
  };
  createdBy: {
    name: string;
    email: string;
  };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    sessions: number;
  };
}

interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  sessionId: string;
  finalEstimate?: string;
  createdAt: string;
  updatedAt: string;
  votes: Array<{
    id: string;
    value: string;
    userId: string;
    createdAt: string;
  }>;
}

interface CreateSessionData {
  name: string;
  description?: string;
  projectId?: string;
  votingMode?: string;
  autoReveal?: boolean;
  allowObservers?: boolean;
}

interface UpdateSessionData {
  name?: string;
  description?: string;
  status?: string;
  votingMode?: string;
  autoReveal?: boolean;
  allowObservers?: boolean;
}

class ApiService {
  private baseUrl: string;
  private refreshTokenFn: () => Promise<boolean>;
  private onAuthFailure?: () => void;

  constructor(refreshTokenFn: () => Promise<boolean>, onAuthFailure?: () => void) {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    this.refreshTokenFn = refreshTokenFn;
    this.onAuthFailure = onAuthFailure;
  }

  /**
   * Executa uma requisição HTTP com tratamento automático de refresh de token
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    let response = await fetch(`${this.baseUrl}${endpoint}`, options);

    // Se receber 401, tentar refresh do token
    if (response.status === 401) {
      const refreshSuccess = await this.refreshTokenFn();
      
      if (refreshSuccess) {
        // Tentar a requisição novamente com o novo token
        const newToken = localStorage.getItem('accessToken');
        if (newToken) {
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`,
          };
          response = await fetch(`${this.baseUrl}${endpoint}`, options);
        }
      } else {
        // Refresh falhou, chamar callback de logout
        this.onAuthFailure?.();
        
        // Retornar erro de autenticação
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: i18next.t('api.errors.authenticationFailed'),
            timestamp: new Date().toISOString()
          }
        };
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorCode = errorData.error?.code || 'API_ERROR';
      
      // Tratamento especial para erros críticos de tenant
      if (response.status === 503 && errorCode === 'DATABASE_ERROR') {
        return {
          success: false,
          error: {
            code: errorCode,
            message: 'Erro temporário de conexão. Recarregue a página em alguns segundos.',
            timestamp: new Date().toISOString()
          }
        };
      }
      
      if (response.status === 403 && errorCode === 'USER_NOT_IN_ORGANIZATION') {
        // Logout automaticamente se o usuário não pertence mais à organização
        this.onAuthFailure?.();
        return {
          success: false,
          error: {
            code: errorCode,
            message: 'Sua conta foi removida desta organização. Faça login novamente.',
            timestamp: new Date().toISOString()
          }
        };
      }
      
      if (response.status === 404 && errorCode === 'ORGANIZATION_NOT_FOUND') {
        // Logout automaticamente se a organização não existe mais
        this.onAuthFailure?.();
        return {
          success: false,
          error: {
            code: errorCode,
            message: 'Esta organização não existe mais. Faça login novamente.',
            timestamp: new Date().toISOString()
          }
        };
      }
      
      if (response.status === 403 && errorCode === 'ORGANIZATION_INACTIVE') {
        // Logout automaticamente se a organização foi desativada
        this.onAuthFailure?.();
        return {
          success: false,
          error: {
            code: errorCode,
            message: 'Esta organização foi desativada. Entre em contato com o administrador.',
            timestamp: new Date().toISOString()
          }
        };
      }
      
      return {
        success: false,
        error: {
          code: errorCode,
          message: errorData.error?.message || i18next.t('api.errors.generic', { status: response.status, statusText: response.statusText }),
          timestamp: new Date().toISOString()
        }
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data.data || data,
      pagination: data.pagination
    };
  }

  // ===== SESSÕES =====

  /**
   * Lista sessões com paginação e filtros
   */
  async listSessions(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    projectId?: string;
  } = {}): Promise<ApiResponse<Session[]>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.status) searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);
    if (params.projectId) searchParams.append('projectId', params.projectId);

    const queryString = searchParams.toString();
    const endpoint = `/api/sessions${queryString ? `?${queryString}` : ''}`;

    return this.request<Session[]>(endpoint);
  }

  /**
   * Busca uma sessão específica por ID
   */
  async getSession(sessionId: string): Promise<ApiResponse<Session>> {
    return this.request<Session>(`/api/sessions/${sessionId}`);
  }

  /**
   * Cria uma nova sessão
   */
  async createSession(data: CreateSessionData): Promise<ApiResponse<Session>> {
    return this.request<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Atualiza uma sessão existente
   */
  async updateSession(sessionId: string, data: UpdateSessionData): Promise<ApiResponse<Session>> {
    return this.request<Session>(`/api/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Arquivar (soft delete) uma sessão
   */
  async archiveSession(sessionId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  }

  // ===== AUTENTICAÇÃO =====

  /**
   * Login do usuário
   */
  async login(email: string, password: string): Promise<ApiResponse<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      organizationId: string;
      organizationSlug: string;
      avatar?: string;
      locale: string;
      timezone: string;
      isActive: boolean;
      lastLoginAt?: string;
      createdAt: string;
    };
  }>> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: i18next.t('api.errors.loginFailed'),
          timestamp: new Date().toISOString()
        }
      };
    }

    const data = await response.json();
    return {
      success: true,
      data
    };
  }

  /**
   * Registro de novo usuário
   */
  async register(userData: {
    name: string;
    email: string;
    password: string;
    organizationName: string;
  }): Promise<ApiResponse<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      organizationId: string;
      organizationSlug: string;
      avatar?: string;
      locale: string;
      timezone: string;
      isActive: boolean;
      lastLoginAt?: string;
      createdAt: string;
    };
  }>> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'REGISTER_FAILED',
          message: i18next.t('api.errors.registerFailed'),
          timestamp: new Date().toISOString()
        }
      };
    }

    const data = await response.json();
    return {
      success: true,
      data
    };
  }

  /**
   * Logout do usuário
   */
  async logout(): Promise<ApiResponse<void>> {
    return this.request<void>('/api/auth/logout', {
      method: 'POST'
    });
  }

  /**
   * Verifica se o usuário está autenticado
   */
  async checkAuth(): Promise<ApiResponse<{
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      organizationId: string;
      organizationSlug: string;
      avatar?: string;
      locale: string;
      timezone: string;
      isActive: boolean;
      lastLoginAt?: string;
      createdAt: string;
    };
    organization: {
      id: string;
      name: string;
      slug: string;
      plan: string;
      logoUrl?: string;
    };
    permissions: {
      maxSessions: number;
      maxParticipants: number;
      hasAdvancedReports: boolean;
      hasCustomBranding: boolean;
      hasSSO: boolean;
      hasAPI: boolean;
    };
  }>> {
    return this.request<{
      user: {
        id: string;
        email: string;
        name: string;
        role: string;
        organizationId: string;
        organizationSlug: string;
        avatar?: string;
        locale: string;
        timezone: string;
        isActive: boolean;
        lastLoginAt?: string;
        createdAt: string;
      };
      organization: {
        id: string;
        name: string;
        slug: string;
        plan: string;
        logoUrl?: string;
      };
      permissions: {
        maxSessions: number;
        maxParticipants: number;
        hasAdvancedReports: boolean;
        hasCustomBranding: boolean;
        hasSSO: boolean;
        hasAPI: boolean;
      };
    }>('/api/auth/me');
  }

  /**
   * Refresh do token de acesso
   */
  async refreshToken(): Promise<ApiResponse<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }>> {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    
    if (!refreshTokenValue) {
      return {
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: i18next.t('api.errors.noRefreshToken'),
          timestamp: new Date().toISOString()
        }
      };
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'REFRESH_FAILED',
          message: i18next.t('api.errors.refreshFailed'),
          timestamp: new Date().toISOString()
        }
      };
    }

    const data = await response.json();
    return {
      success: true,
      data
    };
  }

  // ===== PROJETOS =====

  /**
   * Lista projetos da organização
   */
  async listProjects(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<ApiResponse<Project[]>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = `/api/projects${queryString ? `?${queryString}` : ''}`;

    return this.request<Project[]>(endpoint);
  }

  /**
   * Busca um projeto específico por ID
   */
  async getProject(projectId: string): Promise<ApiResponse<Project>> {
    return this.request<Project>(`/api/projects/${projectId}`);
  }

  // ===== TICKETS =====

  /**
   * Lista tickets de uma sessão
   */
  async listTickets(sessionId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<ApiResponse<Ticket[]>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.status) searchParams.append('status', params.status);

    const queryString = searchParams.toString();
    const endpoint = `/api/sessions/${sessionId}/tickets${queryString ? `?${queryString}` : ''}`;

    return this.request<Ticket[]>(endpoint);
  }

  /**
   * Alias para listTickets - busca tickets de uma sessão
   */
  async getSessionTickets(sessionId: string): Promise<ApiResponse<Ticket[]>> {
    return this.listTickets(sessionId);
  }

  /**
   * Cria um novo ticket
   */
  async createTicket(sessionId: string, data: {
    title: string;
    description?: string;
    priority?: string;
  }): Promise<ApiResponse<Ticket>> {
    return this.request<Ticket>(`/api/sessions/${sessionId}/tickets`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Busca um ticket específico por ID
   */
  async getTicket(ticketId: string): Promise<ApiResponse<Ticket>> {
    return this.request<Ticket>(`/api/tickets/${ticketId}`);
  }

  /**
   * Atualiza um ticket específico
   */
  async updateTicket(ticketId: string, data: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    finalEstimate?: string;
    averageVote?: number;
  }): Promise<ApiResponse<Ticket>> {
    return this.request<Ticket>(`/api/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Remove um ticket
   */
  async deleteTicket(ticketId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/tickets/${ticketId}`, {
      method: 'DELETE'
    });
  }

  // ===== USUÁRIOS =====

  /**
   * Lista usuários da organização
   */
  async listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  } = {}): Promise<ApiResponse<{
    users: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      isActive: boolean;
      lastLoginAt: string | null;
      createdAt: string;
      avatar?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.role) searchParams.append('role', params.role);
    if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString());

    const queryString = searchParams.toString();
    const endpoint = `/api/users${queryString ? `?${queryString}` : ''}`;

    return this.request<{
      users: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        isActive: boolean;
        lastLoginAt: string | null;
        createdAt: string;
        avatar?: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(endpoint);
  }

  /**
   * Busca um usuário específico por ID
   */
  async getUser(userId: string): Promise<ApiResponse<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    avatar?: string;
    locale: string;
    timezone: string;
  }>> {
    return this.request<{
      id: string;
      name: string;
      email: string;
      role: string;
      isActive: boolean;
      lastLoginAt: string | null;
      createdAt: string;
      avatar?: string;
      locale: string;
      timezone: string;
    }>(`/api/users/${userId}`);
  }

  /**
   * Cria um novo usuário
   */
  async createUser(data: {
    name: string;
    email: string;
    role: string;
    isActive?: boolean;
  }): Promise<ApiResponse<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }>> {
    return this.request<{
      id: string;
      name: string;
      email: string;
      role: string;
      isActive: boolean;
      createdAt: string;
    }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Atualiza um usuário existente
   */
  async updateUser(userId: string, data: {
    name?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    updatedAt: string;
  }>> {
    return this.request<{
      id: string;
      name: string;
      email: string;
      role: string;
      isActive: boolean;
      lastLoginAt: string | null;
      updatedAt: string;
    }>(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * Desativa um usuário (soft delete)
   */
  async deleteUser(userId: string): Promise<ApiResponse<{
    message: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>> {
    return this.request<{
      message: string;
      user: {
        id: string;
        name: string;
        email: string;
      };
    }>(`/api/users/${userId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Dispara email de reset de senha para um usuário
   */
  async sendUserPasswordReset(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  }

  // ===== MÉTODOS GENÉRICOS =====

  /**
   * Método genérico GET
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  /**
   * Método genérico POST
   */
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Método genérico PUT
   */
  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Método genérico PATCH
   */
  async patch<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * Método genérico DELETE
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE'
    });
  }
}

export { ApiService };
export type { ApiResponse, Session, Project, Ticket, CreateSessionData, UpdateSessionData };