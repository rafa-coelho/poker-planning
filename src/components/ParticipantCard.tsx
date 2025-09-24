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
    // Usuário logado - destaque mais forte
    if (participant.isCurrentUser) {
      if (participant.selectedCard) {
        return isRevealed
          ? "border-4 border-blue-500 bg-blue-600 text-white shadow-lg"
          : "border-4 border-blue-500 bg-blue-700 text-white shadow-lg";
      }
      return "border-4 border-blue-500 bg-blue-50 text-blue-700 shadow-lg";
    }

    // Outros usuários - cores mais suaves e agradáveis
    if (participant.selectedCard) {
      return isRevealed
        ? "bg-emerald-100 text-emerald-800 border-2 border-emerald-300 shadow-md"
        : "bg-indigo-100 text-indigo-700 border-2 border-indigo-300 shadow-md";
    }

    return "border-2 border-gray-200 bg-gray-50 text-gray-400";
  }

  function getCardContent() {
    // Só mostra conteúdo se for o usuário atual e tiver carta selecionada
    if (participant.isCurrentUser && participant.selectedCard) {
      return participant.selectedCard;
    }
    
    // Se está revelado e tem carta, mostra para todos
    if (isRevealed && participant.selectedCard) {
      return participant.selectedCard;
    }
    
    return "";
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-12 h-16 rounded flex items-center justify-center text-lg font-bold ${style}`}
      >
        {content}
      </div>
      <span
        className={`mt-1 font-medium ${
          participant.isCurrentUser
            ? "text-blue-700 font-bold text-base"
            : "text-gray-700 text-sm"
        }`}
      >
        {participant.userName}
      </span>
    </div>
  );
}

