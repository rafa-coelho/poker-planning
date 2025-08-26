'use client';

import "@/i18n/index";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function ResetPasswordContent() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const type = searchParams.get('type'); // 'invite' ou null (reset padrão)

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  
  const isInvite = type === 'invite';

  useEffect(() => {
    // Só redirecionar se não há token
    if (!token) {
      const message = isInvite ? t('auth.invite.invalidToken') : t('auth.resetPassword.invalidToken');
      toast.error(message);
      router.push('/login');
      return;
    }
    
    // Se há token, marcar como válido para mostrar o formulário
    setIsValidToken(true);
  }, [token, router, t, isInvite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      const message = isInvite ? t('auth.invite.invalidToken') : t('auth.resetPassword.invalidToken');
      toast.error(message);
      return;
    }

    if (password.length < 6) {
      const message = isInvite ? t('auth.invite.passwordTooShort') : t('auth.resetPassword.passwordTooShort');
      toast.error(message);
      return;
    }

    if (password !== confirmPassword) {
      const message = isInvite ? t('auth.invite.passwordsDoNotMatch') : t('auth.resetPassword.passwordsDoNotMatch');
      toast.error(message);
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
          type: isInvite ? 'invite' : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const message = isInvite ? t('auth.invite.success') : t('auth.resetPassword.success');
        toast.success(message);
        router.push('/login');
      } else {
        const errorFallback = isInvite ? t('auth.invite.error') : t('auth.resetPassword.error');
        const errorMessage = data.error?.message || errorFallback;
        toast.error(errorMessage);
        
        // Se o token é inválido ou expirado, redirecionar para login
        if (data.error?.code === 'INVALID_TOKEN' || data.error?.code === 'TOKEN_EXPIRED' || data.error?.code === 'INVITE_ALREADY_USED') {
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Reset password error:', error);
      const message = isInvite ? t('auth.invite.error') : t('auth.resetPassword.error');
      toast.error(message);
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
          <div className={`mx-auto h-12 w-12 flex items-center justify-center rounded-full ${isInvite ? 'bg-green-100' : 'bg-blue-100'}`}>
            <Lock className={`h-6 w-6 ${isInvite ? 'text-green-600' : 'text-blue-600'}`} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isInvite ? t('auth.invite.title') : t('auth.resetPassword.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isInvite ? t('auth.invite.subtitle') : t('auth.resetPassword.subtitle')}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Nova Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {isInvite ? t('auth.invite.newPassword') : t('auth.resetPassword.newPassword')}
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
                  placeholder={isInvite ? t('auth.invite.newPasswordPlaceholder') : t('auth.resetPassword.newPasswordPlaceholder')}
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
                    {isInvite ? t('auth.invite.passwordRequirements') : t('auth.resetPassword.passwordRequirements')}
                  </span>
                </div>
              )}
            </div>

            {/* Confirmar Senha */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {isInvite ? t('auth.invite.confirmPassword') : t('auth.resetPassword.confirmPassword')}
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
                  placeholder={isInvite ? t('auth.invite.confirmPasswordPlaceholder') : t('auth.resetPassword.confirmPasswordPlaceholder')}
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
                    {isInvite ? t('auth.invite.passwordsMatch') : t('auth.resetPassword.passwordsMatch')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || password.length < 6 || password !== confirmPassword}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${isInvite ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                isInvite ? t('auth.invite.submit') : t('auth.resetPassword.submit')
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className={`text-sm ${isInvite ? 'text-green-600 hover:text-green-500' : 'text-blue-600 hover:text-blue-500'}`}
            >
              {isInvite ? t('auth.invite.backToLogin') : t('auth.resetPassword.backToLogin')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
} 