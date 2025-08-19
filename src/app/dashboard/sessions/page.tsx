'use client';

import "@/i18n/index";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBreadcrumbs } from '@/lib/context/breadcrumbContext';
import PageHeader from '@/components/PageHeader';

interface Session {
  id: string;
  name: string;
  description?: string;
  status: string;
  votingMode: string;
  createdAt: string;
  _count: {
    participants: number;
    tickets: number;
  };
  createdBy: {
    name: string;
    email: string;
  };
}

interface Filters {
  status: string;
  votingMode: string;
  search: string;
}

export default function SessionsPage() {
  const { t } = useTranslation("dashboard");
  const router = useRouter();
  const { apiService } = useAuth();
  const { clearBreadcrumbs } = useBreadcrumbs();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
    limit: 10
  });
  const [filters, setFilters] = useState<Filters>({
    status: '',
    votingMode: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(1);

  // Limpar breadcrumbs customizados para usar o breadcrumb automático
  useEffect(() => {
    clearBreadcrumbs();
  }, [clearBreadcrumbs]);

  useEffect(() => {
    console.log('useEffect executando:', { pagination: pagination.page, shouldFetch });
    
    const fetchData = async () => {
      console.log('Iniciando fetchData');
      setLoading(true);
      setError(null);
      
      try {
        const response = await apiService.listSessions({
          page: pagination.page,
          limit: pagination.limit,
          search: filters.search || undefined,
          status: filters.status || undefined,
          votingMode: filters.votingMode || undefined
        });

        console.log('Response recebida:', response);

        if (response.success && response.data) {
          console.log('Dados recebidos:', response.data.length, 'sessões');
          setSessions(response.data);
          if (response.pagination) {
            setPagination(response.pagination);
          }
        } else {
          console.log('Erro na resposta:', response.error);
          setError(response.error?.message || t('errors.loadSessions'));
        }
      } catch (err) {
        console.log('Erro capturado:', err);
        setError(err instanceof Error ? err.message : t('errors.unknown'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pagination.page, shouldFetch]);

  // Debounce para o campo de busca
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.search !== undefined) {
        setPagination(prev => ({ ...prev, page: 1 }));
        setShouldFetch(prev => prev + 1);
      }
    }, 500); // 500ms de delay

    return () => clearTimeout(timeoutId);
  }, [filters.search]);

  // Filtros de status e votingMode
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
    setShouldFetch(prev => prev + 1);
  }, [filters.status, filters.votingMode]);



  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      votingMode: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
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

  const handleViewSession = (sessionId: string) => {
    router.push(`/dashboard/sessions/${sessionId}`);
  };

  const handleEditSession = (sessionId: string) => {
    router.push(`/dashboard/sessions/${sessionId}/edit`);
  };

  const handleCreateSession = () => {
    router.push('/dashboard/sessions/new');
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



  console.log('Estado atual:', { sessions: sessions.length, loading, error });
  
  return (
    <div>
      <div className="mb-8">
        <PageHeader
          title={t('sessions.title')}
          subtitle={t('sessions.description')}
          iconText="S"
          iconBg="#F59E0B"
          primaryAction={{ label: t('sessions.new'), onClick: handleCreateSession }}
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                {t('filters.search')}
              </label>
              <input
                type="text"
                id="search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder={t('filters.searchPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                {t('filters.status')}
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('filters.allStatuses')}</option>
                <option value="ACTIVE">{t('status.active')}</option>
                <option value="COMPLETED">{t('status.completed')}</option>
                <option value="ARCHIVED">{t('status.archived')}</option>
              </select>
            </div>

            {/* Voting Mode Filter */}
            <div className="sm:w-48">
              <label htmlFor="votingMode" className="block text-sm font-medium text-gray-700 mb-1">
                {t('filters.votingMode')}
              </label>
              <select
                id="votingMode"
                value={filters.votingMode}
                onChange={(e) => handleFilterChange('votingMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('filters.allModes')}</option>
                <option value="FIBONACCI">{t('votingMode.fibonacci')}</option>
                <option value="TSHIRT">{t('votingMode.tshirt')}</option>
                <option value="LINEAR">{t('votingMode.linear')}</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('filters.clear')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        {sessions.length === 0 ? (
          <div className="p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('sessions.noSessions')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('sessions.createFirst')}</p>
            <div className="mt-6">
              <button
                onClick={handleCreateSession}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('sessions.createSession')}
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('sessions.title')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('session.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('session.votingMode')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('session.participants')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('session.tickets')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('session.createdBy')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('session.createdAt')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">{t('loading.sessions')}</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      {t('sessions.noSessions')}
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <button
                          onClick={() => handleViewSession(session.id)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {session.name}
                        </button>
                        {session.description && (
                          <div className="text-sm text-gray-500">
                            {session.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                        {getStatusText(session.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getVotingModeText(session.votingMode)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session._count.participants}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session._count.tickets}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.createdBy.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(session.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {session.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleEditSession(session.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          {t('sessions.edit')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {t('pagination.showing', {
              from: ((pagination.page - 1) * pagination.limit) + 1,
              to: Math.min(pagination.page * pagination.limit, pagination.total),
              total: pagination.total
            })}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('pagination.previous')}
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('pagination.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}