'use client';

import "@/i18n/index";
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { PublicRoute } from '@/lib/middleware/routeProtection';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
}

interface RegisterErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  organizationName?: string;
  general?: string;
}

export default function RegisterPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState<RegisterForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: ''
  });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: RegisterErrors = {};

    if (!form.name.trim()) {
      newErrors.name = t('auth.register.errors.nameRequired');
    }

    if (!form.email.trim()) {
      newErrors.email = t('auth.register.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = t('auth.register.errors.invalidEmail');
    }

    if (!form.password.trim()) {
      newErrors.password = t('auth.register.errors.passwordRequired');
    } else if (form.password.length < 6) {
      newErrors.password = t('auth.register.errors.passwordTooShort');
    }

    if (!form.confirmPassword.trim()) {
      newErrors.confirmPassword = t('auth.register.errors.confirmPasswordRequired');
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = t('auth.register.errors.passwordsDoNotMatch');
    }

    if (!form.organizationName.trim()) {
      newErrors.organizationName = t('auth.register.errors.organizationRequired');
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
      const success = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        organizationName: form.organizationName
      });
      
      if (!success) {
        setErrors({
          general: t('auth.common.error')
        });
        return;
      }

      // Redirecionar para o dashboard após registro bem-sucedido
      router.push('/dashboard');
    } catch (error) {
      setErrors({
        general: t('auth.common.error')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof RegisterForm) => (
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
            {t('auth.register.title')}
          </h2>
          <p className="text-gray-600 mt-2">
            {t('auth.register.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.register.name')}
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={handleInputChange('name')}
              placeholder={t('auth.register.namePlaceholder')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.register.email')}
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={handleInputChange('email')}
              placeholder={t('auth.register.emailPlaceholder')}
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
            <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.register.organizationName')}
            </label>
            <input
              id="organizationName"
              type="text"
              value={form.organizationName}
              onChange={handleInputChange('organizationName')}
              placeholder={t('auth.register.organizationPlaceholder')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.organizationName ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.organizationName && (
              <p className="text-red-600 text-sm mt-1">{errors.organizationName}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.register.password')}
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={handleInputChange('password')}
              placeholder={t('auth.register.passwordPlaceholder')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.register.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              placeholder={t('auth.register.confirmPasswordPlaceholder')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
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
                {t('auth.common.loading')}
              </div>
            ) : (
              t('auth.register.registerButton')
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-gray-600 text-sm">
            {t('auth.register.hasAccount')}{' '}
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
            >
              {t('auth.register.loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </PublicRoute>
  );
}