'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Página de callback do IdP
 * Recebe o token e redireciona para o dashboard
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      if (!token) {
        console.error('[AuthCallback] Token não encontrado na URL');
        router.push('/login');
        return;
      }

      console.log('[AuthCallback] Token recebido do IdP:', token.substring(0, 20) + '...');
      console.log('[AuthCallback] Token completo:', token);

      try {
        // PRIMEIRO: Vincular usuário do IdP no sistema local
        console.log('[AuthCallback] Vinculando usuário do IdP...');
        const linkResponse = await fetch('/api/auth/link-idp', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!linkResponse.ok) {
          const error = await linkResponse.json();
          console.error('[AuthCallback] Erro ao vincular usuário:', error);
          throw new Error(error.error || 'Falha ao vincular usuário');
        }

        const linkData = await linkResponse.json();
        console.log('[AuthCallback] Usuário vinculado:', linkData);

        // DEPOIS: Salvar token no localStorage (para evitar race condition com useAuth)
        localStorage.setItem('accessToken', token);
        console.log('[AuthCallback] Token salvo no localStorage');
        
        // Limpar token antigo se existir
        localStorage.removeItem('token');

        // Pequeno delay para garantir que o DB commit finalizou
        await new Promise(resolve => setTimeout(resolve, 300));

        // Redirecionar para dashboard
        console.log('[AuthCallback] Redirecionando para dashboard...');
        
        // Forçar reload para o AuthProvider pegar o novo token
        window.location.href = '/dashboard';
      } catch (error: any) {
        console.error('[AuthCallback] Erro:', error);
        alert('❌ Erro: ' + (error.message || 'Desconhecido'));
        // Em caso de erro, redirecionar para login
        window.location.href = '/login';
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48,
          height: 48,
          border: '4px solid #e5e7eb',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <h2>Autenticando...</h2>
        <p>Você será redirecionado em instantes.</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

