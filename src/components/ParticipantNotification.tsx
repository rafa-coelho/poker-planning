"use client";

import React, { useEffect } from "react";
import { toast, Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import "@/i18n/index";
import { FiX } from "react-icons/fi";

interface ParticipantNotificationProps {
  notification: { userName: string; type: 'left' | 'joined' } | null;
  onClose: () => void;
}

export default function ParticipantNotification({ notification, onClose }: ParticipantNotificationProps) {
  const { t } = useTranslation("common");

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const isLeaving = notification.type === 'left';
  const bgColor = isLeaving ? 'bg-red-500' : 'bg-green-500';
  const icon = isLeaving ? '👋' : '👋';

  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 animate-in slide-in-from-right duration-300`}>
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <div className="font-medium">
          {isLeaving 
            ? t("session.participantLeft.title")
            : t("session.participantJoined.title")
          }
        </div>
        <div className="text-sm opacity-90">
          {isLeaving 
            ? t("session.participantLeft.message", { userName: notification.userName })
            : t("session.participantJoined.message", { userName: notification.userName })
          }
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 transition-colors"
      >
        <FiX size={16} />
      </button>
    </div>
  );
} 