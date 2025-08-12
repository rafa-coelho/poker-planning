'use client';

import "@/i18n/index";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface Project {
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
    sessions: number;
  };
}

interface ProjectsResponse {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function ProjectsPage() {
  const { t } = useTranslation("dashboard");
  const router = useRouter();
  const { apiService } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
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
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    isActive: true,
    teamIds: [] as string[]
  });
  const [submitting, setSubmitting] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);

  useEffect(() => {
    fetchProjects();
  }, [pagination.page, search, statusFilter]);

  useEffect(() => {
    if (showCreateModal || editingProject) {
      fetchAvailableTeams();
    }
  }, [showCreateModal, editingProject]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (search) params.append('search', search);
      if (statusFilter) params.append('isActive', statusFilter);

      const response = await apiService.get(`/api/projects?${params.toString()}`);
      
      if (response.success && response.data) {
        const data = response.data as ProjectsResponse;
        setProjects(data.projects);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTeams = async () => {
    try {
      const response = await apiService.get('/api/teams');
      if (response.success && response.data) {
        setAvailableTeams((response.data as any).teams || []);
      }
    } catch (error) {
      console.error('Erro ao carregar times:', error);
    }
  };

  const handleCreateProject = async () => {
    try {
      setSubmitting(true);
      
      const { teamIds, ...projectData } = formData;
      const response = await apiService.post('/api/projects', projectData);
      
      if (response.success && response.data) {
        const projectId = (response.data as any).project?.id;
        
        // Associar times ao projeto
        if (teamIds.length > 0) {
          for (const teamId of teamIds) {
            await apiService.post(`/api/projects/${projectId}/teams`, { teamId });
          }
        }
        
        setShowCreateModal(false);
        setFormData({ name: '', description: '', color: '#3B82F6', isActive: true, teamIds: [] });
        fetchProjects();
      } else {
        console.error('Erro ao criar projeto:', response.error);
      }
    } catch (err) {
      console.error('Erro ao criar projeto:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;

    try {
      setSubmitting(true);
      
      const { teamIds, ...projectData } = formData;
      const response = await apiService.patch(`/api/projects/${editingProject.id}`, projectData);
      
      if (response.success) {
        // Primeiro, obter times atuais do projeto
        const currentTeamsResponse = await apiService.get(`/api/projects/${editingProject.id}/teams`);
        const currentTeamIds = currentTeamsResponse.success ? 
          ((currentTeamsResponse.data as any)?.teams || []).map((t: any) => t.id) : [];
        
        // Remover times que não estão mais selecionados
        for (const teamId of currentTeamIds) {
          if (!teamIds.includes(teamId)) {
            await apiService.delete(`/api/projects/${editingProject.id}/teams?teamId=${teamId}`);
          }
        }
        
        // Adicionar novos times
        for (const teamId of teamIds) {
          if (!currentTeamIds.includes(teamId)) {
            await apiService.post(`/api/projects/${editingProject.id}/teams`, { teamId });
          }
        }
        
        setEditingProject(null);
        setFormData({ name: '', description: '', color: '#3B82F6', isActive: true, teamIds: [] });
        fetchProjects();
      } else {
        console.error('Erro ao atualizar projeto:', response.error);
      }
    } catch (err) {
      console.error('Erro ao atualizar projeto:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm(t('projects.actions.confirmDelete'))) return;

    try {
      const response = await apiService.delete(`/api/projects/${projectId}`);
      
      if (response.success) {
        fetchProjects();
      } else {
        console.error('Erro ao desativar projeto:', response.error);
      }
    } catch (err) {
      console.error('Erro ao desativar projeto:', err);
    }
  };

  const handleEditProject = async (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color || '#3B82F6',
      isActive: project.isActive,
      teamIds: []
    });

    // Carregar times do projeto
    try {
      const response = await apiService.get(`/api/projects/${project.id}/teams`);
      if (response.success && response.data) {
        const projectTeamIds = ((response.data as any)?.teams || []).map((team: any) => team.id);
        setFormData(prev => ({ ...prev, teamIds: projectTeamIds }));
      }
    } catch (error) {
      console.error('Erro ao carregar times do projeto:', error);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const getStatusLabel = (isActive: boolean) => {
    return t(`projects.status.${isActive ? 'active' : 'inactive'}`);
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getProjectColor = (color: string | null) => {
    return color || '#3B82F6';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('projects.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('projects.description')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t('projects.new')}
        </button>
      </div>

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
              placeholder={t('projects.searchPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('projects.table.status')}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('projects.filters.allStatuses')}</option>
              <option value="true">{t('projects.filters.active')}</option>
              <option value="false">{t('projects.filters.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Carregando projetos...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('projects.noProjects')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('projects.createFirst')}</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('projects.createProject')}
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
                      {t('projects.table.name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('projects.table.description')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('projects.table.members')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('projects.table.sessions')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('projects.table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('projects.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div 
                              className="h-10 w-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getProjectColor(project.color) }}
                            >
                              <span className="text-sm font-medium text-white">
                                {project.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <button
                              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                            >
                              {project.name}
                            </button>
                            <div className="text-sm text-gray-500">Criado por {project.createdBy.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project._count.members} {project._count.members === 1 ? 'membro' : 'membros'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project._count.sessions} {project._count.sessions === 1 ? 'sessão' : 'sessões'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.isActive)}`}>
                          {getStatusLabel(project.isActive)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditProject(project)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {t('projects.actions.edit')}
                          </button>
                          {project.isActive && (
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              {t('projects.actions.delete')}
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
      {(showCreateModal || editingProject) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingProject ? t('projects.edit') : t('projects.new')}
              </h3>
              
              <form onSubmit={(e) => { e.preventDefault(); editingProject ? handleUpdateProject() : handleCreateProject(); }}>
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('projects.form.name')}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('projects.form.namePlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('projects.form.description')}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('projects.form.descriptionPlaceholder')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('projects.form.color')}
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
                        placeholder={t('projects.form.colorPlaceholder')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Teams */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('projects.form.teams')}
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {availableTeams.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('projects.form.noTeams')}</p>
                      ) : (
                        availableTeams.map((team) => (
                          <div key={team.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`team-${team.id}`}
                              checked={formData.teamIds.includes(team.id)}
                              onChange={(e) => {
                                const teamIds = e.target.checked
                                  ? [...formData.teamIds, team.id]
                                  : formData.teamIds.filter(id => id !== team.id);
                                setFormData({ ...formData, teamIds });
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`team-${team.id}`} className="ml-2 text-sm text-gray-900 flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: team.color || '#3B82F6' }}
                              />
                              {team.name}
                            </label>
                          </div>
                        ))
                      )}
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
                      {t('projects.form.isActive')}
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingProject(null);
                      setFormData({ name: '', description: '', color: '#3B82F6', isActive: true, teamIds: [] });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {t('projects.form.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {submitting 
                      ? (editingProject ? t('projects.form.updating') : t('projects.form.creating'))
                      : (editingProject ? t('projects.form.update') : t('projects.form.create'))
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 