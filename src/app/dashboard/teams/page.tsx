'use client';

import "@/i18n/index";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import TeamProjectModal from '@/components/TeamProjectModal';
import PageHeader from '@/components/PageHeader';

interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    members: number;
    projects: number;
  };
}

interface TeamsResponse {
  teams: Team[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function TeamsPage() {
  const { t } = useTranslation("dashboard");
  const router = useRouter();
  const { apiService } = useAuth();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    fetchTeams();
  }, [pagination.page, search, statusFilter]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (search) params.append('search', search);
      if (statusFilter) params.append('isActive', statusFilter);

      const response = await apiService.get(`/api/teams?${params.toString()}`);
      
      if (response.success && response.data) {
        const data = response.data as TeamsResponse;
        setTeams(data.teams);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Erro ao carregar times:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    try {
      setSubmitting(true);
      
      const response = await apiService.post('/api/teams', formData);
      
      if (response.success) {
        setShowCreateModal(false);
        setFormData({ name: '', description: '', color: '#3B82F6', isActive: true });
        fetchTeams();
      } else {
        console.error('Erro ao criar time:', response.error);
      }
    } catch (err) {
      console.error('Erro ao criar time:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;

    try {
      setSubmitting(true);
      
      const response = await apiService.patch(`/api/teams/${editingTeam.id}`, formData);
      
      if (response.success) {
        setEditingTeam(null);
        setFormData({ name: '', description: '', color: '#3B82F6', isActive: true });
        fetchTeams();
      } else {
        console.error('Erro ao atualizar time:', response.error);
      }
    } catch (err) {
      console.error('Erro ao atualizar time:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm(t('teams.actions.confirmDelete'))) return;

    try {
      const response = await apiService.delete(`/api/teams/${teamId}`);
      
      if (response.success) {
        fetchTeams();
      } else {
        console.error('Erro ao desativar time:', response.error);
      }
    } catch (err) {
      console.error('Erro ao desativar time:', err);
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      color: team.color || '#3B82F6',
      isActive: team.isActive
    });
  };

  const handleManageProjects = (team: Team) => {
    setSelectedTeam(team);
    setShowProjectModal(true);
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const getStatusLabel = (isActive: boolean) => {
    return t(`teams.status.${isActive ? 'active' : 'inactive'}`);
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getTeamColor = (color: string | null) => {
    return color || '#3B82F6';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('teams.title')}
        subtitle={t('teams.description')}
        iconText="T"
        iconBg="#10B981"
        primaryAction={{ label: t('teams.new'), onClick: () => setShowCreateModal(true) }}
      />

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('filters.search')}
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('teams.searchPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('teams.table.status')}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('teams.filters.allStatuses')}</option>
              <option value="true">{t('teams.filters.active')}</option>
              <option value="false">{t('teams.filters.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Teams Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Carregando times...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('teams.noTeams')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('teams.createFirst')}</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('teams.createTeam')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('teams.table.name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('teams.table.description')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('teams.table.members')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('teams.table.projects')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('teams.table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('teams.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teams.map((team) => (
                    <tr key={team.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div 
                              className="h-10 w-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getTeamColor(team.color) }}
                            >
                              <span className="text-sm font-medium text-white">
                                {team.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <button
                              onClick={() => router.push(`/dashboard/teams/${team.id}`)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                            >
                              {team.name}
                            </button>
                            <div className="text-sm text-gray-500">Criado por {team.createdBy.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {team.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {team._count.members} {team._count.members === 1 ? 'membro' : 'membros'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {team._count.projects} {team._count.projects === 1 ? 'projeto' : 'projetos'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(team.isActive)}`}>
                          {getStatusLabel(team.isActive)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleManageProjects(team)}
                            className="text-green-600 hover:text-green-900"
                          >
                            {t('teams.actions.manageProjects')}
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/projects/new?${new URLSearchParams({ teamId: team.id, teamName: team.name }).toString()}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {t('teams.actions.createProject')}
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/sessions/new?${new URLSearchParams({ teamId: team.id, teamName: team.name }).toString()}`)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            {t('teams.actions.createSession')}
                          </button>
                          <button
                            onClick={() => handleEditTeam(team)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {t('teams.actions.edit')}
                          </button>
                          {team.isActive && (
                            <button
                              onClick={() => handleDeleteTeam(team.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              {t('teams.actions.delete')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('pagination.previous')}
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('pagination.next')}
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      {t('pagination.showing', {
                        from: ((pagination.page - 1) * pagination.limit) + 1,
                        to: Math.min(pagination.page * pagination.limit, pagination.total),
                        total: pagination.total
                      })}
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">{t('pagination.previous')}</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">{t('pagination.next')}</span>
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTeam) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTeam ? t('teams.edit') : t('teams.new')}
              </h3>
              
              <form onSubmit={(e) => { e.preventDefault(); editingTeam ? handleUpdateTeam() : handleCreateTeam(); }}>
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('teams.form.name')}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('teams.form.namePlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('teams.form.description')}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('teams.form.descriptionPlaceholder')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('teams.form.color')}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="h-10 w-10 rounded border border-gray-300"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder={t('teams.form.colorPlaceholder')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      {t('teams.form.isActive')}
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingTeam(null);
                      setFormData({ name: '', description: '', color: '#3B82F6', isActive: true });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {t('teams.form.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {submitting 
                      ? (editingTeam ? t('teams.form.updating') : t('teams.form.creating'))
                      : (editingTeam ? t('teams.form.update') : t('teams.form.create'))
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Team Projects Modal */}
      {showProjectModal && selectedTeam && (
        <TeamProjectModal
          isOpen={showProjectModal}
          onClose={() => {
            setShowProjectModal(false);
            setSelectedTeam(null);
          }}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
        />
      )}
    </div>
  );
} 