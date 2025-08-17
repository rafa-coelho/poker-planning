'use client';

import "@/i18n/index";
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicRoute } from '@/lib/middleware/routeProtection';

interface ForgotPasswordForm {
  email: string;
}

interface ForgotPasswordErrors {
  email?: string;
  general?: string;
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const [form, setForm] = useState<ForgotPasswordForm>({
    email: ''
  });
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ForgotPasswordErrors = {};

    if (!form.email.trim()) {
      newErrors.email = t('forgotPassword.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = t('forgotPassword.errors.invalidEmail');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({
          general: data.error?.message || t('common.error')
        });
        return;
      }

      setIsSuccess(true);
    } catch (error) {
      setErrors({
        general: t('common.error')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ email: e.target.value });
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  if (isSuccess) {
    return (
      <PublicRoute>
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('forgotPassword.title')}
            </h2>
            <p className="text-gray-600">
              {t('forgotPassword.success')}
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
            >
              {t('forgotPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </PublicRoute>
    );
  }

  return (
    <PublicRoute>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('forgotPassword.title')}
          </h2>
          <p className="text-gray-600 mt-2">
            {t('forgotPassword.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('forgotPassword.email')}
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={handleInputChange}
              placeholder={t('forgotPassword.emailPlaceholder')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('common.loading')}
              </div>
            ) : (
              t('forgotPassword.sendButton')
            )}
          </button>
        </form>

        <div className="text-center">
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
          >
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </PublicRoute>
  );
}