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

        // Carregar dados do usuário do localStorage
        if (typeof window !== 'undefined') {
          const savedUser = localStorage.getItem(`openModeUser_${sessionId}`);
          if (savedUser) {
            const user = JSON.parse(savedUser);
            setCurrentUser(user);
          }
        }

        setSessionData({
          sessionId: session.id,
          sessionName: session.name,
          participants: session.participants.map((p: any) => ({
            id: p.id,
            name: p.name,
            selectedCard: p.selectedCard || null,
            isCurrentUser: currentUser?.id === p.id
          })),
          isRevealed: session.isRevealed,
          currentTicketId: session.currentTicketId,
          votingMode: session.votingMode,
          expiresAt: session.expiresAt
        });

        // Carregar ticket atual se houver
        if (session.currentTicket) {
          setCurrentTicket(session.currentTicket);
          currentTicketRef.current = session.currentTicket;
        }

        // Gerar link de convite
        if (typeof window !== 'undefined') {
          setInviteLink(`${window.location.origin}/open/${sessionId}/join`);
        }

        // Inicializar WebSocket
        initializeWebSocket();
      } else {
        console.error('Erro ao carregar sessão:', result.error);
        router.push('/open');
      }
    } catch (error) {
      console.error('Erro ao carregar dados da sessão:', error);
      router.push('/open');
    }
  }, [sessionId, router, currentUser]);

  // Inicializar WebSocket
  const initializeWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    setConnectionStatus('connecting');

    const socket = io(HOST, {
      query: {
        sessionId,
        mode: 'open'
      }
    });

    socket.on('connect', () => {
      console.log('Conectado ao WebSocket (modo aberto)');
      setConnectionStatus('connected');
      
      // Juntar à sala da sessão
      if (currentUser) {
        socket.emit('join_room', {
          sessionId,
          userId: currentUser.id,
          userName: currentUser.name,
          sessionName: sessionData.sessionName,
          organizationId: null, // Modo aberto não tem organização
          votingMode: sessionData.votingMode,
          mode: 'open' // Indicar que é modo aberto
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Desconectado do WebSocket');
      setConnectionStatus('disconnected');
    });

    socket.on('session_update', (data) => {
      setSessionData(prev => ({
        ...prev,
        ...data
      }));
    });

    socket.on('participant_joined', (data) => {
      setParticipantNotification({
        userName: data.userName,
        type: 'joined'
      });
      
      setSessionData(prev => ({
        ...prev,
        participants: [...prev.participants, {
          id: data.userId,
          name: data.userName,
          selectedCard: null,
          isCurrentUser: false
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
                    setAverageVote(avg.toFixed(1));
                  } else {
                    // Se não há votos numéricos, usar o primeiro voto como string
                    setAverageVote(validVotes[0].toString());
                  }
                }
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
    });

    socket.on('ticket_selected', (data) => {
      // Atualizar o ticket atual
      setSessionData(prev => ({
        ...prev,
        currentTicketId: data.ticketId
      }));
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

      socketRef.current.emit('endSession', { sessionId });
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
