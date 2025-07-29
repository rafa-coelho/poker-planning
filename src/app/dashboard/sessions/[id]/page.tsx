'use client';

import "@/i18n/index";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams } from 'next/navigation';
import { useBreadcrumbs } from '@/lib/context/breadcrumbContext';
import { useAuth } from '@/lib/hooks/useAuth';

interface Participant {
  id: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

interface Ticket {
  id: string;
  title: string;
  status: string;
  finalEstimate?: string;
}

interface Session {
  id: string;
  name: string;
  description?: string;
  status: string;
  votingMode: string;
  autoReveal: boolean;
  allowObservers: boolean;
  timerDuration?: number;
  isRevealed: boolean;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
  participants: Participant[];
  tickets: Ticket[];
  _count: {
    participants: number;
    tickets: number;
  };
  createdBy: {
    name: string;
    email: string;
  };
}

export default function SessionDetailPage() {
  const { t } = useTranslation("dashboard");
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const { setBreadcrumbs, clearBreadcrumbs } = useBreadcrumbs();
  const { apiService } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
    
    // Limpar breadcrumbs quando o componente for desmontado
    return () => {
      clearBreadcrumbs();
    };
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      
      const response = await apiService.getSession(sessionId);

      if (response.success && response.data) {
        setSession(response.data);
        
        // Definir breadcrumbs customizados com o nome da sessão
        setBreadcrumbs([
          { name: t('breadcrumbs.dashboard'), href: '/dashboard' },
          { name: t('breadcrumbs.sessions'), href: '/dashboard/sessions' },
          { name: response.data.name, href: `/dashboard/sessions/${sessionId}` }
        ]);
        
        // Atualizar o título da página
        document.title = `${response.data.name} - Poker Planning`;
      } else {
        setError(response.error?.message || t('errors.loadSession'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return t('status.active');
      case 'COMPLETED':
        return t('status.completed');
      case 'ARCHIVED':
        return t('status.archived');
      default:
        return status;
    }
  };

  const getVotingModeText = (mode: string) => {
    switch (mode) {
      case 'FIBONACCI':
        return t('votingMode.fibonacci');
      case 'TSHIRT':
        return t('votingMode.tshirt');
      case 'LINEAR':
        return t('votingMode.linear');
      case 'CUSTOM':
        return t('votingMode.custom');
      default:
        return mode;
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'MODERATOR':
        return t('role.moderator');
      case 'VOTER':
        return t('role.voter');
      case 'OBSERVER':
        return t('role.observer');
      default:
        return role;
    }
  };

  const handleJoinSession = () => {
    // Redirecionar para a sessão de votação
    router.push(`/${sessionId}`);
  };

  const handleEditSession = () => {
    router.push(`/dashboard/sessions/${sessionId}/edit`);
  };

  const handleBackToList = () => {
    router.push('/dashboard/sessions');
  };

  const handleArchiveSession = async () => {
    if (!confirm('Tem certeza que deseja arquivar esta sessão?')) {
      return;
    }

    try {
      const response = await apiService.archiveSession(sessionId);

      if (response.success) {
        router.push('/dashboard/sessions');
      } else {
        setError(response.error?.message || t('errors.archiveSession'));
      }
    } catch (err) {
      setError(t('errors.archiveSession'));
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              {t('errors.loadSession')}
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {session.name}
              </h1>
              <p className="mt-2 text-gray-600">
                {session.description || t('session.description')}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {session.status === 'ACTIVE' && (
              <>
                <button
                  onClick={handleJoinSession}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  {t('sessions.join')}
                </button>
                <button
                  onClick={handleEditSession}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  {t('sessions.edit')}
                </button>
              </>
            )}
            {session.status === 'ACTIVE' && (
              <button
                onClick={handleArchiveSession}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
              >
                {t('sessions.archive')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('session.info')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('session.status')}</dt>
                <dd className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                    {getStatusText(session.status)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('session.votingMode')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{getVotingModeText(session.votingMode)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('session.createdBy')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{session.createdBy.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">{t('session.createdAt')}</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(session.createdAt).toLocaleDateString('pt-BR')}
                </dd>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('session.participants')} ({session._count.participants})
            </h3>
            <div className="space-y-3">
              {session.participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {participant.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{participant.user.name}</p>
                      <p className="text-xs text-gray-500">{participant.user.email}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    {getRoleText(participant.role)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tickets */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('session.tickets')} ({session._count.tickets})
            </h3>
            {session.tickets.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('session.noTickets')}</p>
            ) : (
              <div className="space-y-3">
                {session.tickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ticket.title}</p>
                      <p className="text-xs text-gray-500">Status: {ticket.status}</p>
                    </div>
                    {ticket.finalEstimate && (
                      <span className="text-sm font-medium text-blue-600">
                        {ticket.finalEstimate}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('session.quickActions')}</h3>
            <div className="space-y-3">
              {session.status === 'ACTIVE' && (
                <button
                  onClick={handleJoinSession}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {t('sessions.join')}
                </button>
              )}
              <button
                onClick={handleBackToList}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {t('quickActions.backToList')}
              </button>
            </div>
          </div>

          {/* Session Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('session.settings')}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('session.autoReveal')}</span>
                <span className={session.autoReveal ? 'text-green-600' : 'text-gray-400'}>
                  {session.autoReveal ? t('session.enabled') : t('session.disabled')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('session.observers')}</span>
                <span className={session.allowObservers ? 'text-green-600' : 'text-gray-400'}>
                  {session.allowObservers ? t('session.allowed') : t('session.blocked')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('session.timer')}</span>
                <span className="text-gray-900">
                  {session.timerDuration ? `${session.timerDuration}s` : t('session.disabled')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}