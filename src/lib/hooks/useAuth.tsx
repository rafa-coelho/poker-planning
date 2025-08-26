'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiService } from '@/lib/services/apiService';
import { JWTPayload } from '@/types/auth';

// Tipo para o usuário autenticado (diferente do JWT payload)
interface AuthenticatedUser {
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
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  apiService: ApiService;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleAuthFailure = () => {
    // Logout automático quando a autenticação falhar
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    
    // Redirecionar para login se estiver em área autenticada
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const publicPaths = [
        '/login', 
        '/register', 
        '/forgot-password', 
        '/reset-password',
        '/join' // Permitir acesso à página de join sem autenticação
      ];
      
      // Verificar se é uma rota de join de sessão
      const isJoinRoute = /^\/[^\/]+\/join$/.test(currentPath) || /^\/[^\/]+\/[^\/]+$/.test(currentPath); // também permitir página do board
      
      if (!publicPaths.some(path => currentPath.startsWith(path)) && !isJoinRoute) {
        window.location.href = '/login';
      }
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      if (!refreshTokenValue) {
        return false;
      }

      const apiService = new ApiService(refreshToken, handleAuthFailure);
      const response = await apiService.refreshToken();

      if (response.success && response.data) {
        localStorage.setItem('accessToken', response.data.accessToken);
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        return true;
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      return false;
    }
  };

  const checkAuth = async () => {
    try {
      // Se há um token de convidado público, não tentar autenticação completa
      const publicToken = localStorage.getItem('publicParticipantToken');
      if (publicToken) {
        // Para convidados, apenas marcar como não autenticado mas não fazer chamada
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Se não há accessToken, não tentar autenticação
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const apiService = new ApiService(refreshToken, handleAuthFailure);
      const response = await apiService.checkAuth();

      if (response.success && response.data) {
        setUser(response.data.user);
      } else {
        // Token inválido ou expirado
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const apiService = new ApiService(refreshToken, handleAuthFailure);
      const response = await apiService.login(email, password);

      if (response.success && response.data) {
        localStorage.setItem('accessToken', response.data.accessToken);
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        setUser(response.data.user);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      const apiService = new ApiService(refreshToken, handleAuthFailure);
      const response = await apiService.register(userData);

      if (response.success && response.data) {
        localStorage.setItem('accessToken', response.data.accessToken);
        if (response.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        setUser(response.data.user);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const apiService = new ApiService(refreshToken, handleAuthFailure);
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (user) {
      await checkAuth();
    }
  };

  // Create the main ApiService instance, passing the AuthProvider's refreshToken function as callback
  const apiService = new ApiService(refreshToken, handleAuthFailure);

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    refreshToken,
    apiService,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}