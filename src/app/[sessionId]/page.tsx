"use client";

import React, { useState } from "react";
import "../../i18n/index";

import HeaderBar from "../../components/HeaderBar";
import LonelyCard from "../../components/LonelyCard";
import VoteBar from "../../components/VoteBar";
import InviteModal from "../../components/InviteModal";
import { useSession } from "@/components/useSession";
import Table from "@/components/Table";
import { ensureLocalUser } from "@/components/utils";
import VoteSummary from "@/components/VoteSummary";

export default function SessionPage () {
  const [inviteOpen, setInviteOpen] = useState(false);

  const cards = ["1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"];

  const { sessionData, user, selectedCard, countdown, inviteLink, handleSelectCard, handleFlipCards, handleNewVoting } = useSession();
  const finalParticipants = ensureLocalUser(sessionData.participants, user.userId, user.userName);

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800">
      <HeaderBar sessionData={sessionData} userName={user.userName} onInviteOpen={() => setInviteOpen(true)} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4">

        <Table
          participants={finalParticipants}
          isRevealed={sessionData.isRevealed}
          countdown={countdown}
          canFlip={!!selectedCard}
          onFlipCards={handleFlipCards}
          onNewVoting={handleNewVoting}
        />
      </main>

      {
        sessionData.isRevealed
          ? <VoteSummary votes={sessionData.participants.map(p => p.selectedCard || "")} />
          : <VoteBar cards={cards} selectedCard={selectedCard} onSelectCard={handleSelectCard} disabled={sessionData.isRevealed} />
      }

      {
        inviteOpen
        && <InviteModal inviteLink={inviteLink} onClose={() => setInviteOpen(false)} />
      }
    </div>
  );
}

