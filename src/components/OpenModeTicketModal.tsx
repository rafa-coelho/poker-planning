"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface OpenTicket {
  id: string;
  title: string;
  description?: string;
  priority: string;
  estimate?: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

interface OpenModeTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTicketData) => Promise<void>;
  ticket?: OpenTicket | null;
  votingMode?: string;
}

interface CreateTicketData {
  title: string;
  description?: string;
  priority: string;
}

export default function OpenModeTicketModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  ticket,
  votingMode = "FIBONACCI"
}: OpenModeTicketModalProps) {
  const { t } = useTranslation("common");
  const [formData, setFormData] = useState<CreateTicketData>({
    title: "",
    description: "",
    priority: "MEDIUM",
  });
  const [loading, setLoading] = useState(false);
  const isEditing = !!ticket;

  useEffect(() => {
    if (isOpen && ticket) {
      setFormData({
        title: ticket.title,
        description: ticket.description || "",
        priority: ticket.priority,
      });
    } else if (isOpen && !isEditing) {
      setFormData({
        title: "",
        description: "",
        priority: "MEDIUM",
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
      console.error(t("tickets.errors.createFailed"), error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder={t("tickets.form.titlePlaceholder")}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tickets.form.description")}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder={t("tickets.form.descriptionPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tickets.form.priority")}
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="LOW">{t("tickets.priority.low")}</option>
              <option value="MEDIUM">{t("tickets.priority.medium")}</option>
              <option value="HIGH">{t("tickets.priority.high")}</option>
            </select>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("common.saving") : (isEditing ? t("common.save") : t("common.create"))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
