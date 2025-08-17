"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n/index";
import { Ticket } from "@prisma/client";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface FinalEstimateModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (finalEstimate: string) => void;
  averageVote: number | string;
}

export default function FinalEstimateModal({
  ticket,
  isOpen,
  onClose,
  onConfirm,
  averageVote,
}: FinalEstimateModalProps) {
  const { t } = useTranslation("tickets");
  const { t: tCommon } = useTranslation("common");
  const [finalEstimate, setFinalEstimate] = useState<string>("");

  React.useEffect(() => {
    if (ticket && isOpen) {
      // Usar a média como valor padrão, ou o valor atual se existir
      const defaultValue = ticket.finalEstimate || (averageVote ? averageVote.toString() : "");
      setFinalEstimate(defaultValue);
    }
  }, [ticket, isOpen, averageVote]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (finalEstimate.trim()) {
      onConfirm(finalEstimate.trim());
      onClose();
    }
  };

  if (!isOpen || !ticket) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {t("tickets.finalEstimate.title")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">
              {ticket.title}
            </h4>
            {ticket.description && (
              <p className="text-sm text-gray-600 mb-4">
                {ticket.description}
              </p>
            )}
          </div>

          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-900">
                  {t("tickets.finalEstimate.averageVote")}:
                </span>
                <span className="text-lg font-bold text-blue-900">
                  {averageVote ? (typeof averageVote === 'number' ? averageVote.toFixed(1) : averageVote) : "N/A"}
                </span>
              </div>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("tickets.finalEstimate.finalValue")}
            </label>
            <input
              type="text"
              value={finalEstimate}
              onChange={(e) => setFinalEstimate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t("tickets.finalEstimate.placeholder")}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("tickets.finalEstimate.help")}
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {t("tickets.finalEstimate.confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 