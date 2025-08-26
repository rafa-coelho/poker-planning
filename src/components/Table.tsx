import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ParticipantCard from './ParticipantCard';
import { useSession } from './useSession';

interface Participant {
  userId: string;
  userName: string;
  selectedCard: string | null;
  isCurrentUser: boolean;
  isCreator?: boolean;
  isPublicParticipant?: boolean;
}

interface TableProps {
  participants: Participant[];
  isRevealed: boolean;
  countdown: number | null;
  canFlip: boolean;
  onFlipCards: () => void;
  onNewVoting: () => void;
  onFinishVoting?: () => void;
  canFinishVoting: boolean;
  hasSelectedTicket?: boolean;
}

// Função para distribuir participantes em posições da mesa
const distributeParticipants = (participants: Participant[]) => {
  const total = participants.length;
  
  if (total === 0) {
    return { topParticipants: [], leftParticipants: [], rightParticipants: [], bottomParticipants: [] };
  }
  
  if (total === 1) {
    return { topParticipants: participants, leftParticipants: [], rightParticipants: [], bottomParticipants: [] };
  }
  
  if (total === 2) {
    return { topParticipants: [participants[0]], leftParticipants: [], rightParticipants: [], bottomParticipants: [participants[1]] };
  }
  
  if (total === 3) {
    return { topParticipants: [participants[0]], leftParticipants: [participants[1]], rightParticipants: [], bottomParticipants: [participants[2]] };
  }
  
  if (total === 4) {
    return { topParticipants: [participants[0]], leftParticipants: [participants[1]], rightParticipants: [participants[2]], bottomParticipants: [participants[3]] };
  }
  
  // Para 5 ou mais participantes, distribuir proporcionalmente
  const topCount = Math.ceil(total * 0.3);
  const leftCount = Math.ceil(total * 0.2);
  const rightCount = Math.ceil(total * 0.2);
  const bottomCount = total - topCount - leftCount - rightCount;
  
  return {
    topParticipants: participants.slice(0, topCount),
    leftParticipants: participants.slice(topCount, topCount + leftCount),
    rightParticipants: participants.slice(topCount + leftCount, topCount + leftCount + rightCount),
    bottomParticipants: participants.slice(topCount + leftCount + rightCount)
  };
};

const Table = React.memo<TableProps>(({
  participants,
  isRevealed,
  countdown,
  canFlip,
  onFlipCards,
  onNewVoting,
  onFinishVoting,
  canFinishVoting,
  hasSelectedTicket = false
}) => {
  const { t } = useTranslation("common");
  const { isCreator } = useSession();

  // Memoizar a distribuição de participantes
  const { topParticipants, leftParticipants, rightParticipants, bottomParticipants } = useMemo(() => {
    return distributeParticipants(participants);
  }, [participants]);

  // Memoizar se a mesa está desabilitada
  const isTableDisabled = useMemo(() => {
    return !hasSelectedTicket;
  }, [hasSelectedTicket]);

  // Memoizar as classes do container da mesa
  const tableContainerClasses = useMemo(() => {
    const baseClasses = "table-container";
    return isTableDisabled ? `${baseClasses} opacity-50 pointer-events-none` : baseClasses;
  }, [isTableDisabled]);

  // Memoizar o conteúdo do centro da mesa
  const centerContent = useMemo(() => {
    if (isTableDisabled) {
      return (
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🎯</div>
          <p className="text-lg font-medium">{t("table.selectTicket")}</p>
          <p className="text-sm">{t("table.selectTicketDescription")}</p>
        </div>
      );
    }

    if (countdown !== null) {
      return (
        <div className="text-center">
          <div className="text-6xl font-bold text-blue-600 mb-4">{countdown}</div>
          <p className="text-lg text-gray-600">{t("table.countdown")}</p>
        </div>
      );
    }

    if (isRevealed) {
      return (
        <div className="text-center">
          <div className="text-4xl mb-4">🎉</div>
          <p className="text-lg font-medium text-green-600 mb-4">{t("table.votesRevealed")}</p>
          <div className="space-y-2">
            {isCreator && (
              <>
                <button
                  onClick={onFinishVoting}
                  disabled={!canFinishVoting}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {t("table.finishVoting")}
                </button>
                <button
                  onClick={onNewVoting}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  {t("table.newVoting")}
                </button>
              </>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="text-4xl mb-4">🤔</div>
        <p className="text-lg font-medium text-gray-600 mb-4">{t("table.votingInProgress")}</p>
        {isCreator && (
          <button
            onClick={onFlipCards}
            disabled={!canFlip}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {t("table.revealVotes")}
          </button>
        )}
      </div>
    );
  }, [isTableDisabled, countdown, isRevealed, isCreator, onFinishVoting, canFinishVoting, onNewVoting, onFlipCards, canFlip, t]);

  return (
    <div
      className={tableContainerClasses}
      style={{
        display: "grid",
        gridTemplateAreas: `
          "left   top    right"
          "left  center right"
          "left bottom right"
        `,
        gridTemplateRows: "auto 1fr auto",
        gridTemplateColumns: "0.8fr 5fr 0.8fr",
        gap: "0.5rem",
        width: "100%",
        minHeight: "50vh",
      }}
    >
      <div className="flex justify-evenly" style={{ gridArea: "top" }}>
        {topParticipants.map((p) => (
          <ParticipantCard key={p.userId} participant={p} isRevealed={isRevealed} />
        ))}
      </div>
      
      <div className="flex flex-col justify-evenly" style={{ gridArea: "left" }}>
        {leftParticipants.map((p) => (
          <ParticipantCard key={p.userId} participant={p} isRevealed={isRevealed} />
        ))}
      </div>
      
      <div className="flex items-center justify-center bg-blue-50 rounded-lg p-8" style={{ gridArea: "center" }}>
        {centerContent}
      </div>
      
      <div className="flex justify-evenly" style={{ gridArea: "right" }}>
        {rightParticipants.map((p) => (
          <ParticipantCard key={p.userId} participant={p} isRevealed={isRevealed} />
        ))}
      </div>
      
      <div className="flex justify-evenly" style={{ gridArea: "bottom" }}>
        {bottomParticipants.map((p) => (
          <ParticipantCard key={p.userId} participant={p} isRevealed={isRevealed} />
        ))}
      </div>
    </div>
  );
});

Table.displayName = 'Table';

export default Table;
