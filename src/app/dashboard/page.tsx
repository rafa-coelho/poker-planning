'use client';

import "@/i18n/index";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/hooks/useAuth';
import { ProtectedRoute } from '@/lib/middleware/routeProtection';

export default function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('title')}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  {t('hello', { name: user?.name || 'Usuário' })}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('welcome')}
            </h2>
            <p className="text-gray-600 mb-4">
              {t('description')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  {t('sessions.title')}
                </h3>
                <p className="text-blue-700">
                  {t('sessions.description')}
                </p>
              </div>
              
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-green-900 mb-2">
                  {t('projects.title')}
                </h3>
                <p className="text-green-700">
                  {t('projects.description')}
                </p>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-purple-900 mb-2">
                  {t('reports.title')}
                </h3>
                <p className="text-purple-700">
                  {t('reports.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}