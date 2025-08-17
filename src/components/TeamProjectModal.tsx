'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import "@/i18n/index";
import { useAuth } from '@/lib/hooks/useAuth';

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
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

interface TeamProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
}

export default function TeamProjectModal({ isOpen, onClose, teamId, teamName }: TeamProjectModalProps) {
  const { t } = useTranslation("teams");
  const { apiService } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchTeamProjects();
      fetchAvailableProjects();
    }
  }, [isOpen, teamId]);

  const fetchTeamProjects = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/api/teams/${teamId}/projects`);
      
      if (response.success && response.data) {
        setProjects((response.data as { projects: Project[] }).projects || []);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos do time:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProjects = async () => {
    try {
      const response = await apiService.get('/api/projects');
      
      if (response.success && response.data) {
        const allProjects = (response.data as { projects: Project[] }).projects || [];
        // Filtrar projetos que não estão associados ao time
        const teamProjectIds = projects.map(p => p.id);
        const available = allProjects.filter((p: Project) => !teamProjectIds.includes(p.id));
        setAvailableProjects(available);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos disponíveis:', error);
    }
  };

  const handleAssociateProject = async () => {
    if (!selectedProjectId) return;

    try {
      setLoading(true);
      const response = await apiService.post(`/api/teams/${teamId}/projects`, {
        projectId: selectedProjectId
      });

      if (response.success) {
        setSelectedProjectId('');
        fetchTeamProjects();
        fetchAvailableProjects();
      }
    } catch (error) {
      console.error('Erro ao associar projeto:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisassociateProject = async (projectId: string) => {
    try {
      setLoading(true);
      const response = await apiService.delete(`/api/teams/${teamId}/projects?projectId=${projectId}`);

      if (response.success) {
        fetchTeamProjects();
        fetchAvailableProjects();
      }
    } catch (error) {
      console.error('Erro ao desassociar projeto:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAvailableProjects = availableProjects.filter(project =>
    project.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('teams.projects.title')} - {teamName}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('teams.projects.description')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-96">
          {/* Projetos Associados */}
          <div className="flex-1 p-6 border-r border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('teams.projects.associated')} ({projects.length})
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">{t('teams.projects.noAssociated')}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color || '#3B82F6' }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-sm text-gray-500">
                          {project._count.sessions} {t('teams.projects.sessions')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDisassociateProject(project.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      {t('teams.projects.remove')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Adicionar Projeto */}
          <div className="flex-1 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('teams.projects.addNew')}
            </h3>
            
            <div className="space-y-4">
              {/* Busca */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('teams.projects.search')}
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('teams.projects.searchPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Lista de Projetos Disponíveis */}
              <div className="max-h-48 overflow-y-auto">
                {filteredAvailableProjects.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {search ? t('teams.projects.noResults') : t('teams.projects.noAvailable')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredAvailableProjects.map((project) => (
                      <div
                        key={project.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedProjectId === project.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: project.color || '#3B82F6' }}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{project.name}</p>
                            <p className="text-sm text-gray-500">
                              {project._count.sessions} {t('teams.projects.sessions')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botão Adicionar */}
              <button
                onClick={handleAssociateProject}
                disabled={!selectedProjectId || loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? t('teams.projects.adding') : t('teams.projects.add')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 