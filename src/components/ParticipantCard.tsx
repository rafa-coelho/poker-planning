"use client";

import React from "react";
import { Participant, Team } from "./useSession";

const TEAM_COLORS: Record<Team, { border: string; bg: string; bgRevealed: string; text: string; ring: string; nameText: string }> = {
  organizer: {
    border: "border-purple-400",
    bg: "bg-purple-500",
    bgRevealed: "bg-purple-400",
    text: "text-purple-600",
    ring: "ring-purple-300",
    nameText: "text-purple-600",
  },
  dev: {
    border: "border-blue-400",
    bg: "bg-blue-500",
    bgRevealed: "bg-blue-400",
    text: "text-blue-600",
    ring: "ring-blue-300",
    nameText: "text-blue-600",
  },
  qa: {
    border: "border-green-400",
    bg: "bg-green-500",
    bgRevealed: "bg-green-400",
    text: "text-green-600",
    ring: "ring-green-300",
    nameText: "text-green-600",
  },
  ux: {
    border: "border-pink-400",
    bg: "bg-pink-500",
    bgRevealed: "bg-pink-400",
    text: "text-pink-600",
    ring: "ring-pink-300",
    nameText: "text-pink-600",
  },
};

const DEFAULT_COLORS = {
  border: "border-gray-400",
  bg: "bg-gray-500",
  bgRevealed: "bg-gray-400",
  text: "text-gray-600",
  ring: "ring-gray-300",
  nameText: "text-gray-600",
};

interface ParticipantCardProps {
  participant: Participant;
  isRevealed: boolean;
}

export default function ParticipantCard ({
  participant,
  isRevealed,
}: ParticipantCardProps) {

  const colors = participant.team ? TEAM_COLORS[participant.team] : DEFAULT_COLORS;
  const content = getCardContent();
  const style = getParticipantCardStyle();

  function getParticipantCardStyle () {
    let style = `border ${colors.border} bg-white ${colors.text}`;

    if (participant.selectedCard) {
      style = isRevealed
        ? `${colors.bgRevealed} text-white border ${colors.border}`
        : `${colors.bg} text-white border ${colors.bg}`
    }

    if (participant.isCurrentUser) {
      style += ` ring-4 ${colors.ring}`;
    }

    return style;
  }

  function getCardContent () {
    if (!participant.selectedCard || (!isRevealed && !participant.isCurrentUser)) {
      return "";
    }

    return participant.selectedCard;
  }

  return (
    <div
      className="flex flex-col items-center"
    >
      <div
        className={`w-12 h-16 rounded flex items-center justify-center text-xl font-bold ${style}`}
      >
        {content}
      </div>
      <span className={`mt-1 font-medium ${participant.isCurrentUser ? `${colors.nameText} font-bold text-md` : "text-gray-800 text-sm"}`}>
        {participant.userName}
      </span>
    </div>
  );
}

