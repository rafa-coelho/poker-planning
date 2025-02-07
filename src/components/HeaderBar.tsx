"use client";

import React from "react";
import { FiChevronDown, FiClock } from "react-icons/fi";
import { FaRegHandSpock } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { SessionState } from "./useSession";

interface HeaderBarProps {
  sessionData: SessionState;
  userName: string;
  onInviteOpen: () => void;
}

export default function HeaderBar({ sessionData, userName, onInviteOpen }: HeaderBarProps) {
  const { t } = useTranslation("common");
  
  return (
    <header className="w-full border-b bg-white sticky top-0 z-10">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
        
        <div className="flex items-center space-x-3">
          <FaRegHandSpock className="text-blue-500" size={26} />
          <div className="flex items-center space-x-1 font-semibold text-lg">
            <span>{sessionData.sessionName}</span>
          </div>
        </div>

        
        <div className="flex items-center space-x-4">
          {/* TODO: implement this features */}
          {/* <FiClock className="text-gray-500" size={20} /> */}
          <div className="flex items-center space-x-1 text-gray-700">
            {/* <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center mr-2">
              <span className="text-sm font-bold text-blue-600">
                {userName ? userName[0].toUpperCase() : "?"}
              </span>
            </div> */}
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
