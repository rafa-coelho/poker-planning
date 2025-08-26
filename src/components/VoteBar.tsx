"use client";

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface VoteBarProps {
  votingMode: string;
  onVote: (vote: string) => void;
  selectedCard: string | null;
  isVotingInProgress: boolean;
}

const VoteBar = React.memo<VoteBarProps>(({ votingMode, onVote, selectedCard, isVotingInProgress }) => {
  const { t } = useTranslation("common");

  // Memoizar os cards de votação baseados no modo
  const votingCards = useMemo(() => {
    switch (votingMode) {
      case 'FIBONACCI':
        return ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];
      case 'TSHIRT':
      case 'T-SHIRT':
        return ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'];
      case 'LINEAR':
        return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?', '☕'];
      default:
        return ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];
    }
  }, [votingMode]);

  // Memoizar se o componente está desabilitado
  const isDisabled = useMemo(() => {
    return !isVotingInProgress;
  }, [isVotingInProgress]);

  // Memoizar o handler de clique para evitar recriações
  const handleVoteClick = useMemo(() => {
    return (vote: string) => {
      if (!isDisabled) {
        onVote(vote);
      }
    };
  }, [onVote, isDisabled]);

  // Memoizar as classes base do card
  const getCardClasses = useMemo(() => {
    return (vote: string) => {
      const baseClasses = "vote-card w-16 h-20 rounded-lg flex items-center justify-center text-lg font-bold cursor-pointer transition-all duration-200 border-2";
      
      if (isDisabled) {
        return `${baseClasses} bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed`;
      }
      
      if (selectedCard === vote) {
        return `${baseClasses} bg-blue-500 text-white border-blue-600 shadow-lg transform scale-105`;
      }
      
      return `${baseClasses} bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md`;
    };
  }, [selectedCard, isDisabled]);

  return (
    <div className="w-full justify-center flex flex-col items-center vote-bar bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
        {t("session.voting.selectCard")}
      </h3>
      
      <div className="flex space-x-2">
        {votingCards.map((vote) => (
          <button
            key={vote}
            onClick={() => handleVoteClick(vote)}
            disabled={isDisabled}
            className={getCardClasses(vote)}
            title={vote === '?' ? t("session.cards.uncertain") : vote === '☕' ? t("session.cards.break") : vote}
          >
            {vote}
          </button>
        ))}
      </div>
      
      {isDisabled && (
        <p className="text-sm text-gray-500 text-center mt-4">
          {t("session.voting.waitingForTicket")}
        </p>
      )}
    </div>
  );
});

VoteBar.displayName = 'VoteBar';

export default VoteBar;
