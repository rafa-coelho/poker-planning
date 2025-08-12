'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBreadcrumbs } from '@/lib/context/breadcrumbContext';

export default function ReportsPage() {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setBreadcrumbs([
      { name: t('breadcrumbs.dashboard'), href: '/dashboard' },
      { name: t('breadcrumbs.reports'), href: '/dashboard/reports' }
    ]);

    // Simular carregamento
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [setBreadcrumbs, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
            <p className="text-gray-600 mt-1">{t('reports.description')}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('reports.comingSoon')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('reports.comingSoonDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 