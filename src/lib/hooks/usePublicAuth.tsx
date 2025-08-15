'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { verifyPublicParticipantToken, PublicParticipantToken } from '@/lib/auth/publicAuth';

interface PublicAuthContextType {
  publicParticipant: PublicParticipantToken | null;
  isPublicParticipant: boolean;
  setPublicParticipant: (token: string | null) => void;
  logout: () => void;
}

const PublicAuthContext = createContext<PublicAuthContextType | undefined>(undefined);

export function PublicAuthProvider({ children }: { children: React.ReactNode }) {
  const [publicParticipant, setPublicParticipantState] = useState<PublicParticipantToken | null>(null);

  // Carregar token do localStorage na inicialização
  useEffect(() => {
    const token = localStorage.getItem('publicParticipantToken');
    if (token) {
      const decoded = verifyPublicParticipantToken(token);
      if (decoded) {
        setPublicParticipantState(decoded);
      } else {
        // Token inválido, remover do localStorage
        localStorage.removeItem('publicParticipantToken');
      }
    }
  }, []);

  const setPublicParticipant = (token: string | null) => {
    if (token) {
      const decoded = verifyPublicParticipantToken(token);
      if (decoded) {
        setPublicParticipantState(decoded);
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
      logout
    }}>
      {children}
    </PublicAuthContext.Provider>
  );
}

export function usePublicAuth() {
  const context = useContext(PublicAuthContext);
  if (context === undefined) {
    throw new Error('usePublicAuth must be used within a PublicAuthProvider');
  }
  return context;
}
