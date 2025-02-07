import React from "react";
import ParticipantCard from "./ParticipantCard";
import { distributeParticipants } from "./utils";
import { Participant } from "./useSession";
import { useTranslation } from "react-i18next";

interface TableProps {
    participants: Participant[];
    isRevealed: boolean;
    countdown: number | null;
    canFlip: boolean;
    onFlipCards: () => void;
    onNewVoting: () => void;
}

export default function Table ({ participants, isRevealed, countdown, canFlip, onFlipCards, onNewVoting }: TableProps) {
    const { t } = useTranslation("common");
    const { topParticipants, leftParticipants, rightParticipants, bottomParticipants } = distributeParticipants(participants);

    return (
        <div
            className="table-container"
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
                width: "90vw",
                // maxWidth: "900px",
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
                {
                    countdown !== null
                        ? <div className="text-4xl font-bold">{countdown}</div>
                        : (
                            <button
                                onClick={isRevealed ? onNewVoting : () => canFlip && onFlipCards()}
                                className={
                                    isRevealed
                                        ? "bg-green-600 text-white px-4 py-2 rounded"
                                        : `px-4 py-2 text-white rounded ${canFlip ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`
                                }>
                                {isRevealed ? t("startNewVoting") : t("flipCards")}
                            </button>
                        )
                }
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
