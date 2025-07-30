"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Ticket, TicketStatus } from "@prisma/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { ApiService } from "@/lib/services/apiService";
import { useTranslation } from "react-i18next";
import { APP_CONFIG } from "@/lib/config";

const HOST = process.env.NEXT_PUBLIC_SOCKET_URL || `http://${APP_CONFIG.HOST}:${APP_CONFIG.WS_PORT || 3001}`;

export interface Participant {
  userId: string;
  userName: string;
  isCurrentUser: boolean;
  selectedCard: string | null;
}

export interface SessionState {
  sessionId: string;
  sessionName: string;
  participants: Participant[];
  isRevealed: boolean;
  currentTicketId?: string | null;
  votingMode?: string; // Adicionar modo de votação
}

export function useSession () {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { user: authUser, isAuthenticated, isLoading: authLoading, apiService } = useAuth();
  const { t } = useTranslation("common");

  const [sessionData, setSessionData] = useState<SessionState>({
    sessionId,
    sessionName: "",
    participants: [],
    isRevealed: false,
    votingMode: "FIBONACCI", // Default
  });

  const [sessionUser, setSessionUser] = useState({ userId: "", userName: "" });
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [averageVote, setAverageVote] = useState<number | null>(null);
  const [showFinalEstimateModal, setShowFinalEstimateModal] = useState(false);
  const [onTicketUpdate, setOnTicketUpdate] = useState<((ticket: Ticket) => void) | null>(null);
  const [participantNotification, setParticipantNotification] = useState<{ userName: string; type: 'left' | 'joined' } | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!sessionId) {
      console.error(t("session.errors.sessionIdNotFound"));
      return;
    }

    // Configurar dados do usuário
    const userUniqueId = authUser?.id || "anonymous";
    const userDisplayName = authUser?.name || t("session.anonymous");

    setSessionUser({
      userId: userUniqueId,
      userName: userDisplayName,
    });

    // Solicitar permissão de notificação
    requestNotificationPermission();

    // Carregar dados da sessão primeiro, depois inicializar WebSocket
    loadSessionData();
  }, [sessionId, router, isAuthenticated, authUser, authLoading, t]);

  /** 🔹 Solicita permissão para notificações */
  const requestNotificationPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  };

  /** 🔹 Carrega dados da sessão do banco de dados */
  const loadSessionData = async () => {
    try {
      const response = await apiService.getSession(sessionId);
      if (response.success && response.data) {
        const session = response.data;
        
        setSessionData(prev => ({
          ...prev,
          sessionId: session.id,
          sessionName: session.name,
          votingMode: session.votingMode || "FIBONACCI",
        }));

        // Verificar se o usuário é o criador da sessão
        // Verificar se o usuário atual é o primeiro participante (criador)
        const currentUser = session.participants.find(p => p.user?.id === authUser?.id);
        const isUserCreator = currentUser && session.participants.indexOf(currentUser) === 0;
        setIsCreator(!!isUserCreator);

        // Carregar ticket atual se existir
        if (session.currentTicketId) {
          loadCurrentTicket(session.currentTicketId);
        }

        // Inicializar WebSocket com o nome correto da sessão
        const cleanup = initializeSocketConnection(
          authUser?.id || "anonymous", 
          authUser?.name || t("session.anonymous"),
          session.name
        );
        return cleanup || (() => { });
      }
    } catch (error) {
      console.error(t("session.errors.loadSessionData"), error);
    }
  };

  /** 🔹 Carrega o ticket atual */
  const loadCurrentTicket = async (ticketId: string) => {
    try {
      const response = await apiService.getTicket(ticketId);
      if (response.success && response.data) {
        const ticket = response.data as any;
        setCurrentTicket(ticket);
        
        // Se o ticket foi estimado, carregar a média
        if (ticket.status === "ESTIMATED") {
          setAverageVote((ticket as any).averageVote || 0);
        }
      }
    } catch (error) {
      console.error(t("session.errors.loadCurrentTicket"), error);
    }
  };

  // Função para recarregar currentTicket quando necessário
  const reloadCurrentTicket = useCallback(async () => {
    if (currentTicket?.id) {
      await loadCurrentTicket(currentTicket.id);
    }
  }, [currentTicket?.id]);

  /** 🔹 Inicializa a conexão com o WebSocket */
  function initializeSocketConnection(storedUserId: string, storedUserName: string, sessionName?: string): () => void {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socketUrl = `http://localhost:${APP_CONFIG.WS_PORT}`;
    const socket = io(socketUrl);
    socketRef.current = socket;

    // Definir socket globalmente para outros componentes
    if (typeof window !== 'undefined') {
      (window as any).socket = socket;
    }

    // Heartbeat para manter conexão ativa
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      }
    }, 30000); // A cada 30 segundos

    socket.on("connect", () => {
      socket.emit("join_room", {
        sessionId,
        userId: storedUserId,
        userName: storedUserName,
        sessionName: sessionName || sessionData.sessionName || t("session.defaultName"),
        organizationId: authUser?.organizationId || null
      });
    });

    socket.on("heartbeat_ack", () => {
      // Heartbeat confirmado
    });

    socket.on("error", (error: { message: string }) => {
      console.error("WebSocket error:", error.message);
      if (error.message === 'Rate limit exceeded') {
        // Implementar retry logic ou mostrar mensagem ao usuário
        console.warn("Rate limit exceeded, waiting before retry...");
      }
    });

    socket.on("session_update", (data: SessionState) => updateSessionData(data, storedUserId));
    socket.on("flip_cards", () => {
      startCountdownBeforeReveal();
    });
    socket.on("ticket_update", handleTicketUpdate);
    socket.on("voting_started", handleVotingStarted);
    socket.on("voting_finished", handleVotingFinished);
    socket.on("participant_left", handleParticipantLeft);

    return () => {
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }

  /** 🔹 Atualiza os dados da sessão */
  function updateSessionData(data: SessionState, storedUserId: string) {
    // Marcar o usuário atual em cada participante
    const participantsWithCurrentUser = data.participants.map(p => ({
      ...p,
      isCurrentUser: p.userId === storedUserId
    }));
    
    setSessionData({
      ...data,
      participants: participantsWithCurrentUser
    });
    
    // Atualizar dados do usuário atual
    const currentUser = participantsWithCurrentUser.find((p) => p.userId === storedUserId);
    if (currentUser) {
      setSelectedCard(currentUser.selectedCard);
    }
    
    // Se há um currentTicketId e não temos um currentTicket carregado, carregar
    if (data.currentTicketId && !currentTicket) {
      loadCurrentTicket(data.currentTicketId);
    } else if (!data.currentTicketId && currentTicket) {
      // Se não há currentTicketId mas temos um currentTicket, limpar
      setCurrentTicket(null);
      setAverageVote(null);
      setShowFinalEstimateModal(false);
    }
  }

  /** 🔹 Manipula quando um participante sai da sessão */
  const handleParticipantLeft = (data: { userId: string; userName: string }) => {
    console.log(`👤 Participante saiu: ${data.userName}`);
    
    // Mostrar notificação visual
    setParticipantNotification({ userName: data.userName, type: 'left' });
    
    // Limpar notificação após 3 segundos
    setTimeout(() => {
      setParticipantNotification(null);
    }, 3000);
    
    // Mostrar notificação do sistema se disponível
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(t("session.participantLeft.title"), {
          body: t("session.participantLeft.message", { userName: data.userName }),
          icon: '/favicon.ico'
        });
      }
    }
    
    // Atualizar a lista de participantes removendo o que saiu
    setSessionData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.userId !== data.userId)
    }));
  };

  /** 🔹 Gera o link de convite */
  function generateInviteLink () {
    setInviteLink(typeof window !== "undefined"
      ? `${window.location.origin}/${sessionId}/join`
      : `${HOST}/${sessionId}/join`
    );
  }

  /** 🔹 Inicia a contagem regressiva antes de revelar os votos */
  function startCountdownBeforeReveal () {
    let c = 3;
    setCountdown(c);
    const timer = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(timer);
        setCountdown(null);
        setIsRevealed(true);
      }
    }, 1000);
  }

  function setIsRevealed (isRevealed: boolean) {
    setSessionData(prev => ({ ...prev, isRevealed }));
  }

  function handleSelectCard(cardValue: string) {
    
    if (!isAuthenticated || !sessionUser) return;
    
    // Validar se o voto é válido para o modo de votação atual
    if (!isValidVote(cardValue, sessionData.votingMode || "FIBONACCI")) {
      return;
    }
    
    setSelectedCard(cardValue);
    socketRef.current?.emit("select_card", { 
      sessionId, 
      userId: sessionUser.userId, 
      cardValue,
      organizationId: authUser?.organizationId || null
    });
  }

  function handleFlipCards () {
    socketRef.current?.emit("flip_cards", { 
      sessionId,
      organizationId: authUser?.organizationId || null
    });
  }

  function handleNewVoting () {
    socketRef.current?.emit("new_voting", { 
      sessionId,
      organizationId: authUser?.organizationId || null
    });
  }

  // Função para resetar a mesa (limpar votos, esconder cartas, etc.)
  const resetTable = () => {
    // Limpar votos locais
    setSelectedCard(null);
    setAverageVote(null);
    setShowFinalEstimateModal(false);
    
    // Emitir evento para resetar a mesa para todos os participantes
    socketRef.current?.emit("new_voting", { 
      sessionId,
      organizationId: authUser?.organizationId || null
    });
  };

  const handleTicketSelect = async (ticket: Ticket) => {
    // Só o criador pode selecionar tickets
    if (!isCreator)
       return;
    
    // Se clicar no mesmo ticket, desselecionar
    if (currentTicket?.id === ticket.id) {
      setCurrentTicket(null);
      setAverageVote(null);
      setShowFinalEstimateModal(false);
      
      // Resetar a mesa
      resetTable();
      
      // Emitir evento para desselecionar para todos
      socketRef.current?.emit("ticket_selected", { 
        sessionId, 
        ticketId: null,
        organizationId: authUser?.organizationId || null
      });
      return; // IMPORTANTE: Retornar aqui para não executar o resto
    }
    
    // Resetar a mesa antes de selecionar novo ticket
    resetTable();
    
    setCurrentTicket(ticket);
    
    // Emitir evento para compartilhar seleção com todos
    socketRef.current?.emit("ticket_selected", { 
      sessionId, 
      ticketId: ticket.id,
      organizationId: authUser?.organizationId || null
    });
    
    // Se o ticket já foi estimado, mostrar resultados mas permitir re-votar
    if (ticket.status === "ESTIMATED") {
      setAverageVote((ticket as any).averageVote || 0);
    }
    
    // Iniciar votação automaticamente se o ticket não foi estimado
    if (ticket.status === "PENDING") {
      await startVoting(ticket.id);
    }
  };

  const startVoting = async (ticketId: string) => {
    try {
      // Se o ticket já foi estimado, não alterar o status no banco
      // Apenas iniciar a votação localmente
      if (currentTicket?.status === "ESTIMATED") {
        // Limpar votos anteriores mas manter o ticket como estimado
        setSelectedCard(null);
        setAverageVote(null);
        setShowFinalEstimateModal(false);
        
        // Emitir evento para informar que a votação foi iniciada
        socketRef.current?.emit("voting_started", { sessionId, ticketId });
        return;
      }
      
      // Para tickets não estimados, atualizar status para VOTING
      const response = await apiService.updateTicket(ticketId, {
        status: "VOTING"
      });
      
      if (response.success && response.data) {
        const updatedTicket = response.data as any;
        setCurrentTicket(updatedTicket); // Atualizar imediatamente
        socketRef.current?.emit("voting_started", { sessionId, ticketId });
        
        // Limpar votos anteriores
        setSelectedCard(null);
        setAverageVote(null);
        setShowFinalEstimateModal(false);
      }
    } catch (error) {
      console.error(t("session.errors.startVoting"), error);
    }
  };

  const startVotingForCurrentTicket = async () => {
    if (!currentTicket) return;
    await startVoting(currentTicket.id);
  };

  const finishVoting = async () => {
    if (!currentTicket) return;

    try {
      // Calcular média dos votos usando a nova função
      const average = calculateAverageVote();
      setAverageVote(average);

      // NÃO atualizar status automaticamente - apenas mostrar modal
      // O status só será mudado para ESTIMATED após confirmar no modal
      setShowFinalEstimateModal(true);
    } catch (error) {
      console.error(t("session.errors.finishVoting"), error);
    }
  };

  const setFinalEstimate = async (finalEstimate: string) => {
    if (!currentTicket) return;

    try {
      const response = await apiService.updateTicket(currentTicket.id, {
        finalEstimate,
        status: "ESTIMATED",
        averageVote: averageVote || 0
      });

      if (response.success && response.data) {
        // Atualizar o currentTicket imediatamente
        const updatedTicket = response.data as any;
        setCurrentTicket(updatedTicket);
        setShowFinalEstimateModal(false);
        
        // Chamar callback para atualizar TicketManager
        if (onTicketUpdate) {
          onTicketUpdate(updatedTicket);
        }
        
        // Emitir evento WebSocket para atualizar todos os clientes
        socketRef.current?.emit("final_estimate_set", { 
          sessionId, 
          ticketId: currentTicket.id, 
          finalEstimate,
          organizationId: authUser?.organizationId || null
        });
        
        // Emitir também o evento ticket_updated para garantir atualização
        socketRef.current?.emit("ticket_updated", { 
          sessionId, 
          ticket: updatedTicket,
          organizationId: authUser?.organizationId || null
        });
        
        // Desselecionar ticket após confirmação
        socketRef.current?.emit("ticket_selected", { 
          sessionId, 
          ticketId: null,
          organizationId: authUser?.organizationId || null
        });
      }
    } catch (error) {
      console.error(t("session.errors.setFinalEstimate"), error);
    }
  };

  const handleTicketUpdate = (data: { ticket: Ticket }) => {
    if (currentTicket?.id === data.ticket.id) {
      setCurrentTicket(data.ticket);
    }
  };

  const handleVotingStarted = (data: { ticketId: string }) => {
    // Limpar votos anteriores quando nova votação inicia
    setSelectedCard(null);
    setAverageVote(null);
    setShowFinalEstimateModal(false);
  };

  const handleVotingFinished = (data: { ticketId: string, averageVote: number }) => {
    // Validar se o averageVote é um número válido
    const validAverage = data.averageVote && !isNaN(data.averageVote) ? data.averageVote : 0;
    setAverageVote(validAverage);
    setShowFinalEstimateModal(true);
  };

  function getVotedCards() {
    const votedCards = sessionData.participants
      .map((p) => p.selectedCard)
      .filter((card) => card !== null && card !== undefined && card.trim() !== "") as string[];
    return votedCards;
  }

  /** 🔹 Calcula a média dos votos válidos */
  function calculateAverageVote(): number {
    const votedCards = getVotedCards();
    
    // Filtrar votos válidos (excluir ?, ☕, etc.)
    const numericVotes = votedCards
      .map(vote => {
        const num = parseFloat(vote);
        return isNaN(num) ? null : num;
      })
      .filter(vote => vote !== null && vote > 0) as number[];

    if (numericVotes.length === 0) {
      return 0;
    }

    const sum = numericVotes.reduce((acc, vote) => acc + vote, 0);
    return sum / numericVotes.length;
  }

  /** 🔹 Gera cards baseados no modo de votação */
  function getVotingCards(votingMode: string): string[] {
    switch (votingMode) {
      case "FIBONACCI":
        return ["1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"];
      case "TSHIRT":
        return ["XS", "S", "M", "L", "XL", "XXL", "?", "☕"];
      case "LINEAR":
        return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "?", "☕"];
      default:
        return ["1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"];
    }
  }

  /** 🔹 Valida se um voto é válido para o modo atual */
  function isValidVote(vote: string, votingMode: string): boolean {
    const validCards = getVotingCards(votingMode);
    const isValid = validCards.includes(vote);
    
    if (!isValid) {
      console.warn(`Voto inválido: "${vote}" para modo "${votingMode}". Cards válidos:`, validCards);
    }
    
    return isValid;
  }

  /** 🔹 Verifica se todos os participantes votaram */
  function checkAllVoted(): boolean {
    const participants = sessionData.participants.filter(p => !p.isCurrentUser); // Excluir o criador
    const votedParticipants = participants.filter(p => p.selectedCard !== null);
    return participants.length > 0 && votedParticipants.length === participants.length;
  }

  /** 🔹 Finaliza votação automaticamente se todos votaram */
  const autoFinishVoting = useCallback(async () => {
    if (!currentTicket || currentTicket.status !== "VOTING") return;
    
    // Verificar se todos votaram
    if (checkAllVoted()) {
      console.log("Todos os participantes votaram, finalizando automaticamente...");
      await finishVoting();
    }
  }, [currentTicket, sessionData.participants]);

  // Monitorar se todos votaram
  useEffect(() => {
    if (currentTicket?.status === "VOTING" && sessionData.isRevealed) {
      autoFinishVoting();
    }
  }, [sessionData.participants, currentTicket, sessionData.isRevealed, autoFinishVoting]);

  // 🔹 Listeners do WebSocket
  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    // 🎫 Listeners para tickets
    socket.on("ticket_updated", (data: { ticket: any }) => {
      // Atualizar o currentTicket se for o mesmo
      if (currentTicket && currentTicket.id === data.ticket.id) {
        setCurrentTicket(data.ticket);
      }
    });

    socket.on("ticket_selected", (data: { ticketId: string | null }) => {
      // Atualizar ticket selecionado para todos os participantes
      if (data.ticketId) {
        // Carregar dados do ticket selecionado
        loadCurrentTicket(data.ticketId);
      } else {
        // Ticket foi desselecionado - resetar a mesa
        setCurrentTicket(null);
        setAverageVote(null);
        setShowFinalEstimateModal(false);
        
        // Resetar a mesa para todos os participantes
        resetTable();
      }
    });

    socket.on("ticket_deleted", (data: { ticketId: string }) => {
      // Se o ticket deletado era o atual, limpar e resetar a mesa
      if (currentTicket && currentTicket.id === data.ticketId) {
        setCurrentTicket(null);
        setAverageVote(null);
        setShowFinalEstimateModal(false);
        
        // Resetar a mesa para todos os participantes
        resetTable();
      }
    });

    socket.on("ticket_created", (data: { ticket: any }) => {
      // Não precisamos fazer nada aqui, o TicketManager vai recarregar
    });

    socket.on("ticket_updated", (data: { ticket: any }) => {
      // Atualizar o currentTicket se for o mesmo
      if (currentTicket && currentTicket.id === data.ticket.id) {
        setCurrentTicket(data.ticket);
      }
    });

    return () => {
      socket.off("ticket_updated");
      socket.off("ticket_selected");
      socket.off("ticket_deleted");
      socket.off("ticket_created");
    };
  }, [currentTicket]);

  // 🔹 Otimizar re-renders com useMemo para dados computados
  const votingCards = useMemo(() => {
    return getVotingCards(sessionData.votingMode || "FIBONACCI");
  }, [sessionData.votingMode]);

  const isVotingInProgress = useMemo(() => {
    return currentTicket?.status === TicketStatus.VOTING;
  }, [currentTicket?.status]);

  const canVote = useMemo(() => {
    const result = (
      isAuthenticated &&
      sessionUser &&
      !!currentTicket &&
      (currentTicket.status === "VOTING" || currentTicket.status === "ESTIMATED" || currentTicket.status === "PENDING") &&
      countdown === null
    );
    
    return result;
  }, [isAuthenticated, sessionUser, currentTicket, countdown]);

  const canManageTickets = useMemo(() => {
    return isCreator;
  }, [isCreator]);

  function createSession (sessionName: string) {
    socketRef.current?.emit("create_session", { sessionName });
  }

  function isCurrentUserOnSession () {
    return sessionData.participants.some((p) => p.isCurrentUser);
  }

  const handleOpenFinalEstimateModal = (ticket: Ticket) => {
    setCurrentTicket(ticket);
    setAverageVote((ticket as any).averageVote || 0);
    setShowFinalEstimateModal(true);
  };

  const registerTicketUpdateCallback = useCallback((callback: (ticket: Ticket) => void) => {
    setOnTicketUpdate(() => callback);
  }, []);

  // 🔹 Métodos para emitir eventos de tickets
  const emitTicketCreated = useCallback((ticket: Ticket) => {
    socketRef.current?.emit("ticket_created", { sessionId, ticket });
  }, [sessionId]);

  const emitTicketUpdated = useCallback((ticket: Ticket) => {
    socketRef.current?.emit("ticket_updated", { sessionId, ticket });
  }, [sessionId]);

  const emitTicketDeleted = useCallback((ticketId: string) => {
    socketRef.current?.emit("ticket_deleted", { sessionId, ticketId });
  }, [sessionId]);

  /** 🔹 Obtém estatísticas de votação */
  function getVotingStats() {
    const participants = sessionData.participants.filter(p => !p.isCurrentUser);
    const votedParticipants = participants.filter(p => p.selectedCard !== null);
    const totalParticipants = participants.length;
    const votedCount = votedParticipants.length;
    const percentage = totalParticipants > 0 ? (votedCount / totalParticipants) * 100 : 0;
    
    return {
      totalParticipants,
      votedCount,
      percentage,
      allVoted: votedCount === totalParticipants && totalParticipants > 0
    };
  }

  return {
    sessionData,
    user: sessionUser,
    selectedCard,
    countdown,
    inviteLink,
    currentTicket,
    isCreator,
    averageVote,
    showFinalEstimateModal,
    setShowFinalEstimateModal,
    votingCards,
    isVotingInProgress,
    canVote,
    canManageTickets,
    participantNotification,
    setParticipantNotification,
    handleSelectCard,
    handleFlipCards,
    handleNewVoting,
    resetTable,
    handleTicketSelect,
    startVoting,
    startVotingForCurrentTicket,
    finishVoting,
    setFinalEstimate,
    handleOpenFinalEstimateModal,
    registerTicketUpdateCallback,
    emitTicketCreated,
    emitTicketUpdated,
    emitTicketDeleted,
    reloadCurrentTicket,
    getVotingStats,
  };
}
