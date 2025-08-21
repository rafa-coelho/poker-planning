"use client";

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaRegUser } from 'react-icons/fa';

interface Participant {
  userId: string;
  userName: string;
  selectedCard: string | null;
  isCurrentUser: boolean;
  isCreator?: boolean;
  isPublicParticipant?: boolean;
}

interface ParticipantCardProps {
  participant: Participant;
  isRevealed: boolean;
}

const ParticipantCard = React.memo<ParticipantCardProps>(({ participant, isRevealed }) => {
  const { t } = useTranslation("common");

  // Memoizar o card selecionado para evitar recálculos
  const selectedCardDisplay = useMemo(() => {
    if (!participant.selectedCard) {
      return isRevealed ? t("cards.notVoted") : t("cards.waiting");
    }
    
    if (participant.selectedCard === "?") {
      return t("cards.uncertain");
    }
    
    if (participant.selectedCard === "☕") {
      return t("cards.break");
    }
    
    return participant.selectedCard;
  }, [participant.selectedCard, isRevealed, t]);

  // Memoizar as classes CSS para evitar recálculos
  const cardClasses = useMemo(() => {
    const baseClasses = "participant-card bg-white rounded-lg shadow-md p-4 text-center transition-all duration-200";
    const sizeClasses = "min-w-[120px] max-w-[150px]";
    
    if (participant.isCurrentUser) {
      return `${baseClasses} ${sizeClasses} border-2 border-blue-500 bg-blue-50`;
    }
    
    if (participant.isCreator) {
      return `${baseClasses} ${sizeClasses} border-2 border-green-500 bg-green-50`;
    }
    
    if (participant.isPublicParticipant) {
      return `${baseClasses} ${sizeClasses} border-2 border-orange-500 bg-orange-50`;
    }
    
    return `${baseClasses} ${sizeClasses} border border-gray-200`;
  }, [participant.isCurrentUser, participant.isCreator, participant.isPublicParticipant]);

  const cardContentClasses = useMemo(() => {
    const baseClasses = "text-sm font-medium";
    
    if (participant.selectedCard && isRevealed) {
      return `${baseClasses} text-green-600`;
    }
    
    if (participant.selectedCard && !isRevealed) {
      return `${baseClasses} text-blue-600`;
    }
    
    return `${baseClasses} text-gray-500`;
  }, [participant.selectedCard, isRevealed]);

  return (
    <div className={cardClasses}>
      <div className="flex items-center justify-center mb-2">
        <FaRegUser className="text-gray-400 mr-2" size={16} />
        <span className="text-xs font-medium text-gray-700 truncate">
          {participant.userName}
        </span>
      </div>
      
      <div className={cardContentClasses}>
        {selectedCardDisplay}
      </div>
      
      {participant.isCreator && (
        <div className="mt-1">
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            {t("participant.creator")}
          </span>
        </div>
      )}
      
      {participant.isPublicParticipant && (
        <div className="mt-1">
          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
            {t("participant.external")}
          </span>
        </div>
      )}
    </div>
  );
});

ParticipantCard.displayName = 'ParticipantCard';

export default ParticipantCard;

