import React from "react";
import ParticipantCard from "./ParticipantCard";
import { distributeParticipants } from "./utils";
import { Participant, useSession } from "./useSession";
import { useTranslation } from "react-i18next";

interface TableProps {
    participants: Participant[];
    isRevealed: boolean;
    countdown: number | null;
    canFlip: boolean;
    onFlipCards: () => void;
    onNewVoting: () => void;
    onFinishVoting?: () => void;
    canFinishVoting?: boolean;
    hasSelectedTicket?: boolean; // Nova prop para verificar se há ticket selecionado
}

export default function Table({
    participants,
    isRevealed,
    countdown,
    canFlip,
    onFlipCards,
    onNewVoting,
    onFinishVoting,
    canFinishVoting,
    hasSelectedTicket = false
}: TableProps) {
    const { t } = useTranslation("common");
    const { topParticipants, leftParticipants, rightParticipants, bottomParticipants } = distributeParticipants(participants);
    const { isCreator } = useSession();

    // Desabilitar mesa quando não há ticket selecionado
    const isTableDisabled = !hasSelectedTicket;

    return (
        <div
            className={`table-container ${isTableDisabled ? 'opacity-50 pointer-events-none' : ''}`}
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
                {topParticipants.map((p) => <ParticipantCard key={p.userId} participant={p} isRevealed={isRevealed} />)}
            </div>
            <div className="flex flex-col justify-evenly" style={{ gridArea: "left" }}>
                {leftParticipants.map((p) => <ParticipantCard key={p.userId} participant={p} isRevealed={isRevealed} />)}
            </div>
            <div className="flex items-center justify-center bg-blue-50 rounded-lg">
                {isTableDisabled ? (
                    <div className="text-center text-gray-500">
                        <div className="text-lg font-medium mb-2">
                            {isCreator
                                ? t("session.table.noTicketSelectedCreator")
                                : t("session.table.noTicketSelectedParticipant")
                            }
                        </div>
                        <div className="text-sm">
                            {isCreator
                                ? t("session.table.selectTicketHintCreator")
                                : t("session.table.selectTicketHintParticipant")
                            }
                        </div>
                    </div>
                ) : (
                    <>
                                                {isCreator && countdown == null && (
                            isRevealed 
                                ? (
                                    <div className="flex gap-2 items-center">
                                        <button
                                            onClick={onNewVoting}
                                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                        >
                                            {t("startNewVoting")}
                                        </button>
                                        {onFinishVoting && (
                                            <button
                                                onClick={() => {
                                                    console.log('🔍 Botão Finalizar Votação clicado!');
                                                    onFinishVoting();
                                                }}
                                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                            >
                                                Finalizar Votação
                                            </button>
                                        )}
                                    </div>
                                )
                                : (
                                    <button
                                        onClick={() => canFlip && onFlipCards()}
                                        className={`px-4 py-2 text-white rounded ${canFlip ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`}
                                    >
                                        {t("flipCards")}
                                    </button>
                                )
                        )}
                        {countdown !== null && <div className="text-4xl font-bold">{countdown}</div>}
                    </>
                )}
            </div>
            <div className="flex flex-col justify-evenly" style={{ gridArea: "right" }}>
                {rightParticipants.map((p) => <ParticipantCard key={p.userId} participant={p} isRevealed={isRevealed} />)}
            </div>
            <div className="flex justify-evenly" style={{ gridArea: "bottom" }}>
                {bottomParticipants.map((p) => <ParticipantCard key={p.userId} participant={p} isRevealed={isRevealed} />)}
            </div>
        </div>
    );
}
