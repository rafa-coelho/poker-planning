'use client';

import "@/i18n/index";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBreadcrumbs } from '@/lib/context/breadcrumbContext';

interface Session {
  id: string;
  name: string;
  description?: string;
  status: string;
  votingMode: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    participants: number;
    tickets: number;
  };
  createdBy: {
    name: string;
    email: string;
  };
  participants: Array<{
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
  }>;
  tickets: Array<{
    id: string;
    title: string;
    status: string;
    finalEstimate?: string;
  }>;
}

export default function SessionDetailPage() {
  const { t } = useTranslation("sessions");
  const { t: tTickets } = useTranslation("tickets");
  const router = useRouter();
  const params = useParams();
  const { apiService } = useAuth();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = params.id as string;

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails();
    }
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      setBreadcrumbs([
        { name: t('breadcrumbs.dashboard'), href: '/dashboard' },
        { name: t('breadcrumbs.sessions'), href: '/dashboard/sessions' },
        { name: session.name, href: `/dashboard/sessions/${session.id}` }
      ]);
    }
  }, [session, setBreadcrumbs, t]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      
      const response = await apiService.getSession(sessionId);

      if (response.success && response.data) {
        setSession(response.data);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return tTickets('priority.low');
      case 'MEDIUM':
        return tTickets('priority.medium');
      case 'HIGH':
        return tTickets('priority.high');
      case 'URGENT':
        return tTickets('priority.urgent');
      default:
        return priority;
    }
  };

  const getTicketStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return tTickets('status.pending');
      case 'VOTING':
        return tTickets('status.voting');
      case 'ESTIMATED':
        return tTickets('status.estimated');
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleJoinSession = () => {
    router.push(`/${sessionId}`);
  };

  const handleEditSession = () => {
    router.push(`/dashboard/sessions/${sessionId}/edit`);
  };

  const handleBackToList = () => {
    router.push('/dashboard/sessions');
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

  if (error) {
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

  if (!session) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              {t('errors.notFound')}
            </h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{session.name}</h1>
            {session.description && (
              <p className="mt-2 text-gray-600">{session.description}</p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleBackToList}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t('quickActions.backToList')}
            </button>
            {session.status === 'ACTIVE' && (
              <>
                <button
                  onClick={handleJoinSession}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  {t('join.join')}
                </button>
                <button
                  onClick={handleEditSession}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {t('edit')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{t('session.info')}</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
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
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(session.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('session.participants')}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{session._count.participants}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('session.tickets')}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{session._count.tickets}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Tickets */}
          <div className="mt-8 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">{tTickets('title')}</h2>
            </div>
            <div className="overflow-hidden">
              {session.tickets.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  {t('session.noTickets')}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {tTickets('title')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {tTickets('priority')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {tTickets('status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {tTickets('finalEstimate')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('session.createdAt')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {session.tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                                                 <td className="px-6 py-4 whitespace-nowrap">
                           <div>
                             <div className="text-sm font-medium text-gray-900">
                               {ticket.title}
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className="text-sm text-gray-500">
                             -
                           </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className="text-sm text-gray-900">
                             {getTicketStatusText(ticket.status)}
                           </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                           {ticket.finalEstimate || '-'}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           -
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Participants */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{t('session.participants')}</h3>
            </div>
            <div className="p-6">
              {session.participants.length === 0 ? (
                <p className="text-sm text-gray-500">{t('session.noParticipants')}</p>
              ) : (
                <ul className="space-y-3">
                  {session.participants.map((participant) => (
                    <li key={participant.id} className="flex items-center">
                                             <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                         <span className="text-white text-sm font-medium">
                           {participant.user.name?.charAt(0)?.toUpperCase() || '?'}
                         </span>
                       </div>
                       <div className="ml-3">
                         <p className="text-sm font-medium text-gray-900">{participant.user.name}</p>
                         <p className="text-xs text-gray-500">{participant.user.email}</p>
                       </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{t('stats.title')}</h3>
            </div>
            <div className="p-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('session.participants')}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">{session._count.participants}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('session.tickets')}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-gray-900">{session._count.tickets}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('session.createdAt')}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(session.createdAt)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}