"use client";

import React from "react";
import { Participant } from "./useSession";

interface ParticipantCardProps {
  participant: Participant;
  isRevealed: boolean;
}

export default function ParticipantCard({
  participant,
  isRevealed,
}: ParticipantCardProps) {
  const content = getCardContent();
  const style = getParticipantCardStyle();

  function getParticipantCardStyle() {
    // Usuário logado - sempre destacado
    if (participant.isCurrentUser) {
      if (participant.selectedCard) {
        return isRevealed
          ? "border-4 border-blue-400 bg-blue-500 text-white"
          : "border-4 border-blue-400 bg-blue-600 text-white";
      }
      return "border-4 border-blue-400 bg-white text-blue-600";
    }

    // Outros usuários - estilos normais
    if (participant.selectedCard) {
      return isRevealed
        ? "bg-blue-400 text-white border border-blue-400"
        : "bg-blue-500 text-white border border-blue-500";
    }

    return "border border-blue-400 bg-white text-blue-600";
  }

  function getCardContent() {
    if (!participant.selectedCard || (!isRevealed && !participant.isCurrentUser)) {
      return "";
    }
    return participant.selectedCard;
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-12 h-16 rounded flex items-center justify-center text-xl font-bold ${style}`}
      >
        {content}
      </div>
      <span
        className={`mt-1 font-medium ${
          participant.isCurrentUser
            ? "text-blue-600 font-bold text-md"
            : "text-gray-800 text-sm"
        }`}
      >
        {participant.userName}
      </span>
    </div>
  );
}

