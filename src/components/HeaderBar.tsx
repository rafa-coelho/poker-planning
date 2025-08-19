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
  isCreator?: boolean;
  onInviteOpen: () => void;
  onToggleSidebar?: () => void;
  onEndSession?: () => void;
  pendingRequestsCount?: number;
  onShowPendingRequests?: () => void;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
}

export default function HeaderBar({ sessionData, userName, isCreator = false, onInviteOpen, onToggleSidebar, onEndSession, pendingRequestsCount = 0, onShowPendingRequests, connectionStatus = 'connected' }: HeaderBarProps) {
  const { t } = useTranslation("common");
  
  return (
    <header className="w-full border-b bg-white sticky top-0 z-10">
      <div className="px-4 py-3 flex items-center justify-between">
        
        <div className="flex items-center space-x-3">
          {/* Menu button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md hover:bg-gray-100"
              title={t('menu')}
            >
              <Bars3Icon className="h-6 w-6 text-gray-600" />
            </button>
          )}
          
          <FaRegHandSpock className="text-blue-500" size={26} />
          <div className="flex items-center space-x-1 font-semibold text-lg">
            <span>{sessionData.sessionName}</span>
          </div>
          
          {/* Connection status indicator */}
          <div className="flex items-center space-x-1">
            <div 
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
            />
            <span className="text-xs text-gray-500">
              {connectionStatus === 'connected' ? 'Conectado' :
               connectionStatus === 'connecting' ? 'Conectando...' :
               'Desconectado'}
            </span>
          </div>
        </div>

        
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-gray-700">
              <span className="font-medium text-sm">{userName}</span>
            </div>

            {/* Notification of pending requests */}
            {pendingRequestsCount > 0 && onShowPendingRequests && (
              <button
                className="relative border border-orange-500 text-orange-500 px-3 py-1 rounded hover:bg-orange-50 transition"
                onClick={onShowPendingRequests}
                title={`${pendingRequestsCount} ${t('pending')}`}
              >
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                  </svg>
                  <span>{t('pendingRequests')} ({pendingRequestsCount})</span>
                </span>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              </button>
            )}

            <button
              className="border border-blue-500 text-blue-500 px-3 py-1 rounded hover:bg-blue-50 transition"
              onClick={onInviteOpen}
            >
              {t("invitePlayers")}
            </button>
            
            {isCreator && onEndSession && (
              <button
                className="border border-red-500 text-red-500 px-3 py-1 rounded hover:bg-red-50 transition"
                onClick={onEndSession}
              >
                {t("endSession")}
              </button>
            )}
        </div>
      </div>
    </header>
  );
}
