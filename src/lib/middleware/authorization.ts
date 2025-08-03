// ========================================
// 🔐 MIDDLEWARE DE AUTORIZAÇÃO
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '../auth/jwt';
import { hasPermission, UserRole, Permission } from '../auth/roles';
import { prisma } from '../db';

// ========================================
// 📋 TIPOS
// ========================================

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    organizationId: string;
  };
}

// ========================================
// 🛠️ MIDDLEWARE DE AUTORIZAÇÃO
// ========================================

/**
 * Middleware para verificar se o usuário tem permissão para uma ação específica
 */
export function requirePermission(permission: Permission) {
  return async (request: AuthenticatedRequest) => {
    try {
      // Verificar token
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json(
          { error: 'Token de autorização não fornecido' },
          { status: 401 }
        );
      }

      // Verificar e decodificar token
      const decoded = verifyAccessToken(token);
      
      if (!decoded) {
        return NextResponse.json(
          { error: 'Token inválido' },
          { status: 401 }
        );
      }

      // Buscar usuário no banco para obter role atualizada
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return NextResponse.json(
          { error: 'Usuário não encontrado ou inativo' },
          { status: 401 }
        );
      }

      // Verificar permissão
      if (!hasPermission(user.role as UserRole, permission)) {
        return NextResponse.json(
          { 
            error: 'Permissão insuficiente',
            requiredPermission: permission,
            userRole: user.role
          },
          { status: 403 }
        );
      }

      // Adicionar usuário ao request
      request.user = { ...user, role: user.role as UserRole };

      return null; // Continua para o handler
    } catch (error) {
      console.error('Erro no middleware de autorização:', error);
      return NextResponse.json(
        { error: 'Erro interno de autorização' },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware para verificar se o usuário tem uma role específica
 */
export function requireRole(requiredRole: UserRole) {
  return async (request: AuthenticatedRequest) => {
    try {
      // Verificar token
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json(
          { error: 'Token de autorização não fornecido' },
          { status: 401 }
        );
      }

      // Verificar e decodificar token
      const decoded = verifyAccessToken(token);
      
      if (!decoded) {
        return NextResponse.json(
          { error: 'Token inválido' },
          { status: 401 }
        );
      }

      // Buscar usuário no banco
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return NextResponse.json(
          { error: 'Usuário não encontrado ou inativo' },
          { status: 401 }
        );
      }

      // Verificar role
      if (user.role !== requiredRole) {
        return NextResponse.json(
          { 
            error: 'Role insuficiente',
            requiredRole,
            userRole: user.role
          },
          { status: 403 }
        );
      }

      // Adicionar usuário ao request
      request.user = { ...user, role: user.role as UserRole };

      return null; // Continua para o handler
    } catch (error) {
      console.error('Erro no middleware de autorização:', error);
      return NextResponse.json(
        { error: 'Erro interno de autorização' },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware para verificar se o usuário está autenticado (sem verificar permissões)
 */
export function requireAuth() {
  return async (request: AuthenticatedRequest) => {
    try {
      // Verificar token
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json(
          { error: 'Token de autorização não fornecido' },
          { status: 401 }
        );
      }

      // Verificar e decodificar token
      const decoded = verifyAccessToken(token);
      
      if (!decoded) {
        return NextResponse.json(
          { error: 'Token inválido' },
          { status: 401 }
        );
      }

      // Buscar usuário no banco
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return NextResponse.json(
          { error: 'Usuário não encontrado ou inativo' },
          { status: 401 }
        );
      }

      // Adicionar usuário ao request
      request.user = { ...user, role: user.role as UserRole };

      return null; // Continua para o handler
    } catch (error) {
      console.error('Erro no middleware de autenticação:', error);
      return NextResponse.json(
        { error: 'Erro interno de autenticação' },
        { status: 500 }
      );
    }
  };
}

// ========================================
// 🎯 UTILITIES PARA HANDLERS
// ========================================

/**
 * Helper para obter usuário autenticado do request
 */
export function getAuthenticatedUser(request: AuthenticatedRequest) {
  return request.user;
}

/**
 * Helper para verificar se usuário tem permissão
 */
export function checkPermission(request: AuthenticatedRequest, permission: Permission): boolean {
  const user = request.user;
  if (!user) return false;
  
  return hasPermission(user.role as UserRole, permission);
}

/**
 * Helper para verificar se usuário tem role
 */
export function checkRole(request: AuthenticatedRequest, requiredRole: UserRole): boolean {
  const user = request.user;
  if (!user) return false;
  
  return user.role === requiredRole;
} 