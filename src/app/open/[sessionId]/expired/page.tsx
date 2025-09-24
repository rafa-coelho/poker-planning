"use client";

import "@/i18n/index";
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { APP_CONFIG } from '@/lib/config';
import { Clock, Home, Plus } from 'lucide-react';

export default function OpenModeExpiredPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { t } = useTranslation('common');

  // Se não estiver no modo aberto, redirecionar
  if (!APP_CONFIG.OPEN_MODE) {
    router.push("/");
    return null;
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

      {/* Conteúdo Principal */}
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-red-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {t("openMode.session.expired.title")}
        </h1>
        
        <p className="text-lg text-gray-600 mb-6">
          {t("openMode.session.expired.message")} {t("openMode.session.expired.duration")}
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h3 className="font-semibold text-yellow-800 mb-2">
            {t("openMode.session.expired.about")}
          </h3>
          <p className="text-sm text-yellow-700">
            {t("openMode.landing.footer.subtitle")}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/open')}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t("openMode.session.expired.createNew")}
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-600 text-white py-3 px-6 rounded-md hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            {t("landing.hero.ctaSecondary")}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-center">
        <p className="text-sm text-gray-500">
          {t("openMode.landing.title")} - {t("openMode.landing.subtitle")}
        </p>
      </div>
    </div>
  );
}
