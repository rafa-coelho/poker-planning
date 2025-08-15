'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { PublicParticipantToken } from '@/lib/auth/publicAuth';

interface PublicAuthContextType {
  publicParticipant: PublicParticipantToken | null;
  isPublicParticipant: boolean;
  setPublicParticipant: (token: string | null) => void;
  logout: () => void;
  isInitialized: boolean;
}

const PublicAuthContext = createContext<PublicAuthContextType | undefined>(undefined);

export function PublicAuthProvider({ children }: { children: React.ReactNode }) {
  const [publicParticipant, setPublicParticipantState] = useState<PublicParticipantToken | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Carregar token do localStorage na inicialização
  useEffect(() => {
    const token = localStorage.getItem('publicParticipantToken');
    if (token) {
      const decoded = decodeJwt(token);
      if (decoded && decoded.type === 'public_participant') {
        setPublicParticipantState(decoded as PublicParticipantToken);
      } else {
        localStorage.removeItem('publicParticipantToken');
      }
    }
    setInitialized(true);
  }, []);

  const setPublicParticipant = (token: string | null) => {
    if (token) {
      const decoded = decodeJwt(token);
      if (decoded && decoded.type === 'public_participant') {
        setPublicParticipantState(decoded as PublicParticipantToken);
        localStorage.setItem('publicParticipantToken', token);
      } else {
        // Mesmo se não conseguir decodificar, ainda persistimos para uso em chamadas
        localStorage.setItem('publicParticipantToken', token);
      }
    } else {
      setPublicParticipantState(null);
      localStorage.removeItem('publicParticipantToken');
    }
  };

  const logout = () => {
    setPublicParticipantState(null);
    localStorage.removeItem('publicParticipantToken');
  };

  return (
    <PublicAuthContext.Provider value={{
      publicParticipant,
      isPublicParticipant: !!publicParticipant,
      setPublicParticipant,
      logout,
      isInitialized: initialized
    }}>
      {children}
    </PublicAuthContext.Provider>
  );
}

// Decodifica payload de um JWT sem verificar assinatura (apenas para leitura de campos no cliente)
function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch (e) {
    try {
      // Fallback sem escape
      const payload = token.split('.')[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}

export function usePublicAuth() {
  const context = useContext(PublicAuthContext);
  if (context === undefined) {
    throw new Error('usePublicAuth must be used within a PublicAuthProvider');
  }
  return context;
}
