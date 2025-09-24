const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
// Import Prisma directly since we're in a CommonJS environment
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Simple PrismaService wrapper for CommonJS
const PrismaService = {
  // Carregar sessão com participantes
  async loadSession(sessionId) {
    try {
      const dbSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          name: true,
          organizationId: true,
          currentTicketId: true,
          votingMode: true,
          isRevealed: true, // Incluir estado isRevealed
          participants: {
            where: { isActive: true },
            select: {
              id: true,
              userId: true,
              selectedCard: true,
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })
      
      return dbSession
    } catch (error) {
      console.error('Erro ao carregar sessão:', error)
      throw error
    }
  },

  // Carregar sessão do modo aberto
  async loadOpenSession(sessionId) {
    try {
      const dbSession = await prisma.openSession.findUnique({
        where: { id: sessionId },
        include: {
          participants: {
            where: { isActive: true },
            orderBy: { joinedAt: 'asc' }
          },
          tickets: {
            orderBy: { createdAt: 'desc' }
          },
          currentTicket: true
        }
      });
      
      return dbSession;
    } catch (error) {
      console.error('Erro ao carregar sessão aberta:', error);
      throw error;
    }
  },

  // Persistir voto do participante
  async persistVote(sessionId, userId, cardValue) {
    try {
      // Buscar o participante no banco
      const dbParticipant = await prisma.sessionParticipant.findFirst({
        where: {
          sessionId: sessionId,
          userId: userId
        }
      })
      
      if (dbParticipant) {
        // Atualizar o voto do participante
        await prisma.sessionParticipant.update({
          where: { id: dbParticipant.id },
          data: { selectedCard: cardValue }
        })
      } else {
        // Se não existe, criar um registro (pode acontecer com convidados)
        await prisma.sessionParticipant.create({
          data: {
            sessionId: sessionId,
            userId: userId,
            selectedCard: cardValue,
            isActive: true
          }
        })
      }
    } catch (error) {
      console.error('Erro ao persistir voto:', error)
      throw error
    }
  },

  // Limpar votos de todos os participantes da sessão
  async clearVotes(sessionId) {
    try {
      await prisma.sessionParticipant.updateMany({
        where: { sessionId: sessionId },
        data: { selectedCard: null }
      })
    } catch (error) {
      console.error('Erro ao limpar votos:', error)
      throw error
    }
  },

  // Marcar participante como inativo
  async markParticipantInactive(sessionId, userId) {
    try {
      await prisma.sessionParticipant.updateMany({
        where: { 
          sessionId: sessionId,
          userId: userId
        },
        data: { isActive: false }
      })
    } catch (error) {
      console.error('Erro ao marcar participante como inativo:', error)
      throw error
    }
  },

  // Atualizar estado isRevealed no banco (modo normal)
  async updateSessionRevealedState(sessionId, isRevealed) {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: { isRevealed }
      });
    } catch (error) {
      console.error('Erro ao atualizar estado isRevealed:', error);
      throw error;
    }
  },

  // Atualizar estado isRevealed no banco (modo aberto)
  async updateOpenSessionRevealedState(sessionId, isRevealed) {
    try {
      await prisma.openSession.update({
        where: { id: sessionId },
        data: { isRevealed }
      });
    } catch (error) {
      console.error('Erro ao atualizar estado isRevealed (modo aberto):', error);
      throw error;
    }
  },

  // Atualizar ticket atual da sessão
  async updateCurrentTicket(sessionId, ticketId) {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: { currentTicketId: ticketId }
      })
    } catch (error) {
      console.error('Erro ao atualizar ticket atual:', error)
      throw error
    }
  },

  // Desconectar Prisma
  async disconnect() {
    await prisma.$disconnect()
  }
}

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
  // Configurações de reconexão
  allowEIO3: true,
  // Configurações de rate limiting
  connectTimeout: 45000,
  // Configurações de rooms
  maxHttpBufferSize: 1e6,
});

// Estruturas de dados melhoradas
const sessions = {};
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
      }
    }
  }
}, 300000); // Verificar a cada 5 minutos

// Monitoramento de conexões ativas
setInterval(() => {
  const activeConnections = io.engine.clientsCount;
  const activeSessions = Object.keys(sessions).length;
  const totalParticipants = Object.values(sessions).reduce((sum, session) => sum + session.participants.length, 0);

  console.log(`📊 Status do servidor: ${activeConnections} conexões, ${activeSessions} sessões, ${totalParticipants} participantes`);

  // Log de sessões com problemas
  for (const [sessionId, session] of Object.entries(sessions)) {
    if (session.participants.length > 0) {
      const activeParticipants = session.participants.filter(p => {
        const socket = io.sockets.sockets.get(p.socketId);
        return socket && socket.connected;
      });

      if (activeParticipants.length !== session.participants.length) {
        console.log(`⚠️ Sessão ${sessionId}: ${activeParticipants.length}/${session.participants.length} participantes ativos`);
      }
    }
  }
}, 60000); // Verificar a cada 1 minuto

// 🔹 Criar ou obter uma sessão
function getOrCreateSession(sessionId, sessionName = "", organizationId = null) {
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

  return sessions[sessionId];
}

// 🔹 Adicionar participante a uma sessão
function addParticipant(sessionId, userId, userName, socketId, organizationId = null) {
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
function updateSession(sessionId) {
  const session = sessions[sessionId];
  if (session) {
    session.lastActivity = Date.now();
    
    // Converter participantes para o formato esperado pelo frontend
    const formattedParticipants = session.participants.map(p => ({
      id: p.userId,
      name: p.userName,
      selectedCard: p.selectedCard,
      isCurrentUser: false // Será definido no frontend baseado no localStorage
    }));
    
    io.to(sessionId).emit("session_update", {
      ...session,
      participants: formattedParticipants,
      currentTicketId: session.currentTicketId || null
    });
  }
}

// 🔹 Verificar isolamento por organização
function validateOrganizationAccess(socket, sessionId, organizationId) {
  const session = sessions[sessionId];

  // Se a sessão não tem organizationId definido, permitir acesso
  if (!session || !session.organizationId) {
    return true;
  }

  // Se o organizationId é null/undefined (convidado público), permitir acesso
  if (!organizationId) {
    return true;
  }

  // Se ambos têm organizationId, verificar se são iguais
  if (session.organizationId !== organizationId) {
    logEvent('UNAUTHORIZED_ACCESS', socket.id, { sessionId, organizationId });
    socket.emit('error', { message: 'Unauthorized access to session' });
    return false;
  }

  return true;
}

// 🔹 Verificar se o socket está conectado e ativo
function isSocketActive(socket) {
  return socket && socket.connected && socket.lastActivity &&
    (Date.now() - socket.lastActivity) < 120000; // 2 minutos
}

io.on("connection", (socket) => {
  logEvent('CONNECTION', socket.id);

  // Armazenar informações da conexão
  socket.connectedAt = Date.now();
  socket.lastActivity = Date.now();

  // Middleware para capturar erros não tratados
  socket.onAny((eventName, ...args) => {
    try {
      socket.lastActivity = Date.now();
    } catch (error) {
      console.error('Erro no evento:', eventName, error);
    }
  });

  // Heartbeat
  socket.on('heartbeat', () => {
    heartbeatMap.set(socket.id, Date.now());
    socket.lastActivity = Date.now();
    socket.emit('heartbeat_ack');
  });

  // Desconexão
  socket.on('disconnect', (reason) => {
    logEvent('DISCONNECT', socket.id, { reason });

    // Limpar dados do usuário
    if (socket.userId) {
      userConnections.delete(socket.userId);
    }

    // Remover de rate limiting
    rateLimitMap.delete(socket.id);

    // Remover de heartbeat
    heartbeatMap.delete(socket.id);

    // Remover de todas as salas
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });
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
  socket.on("join_room", async ({ sessionId, userId, userName, sessionName, organizationId, votingMode, mode }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    console.log(`🔍 JOIN_ROOM - Iniciando: sessionId=${sessionId}, userId=${userId}, userName=${userName}, mode=${mode}, organizationId=${organizationId}`);
    logEvent('JOIN_ROOM', socket.id, { sessionId, userId, userName, organizationId });

    // Armazenar informações do usuário no socket
    socket.userId = userId;
    socket.sessionId = sessionId;
    socket.organizationId = organizationId;

    // Validar acesso por organização (pular se for modo aberto)
    if (mode !== 'open' && !validateOrganizationAccess(socket, sessionId, organizationId)) {
      return;
    }

    // Sair de outras salas se estiver em alguma
    socket.rooms.forEach(room => {
      if (room !== socket.id && room !== sessionId) {
        socket.leave(room);
      }
    });

    socket.join(sessionId);

    // Inicializar sessão se não existir
    console.log(`🔍 JOIN_ROOM - Verificando se sessão existe: ${sessionId}, exists=${!!sessions[sessionId]}`);
    if (!sessions[sessionId]) {
      console.log(`🔍 JOIN_ROOM - Sessão não existe, criando... mode=${mode}`);
      // Se for modo aberto, carregar do banco ou criar nova
      if (mode === 'open') {
        try {
          // Tentar carregar sessão existente do banco
          const dbSession = await PrismaService.loadOpenSession(sessionId);
          
          if (dbSession) {
            // Converter participantes do banco para o formato da sessão
            const participants = dbSession.participants.map(p => ({
              userId: p.id,
              userName: p.name,
              socketId: null, // Será definido quando o participante se conectar
              isCurrentUser: false,
              selectedCard: p.selectedCard
            }));

            sessions[sessionId] = {
              sessionId: dbSession.id,
              sessionName: dbSession.name || `Sessão ${process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || 'Poker Planning'}`,
              organizationId: null, // Modo aberto não tem organização
              participants: participants,
              isRevealed: dbSession.isRevealed || false, // Preservar estado do banco
              currentTicketId: dbSession.currentTicketId,
              votingMode: dbSession.votingMode,
              lastActivity: Date.now()
            };
            console.log(`📊 Sessão aberta carregada do banco: ${sessionId}, isRevealed: ${dbSession.isRevealed}`);
          } else {
            // Criar nova sessão aberta se não existir no banco
            sessions[sessionId] = {
              sessionId,
              sessionName: sessionName || `Sessão ${process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || 'Poker Planning'}`,
              organizationId: null, // Modo aberto não tem organização
              participants: [],
              isRevealed: false,
              currentTicketId: null,
              votingMode: votingMode,
              lastActivity: Date.now()
            };
            console.log(`📊 Nova sessão aberta criada: ${sessionId}`);
          }
        } catch (error) {
          console.error('Erro ao carregar sessão aberta:', error);
          // Fallback para nova sessão em caso de erro
          sessions[sessionId] = {
            sessionId,
            sessionName: sessionName || `Sessão ${process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || 'Poker Planning'}`,
            organizationId: null, // Modo aberto não tem organização
            participants: [],
            isRevealed: false,
            currentTicketId: null,
            votingMode: votingMode,
            lastActivity: Date.now()
          };
          console.log(`📊 Sessão aberta criada como fallback: ${sessionId}`);
        }
      } else {
        // Carregar dados do banco de dados (modo normal)
        try {
          const dbSession = await PrismaService.loadSession(sessionId);

        if (dbSession) {
          // Converter participantes do banco para o formato da sessão
          const participants = dbSession.participants.map(p => ({
            userId: p.userId,
            userName: p.user?.name || 'Participante',
            socketId: null, // Será definido quando o participante se conectar
            isCurrentUser: false,
            selectedCard: p.selectedCard
          }));

          sessions[sessionId] = {
            sessionId: dbSession.id,
            sessionName: dbSession.name || sessionName || `Sessão ${process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || 'Poker Planning'}`,
            organizationId: dbSession.organizationId || organizationId,
            participants: participants,
            isRevealed: dbSession.isRevealed || false, // Preservar estado do banco
            currentTicketId: dbSession.currentTicketId,
            votingMode: dbSession.votingMode || votingMode,
            lastActivity: Date.now()
          };
          console.log(`📊 Sessão carregada do banco: ${sessionId}, currentTicketId: ${dbSession.currentTicketId}, participantes: ${participants.length}`);
        } else {
          // Fallback para sessão não encontrada no banco
          sessions[sessionId] = {
            sessionId,
            sessionName: sessionName || `Sessão ${process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || 'Poker Planning'}`,
            organizationId,
            participants: [],
            isRevealed: false,
            currentTicketId: null,
            votingMode: votingMode,
            lastActivity: Date.now()
          };
        }
      } catch (error) {
        console.error('Erro ao carregar sessão do banco:', error);
        // Fallback em caso de erro
        sessions[sessionId] = {
          sessionId,
          sessionName: sessionName || `Sessão ${process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || 'Poker Planning'}`,
          organizationId,
          participants: [],
          isRevealed: false,
          currentTicketId: null,
          votingMode: votingMode,
          lastActivity: Date.now()
        };
      }
    }
  }

    // Atualizar participante existente ou adicionar novo
    console.log(`🔍 JOIN_ROOM - Adicionando participante: userId=${userId}, userName=${userName}`);
    const existingParticipant = sessions[sessionId].participants.find(p => p.userId === userId);
    if (existingParticipant) {
      // Atualizar socketId e userName do participante existente
      existingParticipant.socketId = socket.id;
      existingParticipant.userName = userName;
      console.log(`🔄 Participante reconectado: ${userName} (${userId})`);
    } else {
      // Adicionar novo participante
      sessions[sessionId].participants.push({
        userId,
        userName,
        socketId: socket.id,
        isCurrentUser: false,
        selectedCard: null
      });
      console.log(`➕ Novo participante adicionado: ${userName} (${userId})`);
      console.log(`🔍 JOIN_ROOM - Total de participantes na sessão: ${sessions[sessionId].participants.length}`);
      
      // Emitir evento de participante juntado
      io.to(sessionId).emit('participant_joined', {
        userId,
        userName
      });
    }

    // Limpar participantes inativos (que não têm socketId) quando alguém se reconecta
    const activeParticipants = sessions[sessionId].participants.filter(p => p.socketId !== null);
    if (activeParticipants.length !== sessions[sessionId].participants.length) {
      console.log(`🧹 Removendo ${sessions[sessionId].participants.length - activeParticipants.length} participantes inativos durante reconexão`);
      sessions[sessionId].participants = activeParticipants;
    }

    // Registrar conexão do usuário
    userConnections.set(userId, socket.id);

    // Atualizar atividade da sessão
    sessions[sessionId].lastActivity = Date.now();

    // Enviar dados atualizados da sessão
    updateSession(sessionId);

    // Confirmar entrada na sala
    socket.emit('room_joined', { sessionId, success: true });
  });

  // 🚪 Participante público se juntando para receber notificações
  socket.on("join_public_participant", ({ participantId, sessionId }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    logEvent('JOIN_PUBLIC_PARTICIPANT', socket.id, {
      participantId,
      sessionId
    });

    // Juntar à sala específica do participante
    socket.join(`participant_${participantId}`);

    // Armazenar informações do participante
    socket.participantId = participantId;
    socket.sessionId = sessionId;

    // Juntar também à sala da sessão para receber atualizações gerais
    socket.join(sessionId);
  });

  // 🃏 Selecionar carta
  socket.on("select_card", async ({ sessionId, userId, cardValue, organizationId }) => {
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

      // Persistir voto no banco de dados (apenas se não for modo aberto)
      if (organizationId !== null) {
        try {
          await PrismaService.persistVote(sessionId, userId, cardValue);
        } catch (error) {
          console.error('Erro ao persistir voto no banco:', error);
        }
      }

      // Emitir evento de atualização de voto
      io.to(sessionId).emit('vote_update', {
        userId,
        cardValue
      });

      updateSession(sessionId);
    }
  });

  // 🎯 Iniciar votação
  socket.on("voting_started", async ({ sessionId, ticketId, organizationId }) => {
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

    // Persistir estado no banco
    try {
      if (organizationId === null) {
        // Modo aberto
        await PrismaService.updateOpenSessionRevealedState(sessionId, false);
      } else {
        // Modo normal  
        await PrismaService.updateSessionRevealedState(sessionId, false);
      }
    } catch (error) {
      console.error('Erro ao persistir estado isRevealed=false (voting_started):', error);
    }

    // Limpar votos no banco de dados
    try {
      await PrismaService.clearVotes(sessionId);
    } catch (error) {
      console.error('Erro ao limpar votos no banco:', error);
    }

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
    setTimeout(async () => {
      if (sessions[sessionId]) {
        sessions[sessionId].isRevealed = true;
        
        // Persistir estado no banco
        try {
          if (organizationId === null) {
            // Modo aberto
            await PrismaService.updateOpenSessionRevealedState(sessionId, true);
          } else {
            // Modo normal
            await PrismaService.updateSessionRevealedState(sessionId, true);
          }
        } catch (error) {
          console.error('Erro ao persistir estado isRevealed=true:', error);
        }
        
        updateSession(sessionId);
      }
    }, 3000);
  });

  // 🔄 Resetar votação
  socket.on("new_voting", async ({ sessionId, organizationId }) => {
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

    // Persistir estado no banco
    try {
      if (organizationId === null) {
        // Modo aberto
        await PrismaService.updateOpenSessionRevealedState(sessionId, false);
      } else {
        // Modo normal
        await PrismaService.updateSessionRevealedState(sessionId, false);
      }
    } catch (error) {
      console.error('Erro ao persistir estado isRevealed=false:', error);
    }

    // Limpar votos no banco de dados (apenas se não for modo aberto)
    if (organizationId !== null) {
      try {
        await PrismaService.clearVotes(sessionId);
      } catch (error) {
        console.error('Erro ao limpar votos no banco:', error);
      }
    }

    // Limpar participantes inativos (que não têm socketId)
    const activeParticipants = sessions[sessionId].participants.filter(p => p.socketId !== null);
    if (activeParticipants.length !== sessions[sessionId].participants.length) {
      console.log(`🧹 Removendo ${sessions[sessionId].participants.length - activeParticipants.length} participantes inativos`);
      sessions[sessionId].participants = activeParticipants;
    }

    // Emitir evento de nova votação
    io.to(sessionId).emit('new_voting');

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
  socket.on("disconnect", async () => {
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

    // Se é o último participante, deletar a sessão (com delay para OpenMode)
    if (foundSession.participants.length === 1) {
      console.log(`🗑️ Último participante saiu, agendando deleção da sessão ${foundSession.sessionId}`);
      
      // Para OpenMode, adicionar delay antes de deletar
      if (foundSession.organizationId === null) {
        console.log(`⏰ OpenMode: aguardando 30 segundos antes de deletar sessão ${foundSession.sessionId}`);
        setTimeout(() => {
          // Verificar se ainda não há participantes
          if (sessions[foundSession.sessionId] && sessions[foundSession.sessionId].participants.length === 0) {
            console.log(`🗑️ Deletando sessão OpenMode após delay: ${foundSession.sessionId}`);
            delete sessions[foundSession.sessionId];
          } else {
            console.log(`✅ Sessão OpenMode ${foundSession.sessionId} foi reativada, cancelando deleção`);
          }
        }, 30000); // 30 segundos de delay
      } else {
        // Para sessões normais, deletar imediatamente
        console.log(`🗑️ Deletando sessão normal: ${foundSession.sessionId}`);
        delete sessions[foundSession.sessionId];
      }
      return;
    }

    // Marcar participante como desconectado
    console.log(`🔌 Participante ${foundParticipant.userName} desconectado`);

    // Marcar como inativo no banco de dados
    try {
      await PrismaService.markParticipantInactive(foundSession.sessionId, foundParticipant.userId);
    } catch (error) {
      console.error('Erro ao marcar participante como inativo:', error);
    }

    // Notificar todos os participantes sobre a saída ANTES de marcar como desconectado
    io.to(foundSession.sessionId).emit("participant_left", {
      userId: foundParticipant.userId,
      userName: foundParticipant.userName
    });

    // Remover participante da sessão para que o session_update não o inclua
    foundSession.participants = foundSession.participants.filter((p) => p.userId !== foundParticipant.userId);
    
    // Aguardar um pouco antes de enviar o session_update para garantir que o participant_left seja processado
    setTimeout(() => {
      // Atualizar a sessão para todos os participantes restantes
      updateSession(foundSession.sessionId);
    }, 100); // 100ms de delay
  });

  // 🎫 Eventos de tickets
  socket.on("ticket_created", (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    console.log(`🔍 TICKET_CREATED - Validando acesso: sessionId=${data.sessionId}, organizationId=${data.organizationId}`);
    const hasAccess = validateOrganizationAccess(socket, data.sessionId, data.organizationId);
    console.log(`🔍 TICKET_CREATED - Acesso ${hasAccess ? 'PERMITIDO' : 'NEGADO'}`);
    
    if (!hasAccess) {
      return;
    }

    logEvent('TICKET_CREATED', socket.id, { sessionId: data.sessionId, ticketId: data.ticket?.id });
    console.log(`🔍 TICKET_CREATED - Re-emitindo para sala: ${data.sessionId}`);
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

  socket.on("ticket_selected", async (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    console.log(`🔍 TICKET_SELECTED - Validando acesso: sessionId=${data.sessionId}, organizationId=${data.organizationId}`);
    const hasAccess = validateOrganizationAccess(socket, data.sessionId, data.organizationId);
    console.log(`🔍 TICKET_SELECTED - Acesso ${hasAccess ? 'PERMITIDO' : 'NEGADO'}`);
    
    if (!hasAccess) {
      return;
    }

    logEvent('TICKET_SELECTED', socket.id, { sessionId: data.sessionId, ticketId: data.ticketId });

    // Atualizar sessão em memória
    const session = sessions[data.sessionId];
    if (session) {
      session.currentTicketId = data.ticketId || null;
      console.log(`🔍 TICKET_SELECTED - Sessão atualizada: currentTicketId=${session.currentTicketId}`);
    } else {
      console.log(`🔍 TICKET_SELECTED - Sessão não encontrada: ${data.sessionId}`);
    }

    // Persistir no banco de dados (apenas se não for modo aberto)
    if (data.organizationId !== null) {
      try {
        await PrismaService.updateCurrentTicket(data.sessionId, data.ticketId || null);
      } catch (error) {
        console.error('Erro ao persistir currentTicketId no banco:', error);
      }
    }

    // Emitir apenas o evento específico - não updateSession para evitar condição de corrida
    console.log(`🔍 TICKET_SELECTED - Re-emitindo para sala: ${data.sessionId}`);
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

  // Eventos para public access
  socket.on("public-access-request", (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    logEvent('PUBLIC_ACCESS_REQUEST', socket.id, {
      sessionId: data.sessionId,
      participantId: data.participantId,
      participantName: data.participantName
    });

    // Notificar o dono da sessão sobre a nova solicitação
    io.to(data.sessionId).emit("public-access-request", {
      participantId: data.participantId,
      participantName: data.participantName,
      timestamp: new Date().toISOString()
    });
  });

  socket.on("public-access-response", (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, data.sessionId, data.organizationId)) {
      return;
    }

    logEvent('PUBLIC_ACCESS_RESPONSE', socket.id, {
      sessionId: data.sessionId,
      participantId: data.participantId,
      action: data.action
    });

    // Notificar o participante sobre a resposta (aprovação/rejeição)
    // Enviar para uma sala específica do participante
    io.to(`participant_${data.participantId}`).emit("public-access-response", {
      participantId: data.participantId,
      action: data.action,
      sessionId: data.sessionId,
      authToken: data.authToken,
      timestamp: new Date().toISOString()
    });
  });

  // Evento para encerrar sessão
  socket.on("session_ended", (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (!validateOrganizationAccess(socket, data.sessionId, data.organizationId)) {
      return;
    }

    logEvent('SESSION_ENDED', socket.id, {
      sessionId: data.sessionId
    });

    // Notificar todos os participantes na sala que a sessão foi encerrada
    io.to(data.sessionId).emit("session_ended", {
      sessionId: data.sessionId,
      timestamp: new Date().toISOString()
    });

    // Limpar a sessão da memória
    if (sessions[data.sessionId]) {
      delete sessions[data.sessionId];
      console.log(`🗑️ Sessão ${data.sessionId} removida da memória após encerramento`);
    }
  });
});

// Endpoint para emitir eventos de tickets (chamado pela API do Next.js)
expressApp.post('/emit-event', express.json(), (req, res) => {
  const { eventName, sessionId, data } = req.body;
  
  if (!eventName || !sessionId) {
    return res.status(400).json({ error: 'eventName e sessionId são obrigatórios' });
  }
  
  console.log(`🎫 SERVER: Emitindo evento ${eventName} para sala ${sessionId}:`, data);
  io.to(sessionId).emit(eventName, data);
  
  res.json({ success: true, eventName, sessionId });
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

// 🧹 Limpeza periódica de participantes inativos
setInterval(() => {
  let totalRemoved = 0;

  for (const sessionId in sessions) {
    const session = sessions[sessionId];
    const initialCount = session.participants.length;
    
    // Remover participantes que não têm socketId (desconectados há mais de 5 minutos)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    session.participants = session.participants.filter(p => {
      // Manter participantes com socketId ativo
      if (p.socketId !== null) return true;
      
      // Manter participantes que foram desconectados recentemente (menos de 5 minutos)
      // Isso evita conflitos com a lógica de desconexão
      return true; // Temporariamente desabilitado para evitar conflitos
    });
    
    const removed = initialCount - session.participants.length;
    if (removed > 0) {
      console.log(`🧹 Sessão ${sessionId}: removidos ${removed} participantes inativos`);
      totalRemoved += removed;
      
      // Atualizar a sessão para todos os participantes restantes
      updateSession(sessionId);
    }
  }

  if (totalRemoved > 0) {
    console.log(`🧹 Limpeza periódica: ${totalRemoved} participantes inativos removidos no total`);
  }
}, 30000); // Executar a cada 30 segundos

// 🚀 Iniciar servidor
server.listen(port, () => {
  console.log(`🚀 Servidor WebSocket rodando na porta ${port}`);
  console.log(`🔌 Socket.io disponível em http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📈 Status detalhado: http://localhost:${port}/status`);
});

// Cleanup quando o servidor for encerrado
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando servidor WebSocket...');
  await PrismaService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Encerrando servidor WebSocket...');
  await PrismaService.disconnect();
  process.exit(0);
});
