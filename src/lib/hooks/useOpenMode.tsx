'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { APP_CONFIG } from '@/lib/config';

interface OpenModeContextType {
  isOpenMode: boolean;
  openSessionData: any | null;
  setOpenSessionData: (data: any) => void;
  clearOpenSessionData: () => void;
  createOpenSession: (sessionData: any) => Promise<string>;
  joinOpenSession: (sessionId: string, participantName: string) => Promise<boolean>;
}

const OpenModeContext = createContext<OpenModeContextType | undefined>(undefined);

export function OpenModeProvider({ children }: { children: React.ReactNode }) {
  const [openSessionData, setOpenSessionDataState] = useState<any | null>(null);
  const isOpenMode = APP_CONFIG.OPEN_MODE;

  // Carregar dados da sessão do localStorage no modo aberto
  useEffect(() => {
    if (isOpenMode && typeof window !== 'undefined') {
      const savedSession = localStorage.getItem('openModeSession');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          setOpenSessionDataState(parsed);
        } catch (e) {
          localStorage.removeItem('openModeSession');
        }
      }
    }
  }, [isOpenMode]);

  const setOpenSessionData = (data: any) => {
    setOpenSessionDataState(data);
    if (isOpenMode && data && typeof window !== 'undefined') {
      localStorage.setItem('openModeSession', JSON.stringify(data));
    }
  };

  const clearOpenSessionData = () => {
    setOpenSessionDataState(null);
    if (isOpenMode && typeof window !== 'undefined') {
      localStorage.removeItem('openModeSession');
    }
  };

  const createOpenSession = async (sessionData: any): Promise<string> => {
    if (!isOpenMode) {
      throw new Error('Modo aberto não está habilitado');
    }

    try {
      const response = await fetch('/api/open/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar sessão');
      }

      const result = await response.json();
      return result.sessionId;
    } catch (error) {
      console.error('Erro ao criar sessão aberta:', error);
      throw error;
    }
  };

  const joinOpenSession = async (sessionId: string, participantName: string): Promise<boolean> => {
    if (!isOpenMode) {
      throw new Error('Modo aberto não está habilitado');
    }

    try {
      const response = await fetch(`/api/open/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: participantName }),
      });

      if (!response.ok) {
        throw new Error('Erro ao entrar na sessão');
      }

      const result = await response.json();
      
      // Salvar dados do usuário no localStorage
      if (result.participant && typeof window !== 'undefined') {
        localStorage.setItem(`openModeUser_${sessionId}`, JSON.stringify({
          id: result.participant.id,
          name: result.participant.name
        }));
      }
      
      setOpenSessionData(result);
      return true;
    } catch (error) {
      console.error('Erro ao entrar na sessão aberta:', error);
      throw error;
    }
  };

  return (
    <OpenModeContext.Provider value={{
      isOpenMode,
      openSessionData,
      setOpenSessionData,
      clearOpenSessionData,
      createOpenSession,
      joinOpenSession,
    }}>
      {children}
    </OpenModeContext.Provider>
  );
}

export function useOpenMode() {
  const context = useContext(OpenModeContext);
  if (context === undefined) {
    throw new Error('useOpenMode must be used within an OpenModeProvider');
  }
  return context;
}
