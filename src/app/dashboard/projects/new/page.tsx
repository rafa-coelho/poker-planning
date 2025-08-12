'use client';

import "@/i18n/index";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBreadcrumbs } from '@/lib/context/breadcrumbContext';

export default function NewProjectPage() {
  const { t } = useTranslation("dashboard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apiService } = useAuth();
  const { setBreadcrumbs } = useBreadcrumbs();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  
  // Verificar se veio de um time específico
  const preSelectedTeamId = searchParams.get('teamId');
  const preSelectedTeamName = searchParams.get('teamName');
  const isFromTeam = !!preSelectedTeamId;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    isActive: true,
    teamIds: preSelectedTeamId ? [preSelectedTeamId] : [] as string[]
  });

  useEffect(() => {
    setBreadcrumbs([
      { name: t('breadcrumbs.dashboard'), href: '/dashboard' },
      { name: t('breadcrumbs.projects'), href: '/dashboard/projects' },
      { name: t('projects.new'), href: '/dashboard/projects/new' }
    ]);

    if (!isFromTeam) {
      fetchAvailableTeams();
    }
  }, [setBreadcrumbs, t, isFromTeam]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { teamIds, ...projectData } = formData;
      const response = await apiService.post('/api/projects', projectData);
      
      if (response.success && response.data) {
        const projectId = (response.data as any).project?.id;
        
        // Associar times ao projeto
        if (teamIds.length > 0 && projectId) {
          for (const teamId of teamIds) {
            await apiService.post(`/api/projects/${projectId}/teams`, { teamId });
          }
        }
        
        // Redirecionar de volta para o time se veio de lá
        if (isFromTeam && preSelectedTeamId) {
          router.push(`/dashboard/teams/${preSelectedTeamId}`);
        } else {
          router.push('/dashboard/projects');
        }
      } else {
        setError(response.error?.message || t('projects.errors.create'));
      }
    } catch (err) {
      setError(t('projects.errors.create'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isFromTeam ? t('projects.newForTeam', { teamName: preSelectedTeamName }) : t('projects.new')}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isFromTeam 
                  ? t('projects.newForTeamDescription', { teamName: preSelectedTeamName })
                  : t('projects.newDescription')
                }
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              {t('quickActions.cancel')}
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {t('projects.errors.create')}
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('projects.form.name')}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t('projects.form.namePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              {t('projects.form.description')}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder={t('projects.form.descriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Color */}
          <div>
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
              {t('projects.form.color')}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="color"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
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
          {isFromTeam ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('projects.form.teams')}
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2 bg-blue-500" />
                  <span className="text-sm text-gray-700">
                    {preSelectedTeamName} ({t('projects.form.preSelected')})
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
          )}

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              {t('projects.form.isActive')}
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('projects.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? t('projects.form.creating') : t('projects.form.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}