"use client";

import "@/i18n/index";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useOpenMode } from '@/lib/hooks/useOpenMode';
import { APP_CONFIG } from '@/lib/config';

export default function OpenModeJoinPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { t } = useTranslation('common');
  const { isOpenMode, joinOpenSession } = useOpenMode();

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Se não estiver no modo aberto, redirecionar
  if (!isOpenMode) {
    router.push("/");
    return null;
  }

  // Carregar dados da sessão
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/open/sessions/${sessionId}`);
        const result = await response.json();

        if (result.success) {
          setSessionData(result.session);
        } else {
          setError(result.error || t("openMode.join.sessionNotFound"));
        }
      } catch (err) {
        setError(t("openMode.join.error"));
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!participantName.trim()) {
      setError(t("openMode.join.nameRequired"));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const success = await joinOpenSession(sessionId as string, participantName.trim());
      
      if (success) {
        router.push(`/open/${sessionId}`);
      }
    } catch (err: any) {
      setError(err.message || t("openMode.join.joinError"));
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="mt-4 text-gray-600">{t("openMode.join.loading")}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-100">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h1 className="text-xl font-semibold text-red-800 mb-2">{t("error")}</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/open')}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            {t("backToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-100">
      {/* Header */}
      <div className="absolute top-4 left-4">
        <button
          onClick={() => router.push('/open')}
          className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
        >
          ← {t("backToDashboard")}
        </button>
      </div>

      {/* Título */}
      <h1 className="text-4xl font-extrabold text-gray-800">{t("openMode.join.title")}</h1>
      <p className="text-lg text-gray-600 mt-2 text-center">
        {sessionData?.name || t("session.defaultName")}
      </p>

      {sessionData?.description && (
        <p className="text-sm text-gray-500 mt-1 text-center max-w-md">
          {sessionData.description}
        </p>
      )}

      {/* Informações da Sessão */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border p-6 max-w-md w-full">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t("openMode.join.sessionInfo")}</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>{t("openMode.createModal.votingMode")}:</span>
              <span className="font-medium">
                {sessionData?.votingMode === 'FIBONACCI' && t("openMode.createModal.votingModes.fibonacci")}
                {sessionData?.votingMode === 'T_SHIRT' && t("openMode.createModal.votingModes.tshirt")}
                {sessionData?.votingMode === 'LINEAR' && t("openMode.createModal.votingModes.linear")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t("loading.users")}:</span>
              <span className="font-medium">{sessionData?.participants?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Formulário de entrada */}
        <form onSubmit={handleJoinSession}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t("openMode.join.name")} *
            </label>
            <input
              type="text"
              id="name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder={t("openMode.join.namePlaceholder")}
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !participantName.trim()}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
          >
            {submitting ? t("openMode.join.joining") : t("openMode.join.join")}
          </button>
        </form>
      </div>

      {/* Aviso */}
      <div className="mt-6 max-w-md text-center">
        <p className="text-sm text-gray-500">
          Esta é uma sessão temporária. Os dados podem ser perdidos após a expiração.
        </p>
      </div>
    </div>
  );
}
