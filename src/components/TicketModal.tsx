"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Ticket, Priority } from "@prisma/client";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTicketData) => Promise<void>;
  ticket?: Ticket | null;
  isEditing: boolean;
}

interface CreateTicketData {
  title: string;
  description?: string;
  priority: Priority;
  finalEstimate?: string;
}

export default function TicketModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  ticket, 
  isEditing 
}: TicketModalProps) {
  const { t } = useTranslation("common");
  const [formData, setFormData] = useState<CreateTicketData>({
    title: "",
    description: "",
    priority: Priority.MEDIUM,
    finalEstimate: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && ticket) {
      setFormData({
        title: ticket.title,
        description: ticket.description || "",
        priority: ticket.priority,
        finalEstimate: ticket.finalEstimate || "",
      });
    } else if (isOpen && !isEditing) {
      setFormData({
        title: "",
        description: "",
        priority: Priority.MEDIUM,
        finalEstimate: "",
      });
    }
  }, [isOpen, ticket, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? t("tickets.edit") : t("tickets.create")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tickets.form.title")}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder={t("tickets.form.titlePlaceholder")}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tickets.form.description")}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder={t("tickets.form.descriptionPlaceholder")}
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tickets.form.priority")}
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value={Priority.LOW}>{t("tickets.priority.low")}</option>
              <option value={Priority.MEDIUM}>{t("tickets.priority.medium")}</option>
              <option value={Priority.HIGH}>{t("tickets.priority.high")}</option>
              <option value={Priority.URGENT}>{t("tickets.priority.urgent")}</option>
            </select>
          </div>
          
          {/* Campo de estimativa final (apenas na edição) */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("tickets.form.finalEstimate")}
              </label>
              <input
                type="text"
                value={formData.finalEstimate}
                onChange={(e) => setFormData(prev => ({ ...prev, finalEstimate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder={t("tickets.form.finalEstimatePlaceholder")}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t("tickets.form.finalEstimateHelp")}
              </p>
            </div>
          )}
          
          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? t("saving") : (isEditing ? t("tickets.update") : t("tickets.create"))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 