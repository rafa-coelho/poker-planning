'use client';

import "@/i18n/index";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/hooks/useAuth';

interface PublicAccessData {
  sessionId: string;
  name: string;
  description?: string;
  status: string;
  allowPublicAccess: boolean;
  requiresApproval: boolean;
  votingMode: string;
  autoReveal: boolean;
  allowObservers: boolean;
  currentUser: {
    isLoggedIn: boolean;
    hasAccess: boolean;
    user?: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  };
  session: {
    createdAt: string;
    createdBy: {
      name: string;
      email: string;
    };
    participantsCount: number;
    publicParticipantsCount: number;
  };
}

interface PublicAccessRequest {
  name: string;
  email?: string;
}

export default function PublicSessionPage() {
  const { t } = useTranslation('common');
  const params = useParams();
  const router = useRouter();
  const { user, isLoading, apiService } = useAuth();
  
  const [sessionData, setSessionData] = useState<PublicAccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessForm, setAccessForm] = useState<PublicAccessRequest>({
    name: '',
    email: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<{
    status: 'idle' | 'pending' | 'approved' | 'rejected' | 'error';
    message?: string;
    participantId?: string;
  }>({ status: 'idle' });

  const sessionId = params.id as string;

  useEffect(() => {
    checkPublicAccess();
  }, [sessionId]);

  const checkPublicAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      const resp = await apiService.getPublicAccess(sessionId);

      if (resp.success && resp.data) {
        // Verificar se a sessão está encerrada
        if (resp.data.status === 'COMPLETED' || resp.data.status === 'ARCHIVED' || resp.data.status === 'CANCELLED') {
          console.log('Sessão encerrada detectada na página pública:', resp.data.status);
          router.push(`/sessions/${sessionId}/ended`);
          return;
        }
        
        setSessionData(resp.data);
        
        // Se o usuário já tem acesso, redirecionar para a sessão
        if (resp.data.currentUser.hasAccess) {
          router.push(`/sessions/${sessionId}`);
          return;
        }
      } else {
        setError(resp.error?.message || 'Erro ao verificar acesso público');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessRequest = async () => {
    if (!accessForm.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const resp = await apiService.requestPublicAccess(sessionId, accessForm);

      if (resp.success && resp.data) {
        setRequestStatus({
          status: 'pending',
          message: resp.data.message,
          participantId: resp.data.participantId
        });
        setShowAccessModal(false);
      } else {
        setError(resp.error?.message || 'Erro ao solicitar acesso');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = () => {
    router.push(`/login?redirect=/sessions/${sessionId}/public`);
  };

  const handleGoToSession = () => {
    router.push(`/sessions/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Acesso Negado</h3>
            <p className="mt-2 text-sm text-gray-500">
              {error || 'Esta sessão não permite acesso público ou não foi encontrada.'}
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (requestStatus.status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Aguardando Aprovação</h3>
            <p className="mt-2 text-sm text-gray-500">
              {requestStatus.message}
            </p>
            <p className="mt-2 text-sm text-gray-400">
              O dono da sessão será notificado e poderá aprovar seu acesso.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setRequestStatus({ status: 'idle' })}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {sessionData.name}
          </h1>
          {sessionData.description && (
            <p className="text-lg text-gray-600 mb-4">
              {sessionData.description}
            </p>
          )}
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <span>Criado por {sessionData.session.createdBy.name}</span>
            <span>•</span>
            <span>{sessionData.session.participantsCount} participantes</span>
            {sessionData.session.publicParticipantsCount > 0 && (
              <>
                <span>•</span>
                <span>{sessionData.session.publicParticipantsCount} externos</span>
              </>
            )}
          </div>
        </div>

        {/* Access Options */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Como você gostaria de acessar esta sessão?
            </h2>
            <p className="text-gray-600">
              Escolha uma das opções abaixo para participar
            </p>
          </div>

          <div className="text-center">
            <div className="max-w-md mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mx-auto mb-4">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Como participar desta sessão
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Você tem duas opções para participar:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">
                      <strong>Usuários logados:</strong> Acesso direto à sessão
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">
                      <strong>Usuários não logados:</strong> Podem participar como convidados
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleLogin}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Entrar com Conta
                </button>
                <button
                  onClick={() => setShowAccessModal(true)}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                  Participar como Convidado
                </button>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Access Modal */}
      {showAccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Participar como Convidado
            </h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleAccessRequest(); }}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  id="name"
                  value={accessForm.name}
                  onChange={(e) => setAccessForm((prev: any) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  id="email"
                  value={accessForm.email}
                  onChange={(e) => setAccessForm((prev: any) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAccessModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Solicitar Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
