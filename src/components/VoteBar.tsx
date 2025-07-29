"use client";

import React from "react";
import { useTranslation } from "react-i18next";

interface VoteBarProps {
  cards: string[];
  selectedCard: string | null;
  onSelectCard: (cardValue: string) => void;
  disabled?: boolean;
}

export default function VoteBar({ cards, selectedCard, onSelectCard, disabled }: VoteBarProps) {
  const { t } = useTranslation("common");
  return (
    <div className="w-full bg-white border-t py-2 flex flex-col items-center z-50">
      <p className="text-gray-600 text-sm mb-1">{t("session.voteBar.chooseYourCard")}</p>
      <div className="flex space-x-2">
        {cards.map((card) => (
          <button
            key={card}
            disabled={disabled}
            onClick={() => onSelectCard(card)}
            className={`w-8 h-12 border-2 rounded flex items-center justify-center text-sm font-bold
              ${
                selectedCard === card
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-gray-300 text-gray-600 hover:bg-blue-50"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {card}
          </button>
        ))}
      </div>
    </div>
  );
}
