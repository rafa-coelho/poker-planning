"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import "@/i18n/index";
import { Ticket, Priority, TicketStatus } from "@prisma/client";

interface CurrentTicketDisplayProps {
  ticket: Ticket | null;
  isCreator: boolean;
  votingMode?: string;
  onStartVoting?: () => void;
  onFinishVoting?: () => void;
}

export default function CurrentTicketDisplay({
  ticket,
  isCreator,
  votingMode = "FIBONACCI",
  onStartVoting,
  onFinishVoting,
}: CurrentTicketDisplayProps) {
  const { t } = useTranslation("tickets");

  // Função para determinar o texto apropriado baseado no modo de votação
  const getEstimateText = (value: string) => {
    const isTshirtMode = votingMode === "TSHIRT" || votingMode === "T-SHIRT";
    return isTshirtMode ? value : `${value} pts`;
  };

  if (!ticket) {
    return (
      <div className="bg-white rounded-lg shadow p-4 text-center">
        <div className="text-gray-500">
          <p className="text-sm font-medium mb-1">
            {t("current.noTicket")}
          </p>
          <p className="text-xs">
            {t("current.selectTicket")}
          </p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.LOW:
        return "bg-green-100 text-green-800";
      case Priority.MEDIUM:
        return "bg-yellow-100 text-yellow-800";
      case Priority.HIGH:
        return "bg-orange-100 text-orange-800";
      case Priority.URGENT:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.PENDING:
        return "bg-gray-100 text-gray-800";
      case TicketStatus.VOTING:
        return "bg-blue-100 text-blue-800";
      case TicketStatus.ESTIMATED:
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case Priority.LOW:
        return t("priority.low");
      case Priority.MEDIUM:
        return t("priority.medium");
      case Priority.HIGH:
        return t("priority.high");
      case Priority.URGENT:
        return t("priority.urgent");
      default:
        return priority;
    }
  };

  const getStatusLabel = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.PENDING:
        return t("status.pending");
      case TicketStatus.VOTING:
        return t("status.voting");
      case TicketStatus.ESTIMATED:
        return t("status.estimated");
      default:
        return status;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {t("current.title")}
          </h3>
          <h4 className="text-lg font-bold text-gray-900 mb-2">
            {ticket.title}
          </h4>
          {ticket.description && (
            <p className="text-sm text-gray-600 mb-3">
              {ticket.description}
            </p>
          )}
          <div className="flex items-center space-x-2 mb-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
              {getPriorityLabel(ticket.priority)}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
              {getStatusLabel(ticket.status)}
            </span>
            {ticket.finalEstimate && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {getEstimateText(ticket.finalEstimate)}
              </span>
            )}
          </div>
        </div>
        
        {isCreator && (
          <div className="flex flex-col space-y-2">
            {ticket.status === TicketStatus.PENDING && onStartVoting && (
              <button
                onClick={onStartVoting}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t("current.startVoting")}
              </button>
            )}
            {ticket.status === TicketStatus.VOTING && onFinishVoting && (
              <button
                onClick={onFinishVoting}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {t("current.finishVoting")}
              </button>
            )}
          </div>
        )}
      </div>

      {ticket.status === TicketStatus.VOTING && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">
                {t("current.votingInProgress")}
              </p>
              <p className="text-xs text-blue-700">
                {t("current.waitingForVotes")}
              </p>
            </div>
          </div>
        </div>
      )}

      {ticket.status === TicketStatus.ESTIMATED && ticket.finalEstimate && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900">
                {t("current.estimationComplete")}
              </p>
              <p className="text-xs text-green-700">
                {t("current.finalEstimate")}: {ticket.finalEstimate}
              </p>
            </div>
            <div className="text-xl font-bold text-green-900">
              {ticket.finalEstimate}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 