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
  },
  // Otimizações de performance
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
});

// Estruturas de dados melhoradas
const sessions = {};
const pendingRemovals = {};
const userConnections = new Map(); // userId -> socketId
const rateLimitMap = new Map(); // socketId -> { count: number, resetTime: number }
const heartbeatMap = new Map(); // socketId -> lastHeartbeat

// Configurações de rate limiting
const RATE_LIMIT_CONFIG = {
  MAX_EVENTS_PER_MINUTE: 60,
  WINDOW_MS: 60000, // 1 minuto
  CLEANUP_INTERVAL: 300000, // 5 minutos
}

// Logging melhorado
function logEvent(event, socketId, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${event} - Socket: ${socketId}`, data);
}

// Rate limiting
function checkRateLimit(socketId) {
  const now = Date.now();
  const userRateLimit = rateLimitMap.get(socketId);
  
  if (!userRateLimit || now > userRateLimit.resetTime) {
    rateLimitMap.set(socketId, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.WINDOW_MS
    });
    return true;
  }
  
  if (userRateLimit.count >= RATE_LIMIT_CONFIG.MAX_EVENTS_PER_MINUTE) {
    return false;
  }
  
  userRateLimit.count++;
  return true;
}

// Cleanup automático de rate limiting
setInterval(() => {
  const now = Date.now();
  for (const [socketId, rateLimit] of rateLimitMap.entries()) {
    if (now > rateLimit.resetTime) {
      rateLimitMap.delete(socketId);
    }
  }
}, RATE_LIMIT_CONFIG.CLEANUP_INTERVAL);

// Cleanup automático de sessões inativas
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of Object.entries(sessions)) {
    // Se sessão não tem participantes há mais de 1 hora, deletar
    if (session.participants.length === 0) {
      const lastActivity = session.lastActivity || 0;
      if (now - lastActivity > 3600000) { // 1 hora
        console.log(`🗑️ Removendo sessão inativa: ${sessionId}`);
        delete sessions[sessionId];
        delete pendingRemovals[sessionId];
      }
    }
  }
}, 300000); // Verificar a cada 5 minutos

// 🔹 Criar ou obter uma sessão
function getOrCreateSession (sessionId, sessionName = "", organizationId = null) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      sessionId,
      sessionName,
      organizationId,
      participants: [],
      isRevealed: false,
      lastActivity: Date.now(),
    };
  }
  if (!pendingRemovals[sessionId]) {
    pendingRemovals[sessionId] = new Set();
  }
  return sessions[sessionId];
}

// 🔹 Adicionar participante a uma sessão
function addParticipant (sessionId, userId, userName, socketId, organizationId = null) {
  const session = getOrCreateSession(sessionId, "", organizationId);
  const existing = session.participants.find((p) => p.userId === userId);
  if (!existing) {
    session.participants.push({ userId, userName, socketId, selectedCard: null });
  } else {
    // Atualizar socketId se o participante já existe
    existing.socketId = socketId;
  }
  session.lastActivity = Date.now();
}

// 🔹 Atualizar sessão para todos os participantes
function updateSession (sessionId) {
  const session = sessions[sessionId];
  if (session) {
    session.lastActivity = Date.now();
    io.to(sessionId).emit("session_update", {
      ...session,
      currentTicketId: session.currentTicketId || null
    });
  }
}

// 🔹 Verificar isolamento por organização
function validateOrganizationAccess(socket, sessionId, organizationId) {
  const session = sessions[sessionId];
  if (session && session.organizationId && session.organizationId !== organizationId) {
    logEvent('UNAUTHORIZED_ACCESS', socket.id, { sessionId, organizationId });
    socket.emit('error', { message: 'Unauthorized access to session' });
    return false;
  }
  return true;
}

io.on("connection", (socket) => {
  logEvent('CONNECTION', socket.id);

  // Heartbeat
  socket.on('heartbeat', () => {
    heartbeatMap.set(socket.id, Date.now());
    socket.emit('heartbeat_ack');
  });

  // 🎲 Criar sala
  socket.on("create_room", ({ sessionId, sessionName, organizationId }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    logEvent('CREATE_ROOM', socket.id, { sessionId, sessionName, organizationId });
    getOrCreateSession(sessionId, sessionName, organizationId);
    updateSession(sessionId);
  });

  // 🚪 Entrar na sala
  socket.on("join_room", ({ sessionId, userId, userName, sessionName, organizationId }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    logEvent('JOIN_ROOM', socket.id, { sessionId, userId, userName, organizationId });

    // Validar acesso por organização
    if (!validateOrganizationAccess(socket, sessionId, organizationId)) {
      return;
    }

    socket.join(sessionId);

    // Inicializar sessão se não existir
    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        sessionId,
        sessionName: sessionName || "Sessão Poker Planning",
        organizationId,
        participants: [],
        isRevealed: false,
        currentTicketId: null,
        votingMode: "FIBONACCI",
        lastActivity: Date.now()
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

    // Registrar conexão do usuário
    userConnections.set(userId, socket.id);

    // Enviar dados atualizados da sessão
    updateSession(sessionId);
  });

  // 🃏 Selecionar carta
  socket.on("select_card", ({ sessionId, userId, cardValue, organizationId }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, sessionId, organizationId)) {
      return;
    }

    logEvent('SELECT_CARD', socket.id, { sessionId, userId, cardValue });
    
    const session = sessions[sessionId];
    if (!session) return;
    
    const participant = session.participants.find((p) => p.userId === userId);
    if (participant) {
      participant.selectedCard = cardValue;
      updateSession(sessionId);
    }
  });

  // 🎯 Iniciar votação
  socket.on("voting_started", ({ sessionId, ticketId, organizationId }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, sessionId, organizationId)) {
      return;
    }

    logEvent('VOTING_STARTED', socket.id, { sessionId, ticketId });
    
    const session = sessions[sessionId];
    if (!session) return;

    // Resetar votos anteriores
    session.participants.forEach((p) => (p.selectedCard = null));
    session.isRevealed = false;
    
    updateSession(sessionId);
  });

  // ✅ Finalizar votação
  socket.on("voting_finished", ({ sessionId, ticketId, averageVote, organizationId }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, sessionId, organizationId)) {
      return;
    }

    logEvent('VOTING_FINISHED', socket.id, { sessionId, ticketId, averageVote });
    
    const session = sessions[sessionId];
    if (!session) return;
    
    updateSession(sessionId);
  });

  // 🔄 Flipar as cartas
  socket.on("flip_cards", ({ sessionId, organizationId }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, sessionId, organizationId)) {
      return;
    }

    logEvent('FLIP_CARDS', socket.id, { sessionId });
    
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
  socket.on("new_voting", ({ sessionId, organizationId }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, sessionId, organizationId)) {
      return;
    }

    logEvent('NEW_VOTING', socket.id, { sessionId });
    
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
  socket.on("set_revealed", ({ sessionId, isRevealed, organizationId }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, sessionId, organizationId)) {
      return;
    }

    logEvent('SET_REVEALED', socket.id, { sessionId, isRevealed });
    
    if (!sessions[sessionId]) return;

    sessions[sessionId].isRevealed = isRevealed;
    updateSession(sessionId);
  });

  // ❌ Remover participante manualmente
  socket.on("remove_participant", ({ sessionId, userId, organizationId }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, sessionId, organizationId)) {
      return;
    }

    logEvent('REMOVE_PARTICIPANT', socket.id, { sessionId, userId });
    
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
    logEvent('DISCONNECT', socket.id);

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

    // Limpar registros
    userConnections.delete(foundParticipant.userId);
    rateLimitMap.delete(socket.id);
    heartbeatMap.delete(socket.id);

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
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, data.sessionId, data.organizationId)) {
      return;
    }

    logEvent('TICKET_CREATED', socket.id, { sessionId: data.sessionId, ticketId: data.ticket?.id });
    // Simplesmente re-emitir para todos na sala
    io.to(data.sessionId).emit("ticket_created", { ticket: data.ticket });
  });

  socket.on("ticket_updated", (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, data.sessionId, data.organizationId)) {
      return;
    }

    logEvent('TICKET_UPDATED', socket.id, { sessionId: data.sessionId, ticketId: data.ticket?.id });
    // Simplesmente re-emitir para todos na sala
    io.to(data.sessionId).emit("ticket_updated", { ticket: data.ticket });
  });

  socket.on("ticket_selected", (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, data.sessionId, data.organizationId)) {
      return;
    }

    logEvent('TICKET_SELECTED', socket.id, { sessionId: data.sessionId, ticketId: data.ticketId });
    // Atualizar sessão com ticket selecionado
    const session = sessions[data.sessionId];
    if (session) {
      session.currentTicketId = data.ticketId || null;
    }
    // Emitir apenas o evento específico - não updateSession para evitar condição de corrida
    io.to(data.sessionId).emit("ticket_selected", { ticketId: data.ticketId });
  });

  socket.on("ticket_deleted", (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, data.sessionId, data.organizationId)) {
      return;
    }

    logEvent('TICKET_DELETED', socket.id, { sessionId: data.sessionId, ticketId: data.ticketId });
    // Simplesmente re-emitir para todos na sala
    io.to(data.sessionId).emit("ticket_deleted", { ticketId: data.ticketId });
  });

  socket.on("final_estimate_set", (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, data.sessionId, data.organizationId)) {
      return;
    }

    logEvent('FINAL_ESTIMATE_SET', socket.id, { sessionId: data.sessionId, ticketId: data.ticketId });
    // Simplesmente re-emitir para todos na sala
    io.to(data.sessionId).emit("final_estimate_set", { 
      ticketId: data.ticketId, 
      finalEstimate: data.finalEstimate 
    });
  });
});

// Rota de health check
expressApp.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: port,
    sessions: Object.keys(sessions).length,
    connections: io.engine.clientsCount,
    rateLimitEntries: rateLimitMap.size,
    heartbeatEntries: heartbeatMap.size
  });
});

// Rota de status detalhado
expressApp.get('/status', (req, res) => {
  const now = Date.now();
  const activeConnections = Array.from(heartbeatMap.entries())
    .filter(([socketId, lastHeartbeat]) => now - lastHeartbeat < 60000) // Último minuto
    .length;

  res.json({
    server: {
      port,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
    websocket: {
      totalConnections: io.engine.clientsCount,
      activeConnections,
      sessions: Object.keys(sessions).length,
      rateLimitEntries: rateLimitMap.size,
    },
    sessions: Object.entries(sessions).map(([id, session]) => ({
      id,
      name: session.sessionName,
      participants: session.participants.length,
      organizationId: session.organizationId,
      lastActivity: session.lastActivity,
    }))
  });
});

// 🚀 Iniciar servidor
server.listen(port, () => {
  console.log(`🚀 Servidor WebSocket rodando na porta ${port}`);
  console.log(`🔌 Socket.io disponível em http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📈 Status detalhado: http://localhost:${port}/status`);
});
