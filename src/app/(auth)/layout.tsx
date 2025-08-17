'use client';

import "@/i18n/index";
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_CONFIG } from '@/lib/config';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation("sessions");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Poker Planning
            </h1>
            <p className="text-gray-600 text-sm">
              {t('welcomeDescription')}
            </p>
          </div>
          
          {children}
          
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">

              {
                (() =>{
                  const year = new Date().getFullYear();
                  return t('copyright', { year: `2025${year === 2025 ? '' : ' - ' + year}`, appName: APP_CONFIG.APP_NAME });
                })()
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 