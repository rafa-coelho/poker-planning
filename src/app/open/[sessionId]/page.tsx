"use client";

import React, { useState, useEffect, useMemo } from "react";
import "../../../i18n/index";
import { useTranslation } from "react-i18next";
import { useParams, useRouter } from "next/navigation";

import HeaderBar from "../../../components/HeaderBar";
import VoteBar from "../../../components/VoteBar";
import InviteModal from "../../../components/InviteModal";
import OpenModeTicketManager from "../../../components/OpenModeTicketManager";
import OpenModeFinalEstimateModal from "../../../components/OpenModeFinalEstimateModal";
import ParticipantNotification from "../../../components/ParticipantNotification";
import MobileMenu from "../../../components/MobileMenu";
import { useOpenSession } from "@/components/useOpenSession";
import Table from "@/components/Table";
import VoteSummary from "@/components/VoteSummary";
import { APP_CONFIG } from "@/lib/config";

export default function OpenModeSessionPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { t } = useTranslation("common");
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  // Verificar se está no modo aberto
  if (!APP_CONFIG.OPEN_MODE) {
    router.push("/");
    return null;
  }

  const {
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
  } = useOpenSession();

  // No OpenMode, o criador é determinado de forma mais robusta
  // Verifica se é o criador baseado no localStorage - NÃO usar fallback por ordem
  const canManageTickets = useMemo(() => {
    if (!currentUser || sessionData.participants.length === 0) return false;
    
    // Verifica se está marcado como criador no localStorage
    const creatorData = typeof window !== 'undefined' 
      ? localStorage.getItem(`openModeCreator_${sessionId}`)
      : null;
    
    if (creatorData) {
      try {
        const creator = JSON.parse(creatorData);
        const isCreator = creator.userId === currentUser.id;
        console.log('🏆 Verificando criador:', { 
          currentUserId: currentUser.id, 
          creatorId: creator.userId, 
          isCreator 
        });
        return isCreator;
      } catch {
        console.log('❌ Erro ao parsear dados do criador');
      }
    }
    
    // Se não há criador definido, ninguém pode gerenciar (evita transferência acidental)
    console.log('⚠️ Nenhum criador definido no localStorage');
    return false;
  }, [currentUser, sessionData.participants, sessionId]);

  // Verificar se o usuário está na sessão
  useEffect(() => {
    // Só redirecionar se a sessão foi carregada completamente E não há usuário
    if (sessionData.sessionId && sessionData.sessionName) {
              // Verificar se há usuário no localStorage
        const savedUser = typeof window !== 'undefined' ? localStorage.getItem(`openModeUser_${sessionId}`) : null;
      
      if (!savedUser) {
        // Se não há usuário, redirecionar para join
        router.push(`/open/${sessionId}/join`);
      }
    }
  }, [sessionData.sessionId, sessionData.sessionName, sessionId, router]);

  // Se não há usuário, mostrar loading
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="mt-4 text-gray-600">{t("openMode.session.loading")}</p>
      </div>
    );
  }

  // Verificar se a sessão expirou
  if (sessionData.expiresAt && new Date(sessionData.expiresAt) < new Date()) {
    router.push(`/open/${sessionId}/expired`);
    return null;
  }

  const canVote = !sessionData.isRevealed && !!currentUser;
  
  // Debug temporário
  console.log('🎯 Page: currentTicket =', currentTicket);
  console.log('🎯 Page: sessionData.currentTicketId =', sessionData.currentTicketId);
  
  // Calcular estatísticas de votação
  const votingStats = {
    totalParticipants: sessionData.participants.length,
    votedCount: sessionData.participants.filter(p => p.selectedCard !== null).length,
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      <HeaderBar 
        sessionData={{
          ...sessionData,
          participants: sessionData.participants.map(p => ({
            userId: p.id,
            userName: p.name,
            isCurrentUser: p.isCurrentUser,
            selectedCard: p.selectedCard
          }))
        }}
        userName={currentUser.name} 
        isCreator={canManageTickets}
        onInviteOpen={() => {
          generateInviteLink();
          setInviteOpen(true);
        }}
        onToggleSidebar={() => setMobileMenuOpen(true)}
        onEndSession={handleEndSession}
        pendingRequestsCount={0}
        onShowPendingRequests={() => {}}
        connectionStatus={connectionStatus}
      />

      {/* Menu Mobile */}
      <MobileMenu 
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <main className="flex-1 flex">
        {/* Área principal - Mesa de votação */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full h-full flex flex-col items-center justify-between">
            <div />

            <Table
              participants={sessionData.participants.map(p => ({
                userId: p.id,
                userName: p.name,
                isCurrentUser: p.isCurrentUser,
                selectedCard: p.selectedCard
              }))}
              isRevealed={sessionData.isRevealed}
              countdown={countdown}
              canFlip={!!selectedCard}
              onFlipCards={handleFlipCards}
              onNewVoting={handleNewVoting}
              onFinishVoting={canManageTickets && currentTicket ? () => finishVoting() : undefined}
              canFinishVoting={canManageTickets && !!currentTicket}
              hasSelectedTicket={!!currentTicket}
              isCreator={canManageTickets}
            />

            {/* Resumo de votos ou barra de votação */}
            {sessionData.isRevealed ? (
              <VoteSummary 
                votes={sessionData.participants.map(p => p.selectedCard).filter(card => card !== null && card !== undefined && card.trim() !== "") as string[]}
                average={averageVote || ""}
                totalParticipants={votingStats.totalParticipants}
                votedCount={votingStats.votedCount}
                votingMode={sessionData.votingMode}
              />
            ) : (
              <VoteBar
                votingMode={sessionData.votingMode || 'FIBONACCI'}
                onVote={handleSelectCard}
                selectedCard={selectedCard}
                isVotingInProgress={canVote}
              />
            )}
          </div>
        </div>

        {/* Sidebar direita - Gerenciador de tickets */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          {sessionData.sessionId && connectionStatus === 'connected' && socketRef.current && (
            <OpenModeTicketManager
              sessionId={sessionData.sessionId}
              isCreator={canManageTickets}
              currentTicketId={sessionData.currentTicketId}
              votingMode={sessionData.votingMode}
              onTicketSelect={handleTicketSelect}
              onOpenFinalEstimateModal={() => setShowFinalEstimateModal(true)}
              emitTicketSelected={(ticketId) => handleTicketSelect(ticketId || '')}
              socket={socketRef.current}
            />
          )}
        </div>
      </main>

      {/* Modal de convite */}
      {inviteOpen && (
        <InviteModal 
          inviteLink={inviteLink} 
          onClose={() => setInviteOpen(false)}
          sessionId={sessionId}
        />
      )}

      {/* Modal de estimativa final */}
      {showFinalEstimateModal && currentTicket && (
        <OpenModeFinalEstimateModal
          ticket={currentTicket}
          isOpen={showFinalEstimateModal}
          onClose={() => setShowFinalEstimateModal(false)}
          onConfirm={setFinalEstimate}
          averageVote={averageVote || ""}
        />
      )}
    </div>
  );
}
