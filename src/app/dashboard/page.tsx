'use client';

import "@/i18n/index";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  totalParticipants: number;
  totalTickets: number;
  recentSessions: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
    _count: {
      participants: number;
      tickets: number;
    };
  }>;
}

export default function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const router = useRouter();
  const { apiService } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    activeSessions: 0,
    totalParticipants: 0,
    totalTickets: 0,
    recentSessions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Buscar sessões para calcular estatísticas
      const sessionsResponse = await apiService.listSessions({
        page: 1,
        limit: 100 // Buscar mais para estatísticas
      });

      if (sessionsResponse.success && sessionsResponse.data) {
        const sessions = sessionsResponse.data;
        const activeSessions = sessions.filter(s => s.status === 'ACTIVE').length;
        const totalParticipants = sessions.reduce((sum, s) => sum + s._count.participants, 0);
        const totalTickets = sessions.reduce((sum, s) => sum + s._count.tickets, 0);
        const recentSessions = sessions.slice(0, 5); // Últimas 5 sessões

        setStats({
          totalSessions: sessions.length,
          activeSessions,
          totalParticipants,
          totalTickets,
          recentSessions
        });
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToSessions = () => {
    router.push('/dashboard/sessions');
  };

  const handleNavigateToNewSession = () => {
    router.push('/dashboard/sessions/new');
  };

  const handleViewSession = (sessionId: string) => {
    router.push(`/dashboard/sessions/${sessionId}`);
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

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('welcome')}
        </h1>
        <p className="mt-2 text-gray-600">
          {t('description')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Sessions */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('stats.sessions')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalSessions}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('status.active')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.activeSessions}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Total Participants */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('stats.participants')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalParticipants}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Total Tickets */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('stats.tickets')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalTickets}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Sessions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {t('recent')}
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {stats.recentSessions.length === 0 ? (
              <div className="px-6 py-4 text-center text-gray-500">
                {t('noSessions')}
              </div>
            ) : (
              stats.recentSessions.map((session) => (
                <div key={session.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleViewSession(session.id)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left truncate"
                      >
                        {session.name}
                      </button>
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                          {getStatusText(session.status)}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          {session._count.participants} {t('session.participants')} • {session._count.tickets} {t('session.tickets')}
                        </span>
                      </div>
                    </div>
                    {/* Removido botão "ver"; nome acima agora é clicável */}
                  </div>
                </div>
              ))
            )}
          </div>
          {stats.recentSessions.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-200">
              <button
                onClick={handleNavigateToSessions}
                className="text-sm text-blue-600 hover:text-blue-900 font-medium"
              >
                {t('viewAll')}
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {t('quickActions.title')}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <button
              onClick={handleNavigateToNewSession}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('new')}
            </button>
            <button
              onClick={handleNavigateToSessions}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {t('viewSessions')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}