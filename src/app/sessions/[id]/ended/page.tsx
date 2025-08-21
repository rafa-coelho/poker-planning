"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FaRegHandSpock } from "react-icons/fa";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import "@/i18n/index";

export default function SessionEndedPage() {
  const { t } = useTranslation("common");
  const params = useParams();
  const sessionId = params.id as string;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <FaRegHandSpock className="text-blue-500" size={48} />
            <CheckCircleIcon className="absolute -top-2 -right-2 h-6 w-6 text-green-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {t("session.ended.title")}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {t("session.ended.message")}
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500">
            {t("session.ended.sessionId")}: <span className="font-mono text-gray-700">{sessionId}</span>
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => window.close()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            {t("session.ended.closeTab")}
          </button>
          
          <button
            onClick={() => window.location.href = "/"}
            className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            {t("session.ended.goHome")}
          </button>
        </div>
      </div>
    </div>
  );
} 