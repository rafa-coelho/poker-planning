"use client";

import React from "react";
import { useTranslation } from "react-i18next";

interface VoteSummaryProps {
    votes: string[];
    average?: number | string;
    totalParticipants?: number;
    votedCount?: number;
    votingMode?: string;
}

export default function VoteSummary ({ votes, average: propAverage, totalParticipants, votedCount, votingMode }: VoteSummaryProps) {
    const { t } = useTranslation("common");

    // Debug temporário
    console.log('🔍 VoteSummary - propAverage:', propAverage, 'votingMode:', votingMode, 'votes:', votes);
    console.log('🔍 VoteSummary - propAverage type:', typeof propAverage);
    console.log('🔍 VoteSummary - propAverage === null:', propAverage === null);
    console.log('🔍 VoteSummary - propAverage === undefined:', propAverage === undefined);

    // Filtrar votos válidos baseado no modo de votação
    const isTshirtMode = votingMode === "TSHIRT" || votingMode === "T-SHIRT";
    
    const validTshirtVotes = isTshirtMode 
        ? votes.filter(v => v && v !== "?" && v !== "☕") // Para TSHIRT, aceitar qualquer string válida
        : [];
    
    const validNumericVotes = !isTshirtMode
        ? votes.filter(v => !isNaN(Number(v)) && Number(v) > 0).map(v => Number(v)) // Para numéricos
        : [];

    // Calcular média baseada no modo de votação
    let average: string | number;
    
    if (propAverage !== undefined && propAverage !== null && propAverage !== "") {
        // Usar a média calculada pelo hook quando disponível
        average = typeof propAverage === 'number' ? propAverage.toFixed(1) : propAverage;
    } else if (isTshirtMode && validTshirtVotes.length > 0) {
        // Calcular média TSHIRT localmente
        const tshirtSizes = ["XS", "S", "M", "L", "XL", "XXL"];
        const validSizeVotes = validTshirtVotes
            .map(vote => {
                const index = tshirtSizes.indexOf(vote);
                return index >= 0 ? index : null;
            })
            .filter(vote => vote !== null) as number[];
        
        if (validSizeVotes.length > 0) {
            const averagePosition = validSizeVotes.reduce((acc, position) => acc + position, 0) / validSizeVotes.length;
            const roundedPosition = Math.round(averagePosition);
            const sizeIndex = Math.max(0, Math.min(roundedPosition, tshirtSizes.length - 1));
            average = tshirtSizes[sizeIndex];
        } else {
            average = "N/A";
        }
    } else if (validNumericVotes.length > 0) {
        // Calcular média numérica
        average = (validNumericVotes.reduce((sum, val) => sum + val, 0) / validNumericVotes.length).toFixed(1);
    } else {
        average = "N/A";
    }

    return (
        <div className="flex w-full border-t border-gray-300 pt-4 bg-gray-50 rounded-lg shadow-lg pb-4" style={{ height: "12em" }}>

            <VoteSummary.VoteCount validVotes={isTshirtMode ? validTshirtVotes : validNumericVotes} />

            <div className="w-1/2 flex items-center justify-start gap-6 pl-6">

                <div className="flex flex-col items-center">
                    <div className="text-gray-600 text-sm">{t("average")}:</div>
                    <div className="text-4xl font-bold text-gray-800">
                        {
                            typeof average === 'number' || !isNaN(Number(average))
                                ? new Intl.NumberFormat().format(Number(average))
                                : average
                        }
                    </div>
                </div>

                {/* <VoteSummary.AgreementComponent validVotes={validVotes} /> */}
            </div>

        </div>
    );
}

VoteSummary.VoteCount = function VoteCount ({ validVotes }: { validVotes: (string | number)[] }) {
    const voteCounts: { [key: string]: number } = {};
    validVotes.forEach(vote => {
        const key = String(vote);
        voteCounts[key] = (voteCounts[key] || 0) + 1;
    });
    const maxVotes = Math.max(...Object.values(voteCounts));

    return (
        <div className="w-1/2 flex flex-wrap items-end justify-end pr-4">
            {
                Object.entries(voteCounts).map(([value, count]) => (
                    <VoteSummary.VoteCountCard key={value} value={value} count={count} maxVotes={maxVotes} />
                ))
            }
        </div>
    );
};

VoteSummary.VoteCountCard = function VoteCountCard ({ value, count, maxVotes }: { value: string, count: number, maxVotes: number }) {
    const { t } = useTranslation("common");
    return (
        <div key={value} className="flex flex-col items-center mx-2">

            <div className="flex flex-col-reverse items-center">

                <div className="border border-gray-800 bg-white shadow-lg text-gray-800 font-bold w-12 h-12 flex items-center justify-center rounded-lg">
                    {value}
                </div>

                <div
                    className="w-6 bg-gradient-to-b from-gray-700 to-gray-500 rounded-t-lg"
                    style={{
                        height: `${(count / maxVotes) * 100}px`,
                        minHeight: "10px",
                    }}
                />
            </div>
            <span className="text-xs text-gray-600 mt-1">{count} {t("votes")}</span>
        </div>
    )
};


VoteSummary.AgreementComponent = function AgreementComponent ({ validVotes }: { validVotes: number[] }) {
    const { t } = useTranslation("common");

    const agreement = validVotes.length > 1
        ? 1 - (Math.max(...validVotes) - Math.min(...validVotes)) / Math.max(...validVotes)
        : 1;

    let agreementColor = "bg-green-500";
    let agreementEmoji = "🎯";

    if (agreement > 0.8) {
        agreementColor = "bg-green-500";
        agreementEmoji = "😁";
    } else if (agreement > 0.5) {
        agreementColor = "bg-yellow-500";
        agreementEmoji = "😐";
    } else {
        agreementColor = "bg-red-500";
        agreementEmoji = "😡";
    }

    return (
        <div className="flex flex-col items-center">
            <div className="text-gray-600 text-sm">{t("agreement")}:</div>
            <div
                className={`w-12 h-12 flex items-center justify-center rounded-full shadow-md text-white text-2xl ${agreementColor}`}
            >
                {agreementEmoji}
            </div>
        </div>
    );
};
