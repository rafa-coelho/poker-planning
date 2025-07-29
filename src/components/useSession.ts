import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { io, Socket } from "socket.io-client";
import { APP_CONFIG } from '@/lib/config';

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
}

const HOST = APP_CONFIG.BASE_URL;

export function useSession () {
  const router = useRouter();
  const { sessionId } = useParams() as { sessionId?: string };
  const socketRef = useRef<Socket | null>(null);

  const [sessionData, setSessionData] = useState<SessionState>({
    sessionId: "",
    sessionName: "",
    participants: [],
    isRevealed: false,
  });

  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [inviteLink, setInviteLink] = useState<string>("");

  useEffect(() => {
    if (!sessionId) {
      router.push("/");
      return;
    }

    const storedUserId = getOrCreateUserId();
    const storedUserName = getStoredUserName();

    if (!storedUserName) {
      router.push(`/${sessionId}/join`);
      return;
    }

    setUserId(storedUserId);
    setUserName(storedUserName);
    generateInviteLink();

    // Certifique-se de que a função de cleanup é sempre retornada
    const cleanup = initializeSocketConnection(storedUserId, storedUserName);
    return cleanup || (() => { });
  }, [sessionId, router]);


  /** 🔹 Obtém ou gera um novo userId */
  function getOrCreateUserId (): string {
    let storedUserId = localStorage.getItem("pokerUserId");
    if (!storedUserId) {
      storedUserId = uuidv4();
      localStorage.setItem("pokerUserId", storedUserId);
    }
    return storedUserId;
  }

  /** 🔹 Obtém o nome do usuário armazenado */
  function getStoredUserName (): string | null {
    return localStorage.getItem("pokerUserName");
  }

  /** 🔹 Inicializa a conexão com o WebSocket */
  function initializeSocketConnection (storedUserId: string, storedUserName: string): () => void {
    socketRef.current = io(HOST);
    const socket = socketRef.current;

    socket.emit("join_room", { sessionId, userId: storedUserId, userName: storedUserName });

    socket.on("session_update", (data: SessionState) => updateSessionData(data, storedUserId));
    socket.on("flip_cards", startCountdownBeforeReveal);
    socket.on("redirect_to_home", () => router.push("/"));

    return () => socket.disconnect();
  }

  /** 🔹 Atualiza os dados da sessão */
  function updateSessionData (data: SessionState, storedUserId: string) {
    setSessionData({
      ...data,
      participants: data.participants.map((p) => ({
        ...p,
        isCurrentUser: p.userId === storedUserId,
      })),
    });

    const myParticipant = data.participants.find((p) => p.userId === storedUserId);
    if (myParticipant) {
      setSelectedCard(myParticipant.selectedCard);
    }
  }

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

  /** 🔹 Define se os votos foram revelados */
  function setIsRevealed (isRevealed: boolean) {
    setSessionData((prev) => ({ ...prev, isRevealed }));
    socketRef.current?.emit("set_revealed", { sessionId, isRevealed });
  }

  /** 🔹 Seleciona um card */
  function handleSelectCard (cardValue: string) {
    setSelectedCard(cardValue);
    socketRef.current?.emit("select_card", { sessionId, userId, cardValue });
  }

  /** 🔹 Revela os votos */
  function handleFlipCards () {
    socketRef.current?.emit("flip_cards", { sessionId });
  }

  /** 🔹 Reinicia a votação */
  function handleNewVoting () {
    socketRef.current?.emit("reset_voting", { sessionId });
  }

  /** 🔹 Obtém os votos válidos */
  function getVotedCards () {
    return sessionData.participants.map((p) => ({
      userId: p.userId,
      userName: p.userName,
      selectedCard: p.selectedCard,
    }));
  }

  /** 🔹 Cria uma nova sessão */
  function createSession (sessionName: string) {
    socketRef.current = io(HOST);
    const socket = socketRef.current;

    const sessionId = uuidv4();
    socket.emit("create_room", { sessionId, sessionName });

    return sessionId;
  }

  /** 🔹 Verifica se o usuário está na sessão */
  function isCurrentUserOnSession () {
    return sessionData.participants.some((p) => p.userId === userId);
  }

  return {
    sessionData,
    user: { userId, userName },
    selectedCard,
    countdown,
    inviteLink,
    createSession,
    handleSelectCard,
    handleFlipCards,
    handleNewVoting,
    getVotedCards,
    setIsRevealed,
  };
}
