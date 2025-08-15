"use client";

import React, { useState } from "react";
import "../../i18n/index";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation";

import HeaderBar from "../../components/HeaderBar";
import VoteBar from "../../components/VoteBar";
import InviteModal from "../../components/InviteModal";
import TicketManager from "../../components/TicketManager";
import FinalEstimateModal from "../../components/FinalEstimateModal";
import ParticipantNotification from "../../components/ParticipantNotification";
import MobileMenu from "../../components/MobileMenu";
import PendingRequestsModal from "../../components/PendingRequestsModal";
import { useSession } from "@/components/useSession";
import Table from "@/components/Table";
import { ensureLocalUser } from "@/components/utils";
import VoteSummary from "@/components/VoteSummary";


export default function SessionPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { t } = useTranslation();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const {
    sessionData,
    user,
    selectedCard,
    countdown,
    inviteLink,
    currentTicket,
    averageVote,
    showFinalEstimateModal,
    setShowFinalEstimateModal,
    votingCards,
    canVote,
    canManageTickets,
    participantNotification,
    setParticipantNotification,
    pendingRequests,
    showPendingRequestsModal,
    setShowPendingRequestsModal,
    connectionStatus,
    handleSelectCard,
    handleFlipCards,
    handleNewVoting,
    handleTicketSelect,
    finishVoting,
    setFinalEstimate,
    handleOpenFinalEstimateModal,
    handleEndSession,
    registerTicketUpdateCallback,
    emitTicketSelected,
    emitTicketCreated,
    emitTicketUpdated,
    emitTicketDeleted,
    reloadCurrentTicket,
    getVotingStats,
    selectTicketDirectly,
    generateInviteLink,
    handleRequestAction,
  } = useSession();

  const finalParticipants = ensureLocalUser(sessionData.participants, user.userId, user.userName);
  const votingStats = getVotingStats();



  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      <HeaderBar 
        sessionData={sessionData} 
        userName={user.userName} 
        isCreator={canManageTickets}
        onInviteOpen={() => {
          generateInviteLink();
          setInviteOpen(true);
        }}
        onToggleSidebar={() => setMobileMenuOpen(true)}
        onEndSession={handleEndSession}
        pendingRequestsCount={pendingRequests.length}
        onShowPendingRequests={() => setShowPendingRequestsModal(true)}
        connectionStatus={connectionStatus}
      />

      {/* Notificação de participante */}
      <ParticipantNotification 
        notification={participantNotification}
        onClose={() => setParticipantNotification(null)}
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
              participants={finalParticipants}
              isRevealed={sessionData.isRevealed}
              countdown={countdown}
              canFlip={!!selectedCard}
              onFlipCards={handleFlipCards}
              onNewVoting={handleNewVoting}
              onFinishVoting={canManageTickets && currentTicket ? finishVoting : undefined}
              canFinishVoting={canManageTickets && !!currentTicket}
              hasSelectedTicket={!!currentTicket}
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
                cards={votingCards}
                selectedCard={selectedCard}
                onSelectCard={handleSelectCard}
                disabled={!canVote}
              />
            )}
          </div>
        </div>

        {/* Sidebar direita - Gerenciador de tickets */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          {sessionData.sessionId && (
            <TicketManager
              sessionId={sessionData.sessionId}
              isCreator={canManageTickets}
              currentTicketId={currentTicket?.id || null}
              votingMode={sessionData.votingMode}
              onTicketSelect={handleTicketSelect}
              onOpenFinalEstimateModal={handleOpenFinalEstimateModal}
              registerTicketUpdateCallback={registerTicketUpdateCallback}
              emitTicketSelected={emitTicketSelected}
              emitTicketCreated={emitTicketCreated}
              emitTicketUpdated={emitTicketUpdated}
              emitTicketDeleted={emitTicketDeleted}
              reloadCurrentTicket={reloadCurrentTicket}
              selectTicketDirectly={selectTicketDirectly}
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
        <FinalEstimateModal
          ticket={currentTicket}
          isOpen={showFinalEstimateModal}
          onClose={() => setShowFinalEstimateModal(false)}
          onConfirm={setFinalEstimate}
          averageVote={averageVote || ""}
        />
      )}

      {/* Modal de solicitações pendentes */}
      <PendingRequestsModal
        isOpen={showPendingRequestsModal}
        onClose={() => setShowPendingRequestsModal(false)}
        requests={pendingRequests}
        onApprove={(participantId) => handleRequestAction(participantId, 'APPROVE')}
        onReject={(participantId) => handleRequestAction(participantId, 'REJECT')}
      />

    </div>
  );
}

