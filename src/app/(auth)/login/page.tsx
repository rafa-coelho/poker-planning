'use client';

import "@/i18n/index";
import React, { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { PublicRoute } from '@/lib/middleware/routeProtection';
import { APP_CONFIG } from '@nyx/config';
import LoginRedirect from './redirect';

interface LoginForm {
  email: string;
  password: string;
}

interface LoginErrors {
  email?: string;
  password?: string;
  general?: string;
}

function LoginContent() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Capturar parâmetro redirect da URL
  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (redirect) {
      setRedirectTo(redirect);
    }
  }, [searchParams]);

  const validateForm = (): boolean => {
    const newErrors: LoginErrors = {};

    if (!form.email.trim()) {
      newErrors.email = t('auth.login.errors.requiredEmail');
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = t('auth.login.errors.invalidEmail');
    }

    if (!form.password.trim()) {
      newErrors.password = t('auth.login.errors.requiredPassword');
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
      const success = await login(form.email, form.password);
      
      if (!success) {
        setErrors({
          general: t('auth.login.errors.invalidCredentials')
        });
        return;
      }

      // Redirecionar para o destino especificado ou dashboard
      router.push(redirectTo || '/dashboard');
    } catch (error) {
      setErrors({
        general: t('auth.common.error')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    // Limpar erro do campo quando o usuário começa a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <PublicRoute>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('auth.login.title')}
          </h2>
          <p className="text-gray-600 mt-2">
            {t('auth.login.subtitle')}
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
              {t('auth.login.email')}
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={handleInputChange('email')}
              placeholder={t('auth.login.emailPlaceholder')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.login.password')}
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={handleInputChange('password')}
              placeholder={t('auth.login.passwordPlaceholder')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
            >
              {t('auth.login.forgotPassword')}
            </Link>
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
                {t('auth.common.loading')}
              </div>
            ) : (
              t('auth.login.loginButton')
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-gray-600 text-sm">
            {t('auth.login.noAccount')}{' '}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
            >
              {t('auth.login.registerLink')}
            </Link>
          </p>
        </div>
      </div>
    </PublicRoute>
  );
}

export default function LoginPage() {
  // Fase 5: Se USE_EXTERNAL_IDP está ativo, redirecionar para IdP
  if (APP_CONFIG.USE_EXTERNAL_IDP) {
    return <LoginRedirect />
  }

  // Caso contrário, usar login interno (legacy)
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
} 