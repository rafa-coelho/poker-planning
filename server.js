const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const next = require('next')
const { APP_CONFIG } = require('./src/lib/config')

const dev = APP_CONFIG.IS_DEVELOPMENT
const hostname = APP_CONFIG.HOST
const port = APP_CONFIG.PORT

const app = next({ dev });
const handle = app.getRequestHandler();

const sessions = {};
const pendingRemovals = {};

app.prepare().then(() => {
  const expressApp = express();
  const server = createServer(expressApp);
  const io = new Server(server);

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
    }
  }

  // 🔹 Atualizar sessão para todos os participantes
  function updateSession (sessionId) {
    io.to(sessionId).emit("session_update", sessions[sessionId]);
  }

  io.on("connection", (socket) => {
    console.log("🔌 Novo cliente conectado:", socket.id);

    // 🎲 Criar sala
    socket.on("create_room", ({ sessionId, sessionName }) => {
      getOrCreateSession(sessionId, sessionName);
      updateSession(sessionId);
    });

    // 👥 Entrar na sala
    socket.on("join_room", ({ sessionId, sessionName, userId, userName }) => {
      console.log(`👤 ${userName} (${userId}) entrou na sala ${sessionId}`);
      socket.join(sessionId);

      const session = getOrCreateSession(sessionId, sessionName);
      if (
        ["", null, undefined].includes(session.sessionName) 
      ) {
        socket.emit("redirect_to_home");
        return;
      }

      addParticipant(sessionId, userId, userName, socket.id);

      updateSession(sessionId);
    });




    // 🃏 Selecionar carta
    socket.on("select_card", ({ sessionId, userId, cardValue }) => {
      const session = sessions[sessionId];
      if (!session) return;

      const participant = session.participants.find((p) => p.userId === userId);
      if (participant) participant.selectedCard = cardValue;

      updateSession(sessionId);
    });

    // 🔄 Flipar as cartas
    socket.on("flip_cards", ({ sessionId }) => {
      if (!sessions[sessionId]) return;

      sessions[sessionId].isRevealed = true;
      io.to(sessionId).emit("flip_cards");
    });

    // 🔄 Resetar votação
    socket.on("reset_voting", ({ sessionId }) => {
      if (!sessions[sessionId]) return;

      sessions[sessionId].isRevealed = false;
      sessions[sessionId].participants.forEach((p) => (p.selectedCard = null));

      // Remover participantes pendentes
      if (pendingRemovals[sessionId]) {
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

      sessions[sessionId].participants = sessions[sessionId].participants.filter((p) => p.userId !== userId);
      updateSession(sessionId);
    });

    // 🚪 Tentativa de remover participante ao sair
    socket.on("disconnect", () => {
      console.log("❌ Cliente desconectou:", socket.id);

      const session = Object.values(sessions).find((s) =>
        s.participants.some((p) => p.socketId === socket.id)
      );
      if (!session) return;

      const userId = session.participants.find((p) => p.socketId === socket.id)?.userId;
      if (!userId) 
        return;

      // if(session.participants.length === 1) {
      //   delete sessions[session.sessionId];
      //   delete pendingRemovals[session.sessionId];
      //   return;
      // }

      if (session.isRevealed) {
        console.log(`🕒 Adicionando ${userId} à lista de remoção pendente`);
        pendingRemovals[session.sessionId].add(userId);
      } else {
        console.log(`🗑️ Removendo ${userId} imediatamente`);
        session.participants = session.participants.filter((p) => p.userId !== userId);
        updateSession(session.sessionId);
      }
    });
  });

  // 🔗 Rota padrão do Next.js
  expressApp.all("*", (req, res) => handle(req, res));

  // 🚀 Iniciar servidor
  server.listen(port);
});
