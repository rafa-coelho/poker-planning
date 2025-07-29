"use client";

import React from "react";
import { useTranslation } from "react-i18next";

interface VoteSummaryProps {
  votes: string[];
  average?: number;
  totalParticipants?: number;
  votedCount?: number;
}

export default function VoteSummary({ 
  votes, 
  average, 
  totalParticipants, 
  votedCount 
}: VoteSummaryProps) {
  const { t } = useTranslation("common");

  // Calcular estatísticas
  const numericVotes = votes
    .map(vote => {
      const num = parseFloat(vote);
      return isNaN(num) ? null : num;
    })
    .filter(vote => vote !== null && vote > 0) as number[];

  const calculatedAverage = numericVotes.length > 0 
    ? numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length 
    : 0;

  const finalAverage = average || calculatedAverage;
  const totalVotes = votes.length;
  const numericVoteCount = numericVotes.length;
  const nonNumericVotes = totalVotes - numericVoteCount;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        {t("votes")} ({totalVotes})
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Média */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-900 mb-1">
            {t("average")}
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {finalAverage > 0 ? finalAverage.toFixed(1) : "N/A"}
          </div>
        </div>

        {/* Estatísticas de participação */}
        {totalParticipants !== undefined && votedCount !== undefined && (
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-sm font-medium text-green-900 mb-1">
              Participação
            </div>
            <div className="text-2xl font-bold text-green-900">
              {votedCount}/{totalParticipants}
            </div>
            <div className="text-xs text-green-700">
              {((votedCount / totalParticipants) * 100).toFixed(0)}%
            </div>
          </div>
        )}

        {/* Distribuição de votos */}
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="text-sm font-medium text-purple-900 mb-1">
            Distribuição
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {numericVoteCount}/{totalVotes}
          </div>
          <div className="text-xs text-purple-700">
            {nonNumericVotes > 0 && `${nonNumericVotes} não numéricos`}
          </div>
        </div>
      </div>

      {/* Lista de votos */}
      {votes.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Votos registrados:
          </div>
          <div className="flex flex-wrap gap-2">
            {votes.map((vote, index) => (
              <span
                key={index}
                className={`px-2 py-1 rounded text-sm font-medium ${
                  isNaN(parseFloat(vote)) || parseFloat(vote) <= 0
                    ? "bg-gray-100 text-gray-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {vote}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
