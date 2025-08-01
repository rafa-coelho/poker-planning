'use client';

import "@/i18n/index";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Só redirecionar se não há token
    if (!token) {
      toast.error(t('auth.resetPassword.invalidToken'));
      router.push('/login');
      return;
    }
    
    // Se há token, marcar como válido para mostrar o formulário
    setIsValidToken(true);
  }, [token, router, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error(t('auth.resetPassword.invalidToken'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('auth.resetPassword.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('auth.resetPassword.passwordsDoNotMatch'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t('auth.resetPassword.success'));
        router.push('/login');
      } else {
        const errorMessage = data.error?.message || t('auth.resetPassword.error');
        toast.error(errorMessage);
        
        // Se o token é inválido ou expirado, redirecionar para login
        if (data.error?.code === 'INVALID_TOKEN' || data.error?.code === 'TOKEN_EXPIRED') {
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(t('auth.resetPassword.error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar loading enquanto verifica o token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Se não há token válido, não renderizar nada (já redirecionou)
  if (isValidToken === false) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('auth.resetPassword.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.resetPassword.subtitle')}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Nova Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.resetPassword.newPassword')}
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-1 flex items-center">
                  {password.length >= 6 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`ml-1 text-xs ${password.length >= 6 ? 'text-green-600' : 'text-red-600'}`}>
                    {t('auth.resetPassword.passwordRequirements')}
                  </span>
                </div>
              )}
            </div>

            {/* Confirmar Senha */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('auth.resetPassword.confirmPassword')}
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <div className="mt-1 flex items-center">
                  {password === confirmPassword ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`ml-1 text-xs ${password === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                    {t('auth.resetPassword.passwordsMatch')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || password.length < 6 || password !== confirmPassword}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                t('auth.resetPassword.submit')
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {t('auth.resetPassword.backToLogin')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 