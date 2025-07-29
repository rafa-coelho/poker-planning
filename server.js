const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')

// Configuração simplificada para o servidor
const APP_CONFIG = {
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  HOST: process.env.HOST || 'localhost',
  PORT: parseInt(process.env.PORT || '3000', 10),
  WS_PORT: parseInt(process.env.WS_PORT || '3001', 10),
}

const port = APP_CONFIG.WS_PORT

const expressApp = express();
const server = createServer(expressApp);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const sessions = {};
const pendingRemovals = {};

// 🔹 Criar ou obter uma sessão
function getOrCreateSession (sessionId, sessionName = "") {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      sessionId,
      sessionName,
      participants: [],
      isRevealed: false,
    };
  }
  if (!pendingRemovals[sessionId]) {
    pendingRemovals[sessionId] = new Set();
  }
  return sessions[sessionId];
}

// 🔹 Adicionar participante a uma sessão
function addParticipant (sessionId, userId, userName, socketId) {
  const session = getOrCreateSession(sessionId);
  const existing = session.participants.find((p) => p.userId === userId);
  if (!existing) {
    session.participants.push({ userId, userName, socketId, selectedCard: null });
  } else {
    // Atualizar socketId se o participante já existe
    existing.socketId = socketId;
  }
}

// 🔹 Atualizar sessão para todos os participantes
function updateSession (sessionId) {
  const session = sessions[sessionId];
  if (session) {
    io.to(sessionId).emit("session_update", {
      ...session,
      currentTicketId: session.currentTicketId || null
    });
  }
}

io.on("connection", (socket) => {
  console.log("🔌 Novo cliente conectado:", socket.id);

  // 🎲 Criar sala
  socket.on("create_room", ({ sessionId, sessionName }) => {
    getOrCreateSession(sessionId, sessionName);
    updateSession(sessionId);
  });

  // 🚪 Entrar na sala
  socket.on("join_room", ({ sessionId, userId, userName, sessionName }) => {
    socket.join(sessionId);

    // Inicializar sessão se não existir
    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        sessionId,
        sessionName: sessionName || "Sessão Poker Planning",
        participants: [],
        isRevealed: false,
        currentTicketId: null,
        votingMode: "FIBONACCI"
      };
    }

    // Adicionar participante se não existir ou atualizar socketId
    const existingParticipant = sessions[sessionId].participants.find(p => p.userId === userId);
    if (!existingParticipant) {
      sessions[sessionId].participants.push({
        userId,
        userName,
        socketId: socket.id,
        isCurrentUser: false,
        selectedCard: null
      });
    } else {
      // Atualizar socketId se o participante já existe
      existingParticipant.socketId = socket.id;
    }

    // Enviar dados atualizados da sessão
    updateSession(sessionId);
  });

  // 🃏 Selecionar carta
  socket.on("select_card", ({ sessionId, userId, cardValue }) => {
    const session = sessions[sessionId];
    if (!session) return;
    
    const participant = session.participants.find((p) => p.userId === userId);
    if (participant) {
      participant.selectedCard = cardValue;
      updateSession(sessionId);
    }
  });

  // 🎯 Iniciar votação
  socket.on("voting_started", ({ sessionId, ticketId }) => {
    const session = sessions[sessionId];
    if (!session) return;

    console.log(`🚀 Votação iniciada para ticket: ${ticketId}`);
    // Resetar votos anteriores
    session.participants.forEach((p) => (p.selectedCard = null));
    session.isRevealed = false;
    
    updateSession(sessionId);
  });

  // ✅ Finalizar votação
  socket.on("voting_finished", ({ sessionId, ticketId, averageVote }) => {
    const session = sessions[sessionId];
    if (!session) return;

    console.log(`✅ Votação finalizada para ticket: ${ticketId}, média: ${averageVote}`);
    
    updateSession(sessionId);
  });

  // 🔄 Flipar as cartas
  socket.on("flip_cards", ({ sessionId }) => {
    if (!sessions[sessionId]) {
      return;
    }

    // Emitir evento para iniciar contador em todos os clientes
    io.to(sessionId).emit("flip_cards");
    
    // Após 3 segundos, revelar as cartas
    setTimeout(() => {
      if (sessions[sessionId]) {
        sessions[sessionId].isRevealed = true;
        updateSession(sessionId);
      }
    }, 3000);
  });

  // 🔄 Resetar votação
  socket.on("new_voting", ({ sessionId }) => {
    if (!sessions[sessionId]) return;

    sessions[sessionId].isRevealed = false;
    sessions[sessionId].participants.forEach((p) => (p.selectedCard = null));

    // Remover participantes pendentes
    if (pendingRemovals[sessionId] && pendingRemovals[sessionId].size > 0) {
      console.log(`🗑️ Removendo ${pendingRemovals[sessionId].size} participantes pendentes`);
      
      // Notificar sobre cada participante que será removido
      pendingRemovals[sessionId].forEach(userId => {
        const participant = sessions[sessionId].participants.find(p => p.userId === userId);
        if (participant) {
          console.log(`👤 Removendo participante pendente: ${participant.userName}`);
          io.to(sessionId).emit("participant_left", { 
            userId: participant.userId, 
            userName: participant.userName 
          });
        }
      });
      
      // Remover os participantes da lista
      sessions[sessionId].participants = sessions[sessionId].participants.filter(
        (p) => !pendingRemovals[sessionId].has(p.userId)
      );
      pendingRemovals[sessionId].clear();
    }

    updateSession(sessionId);
  });

  // 🔄 Atualizar estado de revelação
  socket.on("set_revealed", ({ sessionId, isRevealed }) => {
    if (!sessions[sessionId]) return;

    console.log(`🔍 Estado de revelação atualizado: ${sessionId} → ${isRevealed}`);
    sessions[sessionId].isRevealed = isRevealed;
    updateSession(sessionId);
  });

  // ❌ Remover participante manualmente
  socket.on("remove_participant", ({ sessionId, userId }) => {
    if (!sessions[sessionId]) return;

    const participant = sessions[sessionId].participants.find(p => p.userId === userId);
    if (participant) {
      console.log(`👤 Removendo participante manualmente: ${participant.userName}`);
      sessions[sessionId].participants = sessions[sessionId].participants.filter((p) => p.userId !== userId);
      
      // Notificar todos os participantes sobre a saída
      io.to(sessionId).emit("participant_left", { 
        userId, 
        userName: participant.userName 
      });
      
      updateSession(sessionId);
    }
  });

  // 🚪 Tentativa de remover participante ao sair
  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectou:", socket.id);

    // Encontrar a sessão e o participante que desconectou
    let foundSession = null;
    let foundParticipant = null;

    for (const sessionId in sessions) {
      const session = sessions[sessionId];
      const participant = session.participants.find((p) => p.socketId === socket.id);
      if (participant) {
        foundSession = session;
        foundParticipant = participant;
        break;
      }
    }

    if (!foundSession || !foundParticipant) {
      console.log("⚠️ Participante não encontrado para desconexão");
      return;
    }

    console.log(`👤 Participante ${foundParticipant.userName} (${foundParticipant.userId}) desconectou`);

    // Se é o último participante, deletar a sessão
    if (foundSession.participants.length === 1) {
      console.log(`🗑️ Último participante saiu, deletando sessão ${foundSession.sessionId}`);
      delete sessions[foundSession.sessionId];
      delete pendingRemovals[foundSession.sessionId];
      return;
    }

    // Se as cartas estão reveladas, adicionar à lista de remoção pendente
    if (foundSession.isRevealed) {
      console.log(`🕒 Adicionando ${foundParticipant.userName} à lista de remoção pendente`);
      pendingRemovals[foundSession.sessionId].add(foundParticipant.userId);
    } else {
      // Remover imediatamente se as cartas não estão reveladas
      console.log(`🗑️ Removendo ${foundParticipant.userName} imediatamente`);
      foundSession.participants = foundSession.participants.filter(
        (p) => p.userId !== foundParticipant.userId
      );
      
      // Notificar todos os participantes sobre a saída
      io.to(foundSession.sessionId).emit("participant_left", { 
        userId: foundParticipant.userId, 
        userName: foundParticipant.userName 
      });
      
      updateSession(foundSession.sessionId);
    }
  });

  // 🎫 Eventos de tickets
  socket.on("ticket_created", (data) => {
    // Simplesmente re-emitir para todos na sala
    io.to(data.sessionId).emit("ticket_created", { ticket: data.ticket });
  });

  socket.on("ticket_updated", (data) => {
    // Simplesmente re-emitir para todos na sala
    io.to(data.sessionId).emit("ticket_updated", { ticket: data.ticket });
  });

  socket.on("ticket_selected", (data) => {
    // Atualizar sessão com ticket selecionado
    const session = sessions[data.sessionId];
    if (session) {
      session.currentTicketId = data.ticketId || null;
    }
    io.to(data.sessionId).emit("ticket_selected", { ticketId: data.ticketId });
  });

  socket.on("ticket_deleted", (data) => {
    // Simplesmente re-emitir para todos na sala
    io.to(data.sessionId).emit("ticket_deleted", { ticketId: data.ticketId });
  });

  socket.on("final_estimate_set", (data) => {
    // Simplesmente re-emitir para todos na sala
    io.to(data.sessionId).emit("final_estimate_set", { 
      ticketId: data.ticketId, 
      finalEstimate: data.finalEstimate 
    });
  });
});

// Rota de health check
expressApp.get('/health', (req, res) => {
  res.json({ status: 'ok', port: port });
});

// 🚀 Iniciar servidor
server.listen(port, () => {
  console.log(`🚀 Servidor WebSocket rodando na porta ${port}`);
  console.log(`🔌 Socket.io disponível em http://localhost:${port}`);
});
