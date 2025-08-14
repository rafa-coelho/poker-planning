"use client";

import React from "react";
import { FiChevronDown, FiClock } from "react-icons/fi";
import { FaRegHandSpock } from "react-icons/fa";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { SessionState } from "./useSession";

interface HeaderBarProps {
  sessionData: SessionState;
  userName: string;
  onInviteOpen: () => void;
  onToggleSidebar?: () => void;
}

export default function HeaderBar({ sessionData, userName, onInviteOpen, onToggleSidebar }: HeaderBarProps) {
  const { t } = useTranslation("common");
  
  return (
    <header className="w-full border-b bg-white sticky top-0 z-10">
      <div className="px-4 py-3 flex items-center justify-between">
        
        <div className="flex items-center space-x-3">
          {/* Botão de menu */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md hover:bg-gray-100"
              title="Menu"
            >
              <Bars3Icon className="h-6 w-6 text-gray-600" />
            </button>
          )}
          
          <FaRegHandSpock className="text-blue-500" size={26} />
          <div className="flex items-center space-x-1 font-semibold text-lg">
            <span>{sessionData.sessionName}</span>
          </div>
        </div>

        
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-gray-700">
              <span className="font-medium text-sm">{userName}</span>
            </div>

            <button
              className="border border-blue-500 text-blue-500 px-3 py-1 rounded hover:bg-blue-50 transition"
              onClick={onInviteOpen}
            >
              {t("invitePlayers")}
            </button>
        </div>
      </div>
    </header>
  );
}
