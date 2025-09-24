"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useTranslation } from "react-i18next";
import { APP_CONFIG } from "@/lib/config";

const HOST = process.env.NEXT_PUBLIC_SOCKET_URL || `http://${APP_CONFIG.HOST}:${APP_CONFIG.WS_PORT || 3001}`;

export interface OpenParticipant {
  id: string;
  name: string;
  selectedCard: string | null;
  isCurrentUser: boolean;
}

export interface OpenSessionState {
  sessionId: string;
  sessionName: string;
  participants: OpenParticipant[];
  isRevealed: boolean;
  currentTicketId?: string | null;
  votingMode?: string;
  expiresAt?: string;
  tickets?: any[];
}

export function useOpenSession() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { t } = useTranslation("common");

  const [sessionData, setSessionData] = useState<OpenSessionState>({
    sessionId,
    sessionName: "",
    participants: [],
    isRevealed: false,
    votingMode: undefined,
  });

  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [currentTicket, setCurrentTicket] = useState<any | null>(null);
  const [averageVote, setAverageVote] = useState<number | string | null>(null);
  const [showFinalEstimateModal, setShowFinalEstimateModal] = useState(false);
  const [participantNotification, setParticipantNotification] = useState<{ userName: string; type: 'left' | 'joined' } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  const socketRef = useRef<Socket | null>(null);
  const currentTicketRef = useRef<any | null>(null);

  // Carregar dados da sessão
  const loadSessionData = useCallback(async () => {
    try {
      const response = await fetch(`/api/open/sessions/${sessionId}`);
      const result = await response.json();

      if (result.success) {
        const session = result.session;
        
        // Verificar se a sessão expirou
        if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
          router.push(`/open/${sessionId}/expired`);
          return;
        }

        // Carregar dados do usuário do localStorage PRIMEIRO
        let userFromStorage = null;
        let stateFromStorage = null;
        if (typeof window !== 'undefined') {
          const savedUser = localStorage.getItem(`openModeUser_${sessionId}`);
          const savedState = localStorage.getItem(`openModeState_${sessionId}`);
          
          console.log('Tentando carregar usuário do localStorage:', savedUser);
          if (savedUser) {
            userFromStorage = JSON.parse(savedUser);
            console.log('Usuário carregado do localStorage:', userFromStorage);
            setCurrentUser(userFromStorage);
          } else {
            console.log('Nenhum usuário encontrado no localStorage para sessionId:', sessionId);
          }

          if (savedState) {
            stateFromStorage = JSON.parse(savedState);
            console.log('Estado carregado do localStorage:', stateFromStorage);
            
            // Verificar se o estado não é muito antigo (max 1 hora)
            const oneHour = 60 * 60 * 1000;
            if (Date.now() - stateFromStorage.lastUpdated > oneHour) {
              localStorage.removeItem(`openModeState_${sessionId}`);
              stateFromStorage = null;
            }
          }
        }

        setSessionData({
          sessionId: session.id,
          sessionName: session.name,
          participants: session.participants.map((p: any) => ({
            id: p.id || p.userId, // Garantir consistência de estrutura  
            name: p.name || p.userName, // Garantir consistência de estrutura
            selectedCard: p.selectedCard || null,
            isCurrentUser: userFromStorage?.id === (p.id || p.userId)
          })),
          // Priorizar estado do localStorage se disponível (F5 protection)
          isRevealed: stateFromStorage?.isRevealed ?? session.isRevealed,
          currentTicketId: session.currentTicketId,
          votingMode: session.votingMode,
          expiresAt: session.expiresAt,
          tickets: session.tickets || [],
        });

        console.log('🎯 Sessão carregada - currentTicketId:', session.currentTicketId);
        console.log('🎯 Sessão carregada - currentTicket:', session.currentTicket);

        // Recuperar averageVote do localStorage se disponível
        if (stateFromStorage?.averageVote) {
          setAverageVote(stateFromStorage.averageVote);
        }

        // Preservar estado de isRevealed no localStorage para persistir F5
        if (typeof window !== 'undefined') {
          localStorage.setItem(`openModeState_${sessionId}`, JSON.stringify({
            isRevealed: session.isRevealed,
            averageVote: session.averageVote || null,
            lastUpdated: Date.now()
          }));
        }

        // Marcar como criador APENAS se ainda não houver criador definido
        if (typeof window !== 'undefined' && userFromStorage) {
          const creatorData = localStorage.getItem(`openModeCreator_${sessionId}`);
          
          // Se não há criador definido, verificar se este é o primeiro participante
          if (!creatorData && session.participants.length > 0) {
            // Verificar se este usuário é o participante mais antigo (pela data de entrada)
            const sortedParticipants = session.participants.sort((a: any, b: any) => 
              new Date(a.joinedAt || a.createdAt).getTime() - new Date(b.joinedAt || b.createdAt).getTime()
            );
            
            const firstParticipant = sortedParticipants[0];
            if ((firstParticipant.id || firstParticipant.userId) === userFromStorage.id) {
              localStorage.setItem(`openModeCreator_${sessionId}`, JSON.stringify({
                userId: userFromStorage.id,
                userName: userFromStorage.name,
                timestamp: Date.now()
              }));
              console.log('🏆 Usuário marcado como criador da sessão (primeiro a entrar):', userFromStorage.id);
            }
          } else if (creatorData) {
            const creator = JSON.parse(creatorData);
            console.log('🏆 Criador já definido:', creator.userId);
            
            // Verificar se o criador ainda está na sessão
            const creatorStillInSession = session.participants.some((p: any) => 
              (p.id || p.userId) === creator.userId
            );
            
            if (!creatorStillInSession) {
              console.log('⚠️ Criador original não está mais na sessão, passando liderança');
              localStorage.removeItem(`openModeCreator_${sessionId}`);
              
              // Se este usuário é o primeiro da lista, ele vira o novo criador
              if (session.participants.length > 0) {
                const sortedParticipants = session.participants.sort((a: any, b: any) => 
                  new Date(a.joinedAt || a.createdAt).getTime() - new Date(b.joinedAt || b.createdAt).getTime()
                );
                
                const firstParticipant = sortedParticipants[0];
                if ((firstParticipant.id || firstParticipant.userId) === userFromStorage.id) {
                  localStorage.setItem(`openModeCreator_${sessionId}`, JSON.stringify({
                    userId: userFromStorage.id,
                    userName: userFromStorage.name,
                    timestamp: Date.now()
                  }));
                  console.log('🏆 Liderança transferida para o primeiro participante ativo:', userFromStorage.id);
                }
              }
            }
          }
        }

        // Carregar ticket atual se houver
        if (session.currentTicket) {
          setCurrentTicket(session.currentTicket);
          currentTicketRef.current = session.currentTicket;
        }

        // Gerar link de convite
        if (typeof window !== 'undefined') {
          setInviteLink(`${window.location.origin}/open/${sessionId}/join`);
        }

        // WebSocket será inicializado quando currentUser estiver disponível
      } else {
        console.error('Erro ao carregar sessão:', result.error);
        router.push('/open');
      }
    } catch (error) {
      console.error('Erro ao carregar dados da sessão:', error);
      router.push('/open');
    }
  }, [sessionId, router]);

  // Inicializar WebSocket
  const initializeWebSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 useOpenSession: Desconectando socket anterior');
      socketRef.current.disconnect();
    }

    console.log('🔌 useOpenSession: Iniciando nova conexão WebSocket');
    setConnectionStatus('connecting');

    const socket = io(HOST, {
      query: {
        sessionId,
        mode: 'open'
      }
    });

    socket.on('connect', () => {
      console.log('✅ useOpenSession: Conectado ao WebSocket (modo aberto)');
      setConnectionStatus('connected');
      
      // Obter usuário do localStorage dinamicamente
      let userFromStorage = null;
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem(`openModeUser_${sessionId}`);
        if (savedUser) {
          userFromStorage = JSON.parse(savedUser);
        }
      }
      
      // Juntar à sala da sessão
      if (userFromStorage) {
        console.log('🏠 useOpenSession: Emitindo join_room:', {
          sessionId,
          userId: userFromStorage.id,
          userName: userFromStorage.name,
          sessionName: sessionData.sessionName,
          organizationId: null,
          votingMode: sessionData.votingMode,
          mode: 'open'
        });
        socket.emit('join_room', {
          sessionId,
          userId: userFromStorage.id,
          userName: userFromStorage.name,
          sessionName: sessionData.sessionName,
          organizationId: null, // Modo aberto não tem organização
          votingMode: sessionData.votingMode,
          mode: 'open' // Indicar que é modo aberto
        });
      } else {
        console.log('🔍 useOpenSession: Usuário não encontrado no localStorage para join_room');
      }
    });

    socket.on('disconnect', () => {
      console.log('Desconectado do WebSocket');
      setConnectionStatus('disconnected');
    });

    socket.on('session_update', (data) => {
      // Obter usuário atual do localStorage para preservar isCurrentUser
      let userFromStorage = null;
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem(`openModeUser_${sessionId}`);
        if (savedUser) {
          userFromStorage = JSON.parse(savedUser);
        }
      }

      setSessionData(prev => {
        // Preservar estado crítico que não deve ser perdido no F5
        const updatedData = {
          ...prev,
          ...data
        };

        // Garantir que isCurrentUser seja mantido corretamente
        if (data.participants && userFromStorage) {
          updatedData.participants = data.participants.map((p: any) => ({
            id: p.id || p.userId, // Garantir consistência de estrutura
            name: p.name || p.userName, // Garantir consistência de estrutura
            selectedCard: p.selectedCard || null,
            isCurrentUser: userFromStorage.id === (p.id || p.userId)
          }));
        }

        return updatedData;
      });
    });

    socket.on('participant_joined', (data) => {
      setParticipantNotification({
        userName: data.userName,
        type: 'joined'
      });
      
      // Obter usuário atual do localStorage para comparação
      let userFromStorage = null;
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem(`openModeUser_${sessionId}`);
        if (savedUser) {
          userFromStorage = JSON.parse(savedUser);
        }
      }
      
      setSessionData(prev => ({
        ...prev,
        participants: [...prev.participants, {
          id: data.userId,
          name: data.userName,
          selectedCard: null,
          isCurrentUser: userFromStorage?.id === data.userId
        }]
      }));
    });

    socket.on('participant_left', (data) => {
      setParticipantNotification({
        userName: data.userName,
        type: 'left'
      });
      
      setSessionData(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.id !== data.userId)
      }));
    });

    socket.on('vote_update', (data) => {
      setSessionData(prev => ({
        ...prev,
        participants: prev.participants.map(p => 
          p.id === data.userId 
            ? { ...p, selectedCard: data.cardValue }
            : p
        )
      }));
    });

    socket.on('flip_cards', () => {
      // Iniciar contador de 3 segundos
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            clearInterval(interval);
            setSessionData(prev => {
              let calculatedAverage = null;
              
              if (prev) {
                // Calcular média dos votos
                const validVotes = prev.participants
                  .map((p: any) => p.selectedCard)
                  .filter((card: any) => card !== null && card !== undefined && card.trim() !== "")
                  .map((card: any) => {
                    // Converter para número se possível
                    const num = parseFloat(card);
                    return isNaN(num) ? card : num;
                  });
                
                if (validVotes.length > 0) {
                  const numericVotes = validVotes.filter((v: any) => typeof v === 'number');
                  if (numericVotes.length > 0) {
                    const avg = numericVotes.reduce((sum: number, vote: number) => sum + vote, 0) / numericVotes.length;
                    calculatedAverage = avg.toFixed(1);
                  } else {
                    // Se não há votos numéricos, usar o primeiro voto como string
                    calculatedAverage = validVotes[0].toString();
                  }
                  setAverageVote(calculatedAverage);
                }
              }
              
              // Salvar estado no localStorage
              if (typeof window !== 'undefined') {
                localStorage.setItem(`openModeState_${sessionId}`, JSON.stringify({
                  isRevealed: true,
                  averageVote: calculatedAverage,
                  lastUpdated: Date.now()
                }));
              }
              
              return {
                ...prev,
                isRevealed: true
              };
            });
            
            return null;
          }
        });
      }, 1000);
    });

    socket.on('new_voting', () => {
      setSessionData(prev => ({
        ...prev,
        isRevealed: false
      }));
      setSelectedCard(null);
      setAverageVote(null);
      
      // Salvar estado no localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`openModeState_${sessionId}`, JSON.stringify({
          isRevealed: false,
          averageVote: null,
          lastUpdated: Date.now()
        }));
      }
    });

    socket.on('ticket_selected', (data) => {
      console.log('🎫 ticket_selected recebido:', data);
      
      // Atualizar o ticket atual
      setSessionData(prev => ({
        ...prev,
        currentTicketId: data.ticketId
      }));
      
      // Se há um ticket selecionado, carregar seus dados
      if (data.ticketId) {
        // Buscar o ticket na lista de tickets ou fazer uma requisição
        // Por enquanto, vamos assumir que o ticket será carregado via session_update
      } else {
        // Se ticketId é null, limpar o currentTicket
        setCurrentTicket(null);
        currentTicketRef.current = null;
      }
    });

    socket.on('ticket_created', (data) => {
      console.log('Ticket criado via WebSocket:', data);
      // O OpenModeTicketManager já vai atualizar via seus próprios listeners
    });

    socket.on('ticket_updated', (data) => {
      console.log('Ticket atualizado via WebSocket:', data);
      // O OpenModeTicketManager já vai atualizar via seus próprios listeners
    });

    socket.on('ticket_deleted', (data) => {
      console.log('Ticket deletado via WebSocket:', data);
      // O OpenModeTicketManager já vai atualizar via seus próprios listeners
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  // Selecionar carta
  const handleSelectCard = useCallback((card: string) => {
    if (!currentUser || !socketRef.current) return;

    setSelectedCard(card);
    
    socketRef.current.emit('select_card', {
      sessionId,
      userId: currentUser.id,
      cardValue: card,
      organizationId: null // Modo aberto não tem organização
    });
  }, [currentUser, sessionId]);

  // Virar cartas
  const handleFlipCards = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.emit('flip_cards', { 
      sessionId,
      organizationId: null // Modo aberto não tem organização
    });
  }, [sessionId]);

  // Nova votação
  const handleNewVoting = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.emit('new_voting', { 
      sessionId, 
      organizationId: null // Modo aberto não tem organização
    });
  }, [sessionId]);

  // Selecionar ticket
  const handleTicketSelect = useCallback((ticketId: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit('ticket_selected', {
      sessionId,
      ticketId,
      organizationId: null // Modo aberto não tem organização
    });
  }, [sessionId]);

  // Finalizar votação
  const finishVoting = useCallback(() => {
    if (!socketRef.current || !currentTicket) return;

    setShowFinalEstimateModal(true);
  }, [currentTicket]);

  // Definir estimativa final
  const setFinalEstimate = useCallback(async (estimate: string) => {
    if (!currentTicket) return;

    try {
      const response = await fetch(`/api/open/sessions/${sessionId}/tickets/${currentTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalEstimate: estimate,
          averageVote
        }),
      });

      if (response.ok) {
        setShowFinalEstimateModal(false);
        
        // Recarregar ticket atualizado
        const result = await response.json();
        setCurrentTicket(result.ticket);
        currentTicketRef.current = result.ticket;
        
        // Desselecionar o ticket após finalizar a votação
        console.log('🎯 Finalizando votação e desselecionando ticket');
        if (socketRef.current) {
          socketRef.current.emit('ticket_selected', {
            sessionId,
            ticketId: null, // Desselecionar ticket
            organizationId: null
          });
        }
        
        // Limpar estado de votação
        setSelectedCard(null);
        setAverageVote(null);
        
        // Emitir nova votação para resetar estado para todos os participantes
        if (socketRef.current) {
          socketRef.current.emit('new_voting', { 
            sessionId, 
            organizationId: null 
          });
        }
      }
    } catch (error) {
      console.error('Erro ao definir estimativa final:', error);
    }
  }, [currentTicket, sessionId, averageVote]);

  // Gerar link de convite
  const generateInviteLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      setInviteLink(`${window.location.origin}/open/${sessionId}/join`);
    }
  }, [sessionId]);

  // Encerrar sessão
  const handleEndSession = useCallback(async () => {
    if (!socketRef.current) return;

    try {
      await fetch(`/api/open/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      socketRef.current.emit('session_ended', { sessionId });
      router.push('/open');
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
    }
  }, [sessionId, router]);

  // Cleanup
  useEffect(() => {
    loadSessionData();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [loadSessionData]);

  // Inicializar WebSocket assim que a sessão estiver disponível
  useEffect(() => {
    if (sessionData.sessionId) {
      initializeWebSocket();
    }
  }, [sessionData.sessionId, initializeWebSocket]);

  // Atualizar currentTicket quando currentTicketId mudar
  useEffect(() => {
    console.log('🎫 useOpenSession: currentTicketId mudou para:', sessionData.currentTicketId);
    
    if (sessionData.currentTicketId) {
      // Só buscar se o ID for diferente do ticket atual
      if (sessionData.currentTicketId !== currentTicket?.id) {
        // Buscar o ticket atualizado via API
        const fetchCurrentTicket = async () => {
          try {
            console.log('🎫 useOpenSession: Buscando ticket:', sessionData.currentTicketId);
            const response = await fetch(`/api/open/sessions/${sessionId}/tickets/${sessionData.currentTicketId}`);
            const result = await response.json();
            console.log('🎫 useOpenSession: Resposta da API:', result);
            
            if (result.success && result.ticket) {
              console.log('🎫 useOpenSession: Definindo currentTicket:', result.ticket);
              setCurrentTicket(result.ticket);
              currentTicketRef.current = result.ticket;
            }
          } catch (error) {
            console.error('❌ Erro ao carregar ticket atual:', error);
          }
        };
        fetchCurrentTicket();
      }
    } else if (!sessionData.currentTicketId && currentTicket) {
      // Se não há ticket selecionado, limpar o currentTicket
      console.log('🎫 useOpenSession: Limpando currentTicket');
      setCurrentTicket(null);
      currentTicketRef.current = null;
    }
  }, [sessionData.currentTicketId, currentTicket?.id, sessionId]);

  // Auto-hide notification
  useEffect(() => {
    if (participantNotification) {
      const timer = setTimeout(() => {
        setParticipantNotification(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [participantNotification]);

  return {
    sessionData,
    currentUser,
    selectedCard,
    countdown,
    inviteLink,
    currentTicket,
    averageVote,
    showFinalEstimateModal,
    setShowFinalEstimateModal,
    participantNotification,
    setParticipantNotification,
    connectionStatus,
    socketRef,
    handleSelectCard,
    handleFlipCards,
    handleNewVoting,
    handleTicketSelect,
    finishVoting,
    setFinalEstimate,
    generateInviteLink,
    handleEndSession,
  };
}
