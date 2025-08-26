'use client';

import "@/i18n/index";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

export default function NewSessionPage() {
  const { t } = useTranslation("dashboard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apiService } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    votingMode: 'FIBONACCI',
    autoReveal: false,
    allowObservers: true,
    projectId: '',
  });
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);

  // Preselect via teamId if provided (filtra projetos do time)
  const preSelectedTeamId = searchParams.get('teamId');
  const preSelectedTeamName = searchParams.get('teamName');

  const votingModes = [
    { value: 'FIBONACCI', label: t('votingModes.fibonacci') },
    { value: 'TSHIRT', label: t('votingModes.tshirt') },
    { value: 'LINEAR', label: t('votingModes.linear') },
  ];

  useEffect(() => {
    fetchAvailableProjects();
  }, [preSelectedTeamId]);

  const fetchAvailableProjects = async () => {
    try {
      // Se vier de um time, buscar projetos associados ao time
      const endpoint = preSelectedTeamId
        ? `/api/teams/${preSelectedTeamId}/projects`
        : '/api/projects';
      const response = await apiService.get(endpoint);
      if (response.success && response.data) {
        setAvailableProjects((response.data as any).projects || (response.data as any) || []);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const sessionData = {
        ...formData,
        projectId: formData.projectId || undefined, // Se vazio, enviar undefined
      };
      
      const response = await apiService.createSession(sessionData);

      if (response.success && response.data) {
        // Redirecionar para a sessão criada
        router.push(`/dashboard/sessions/${response.data.id}`);
      } else {
        setError(response.error?.message || t('newSession.error'));
      }
    } catch (err) {
      setError(t('newSession.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
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
              {preSelectedTeamId ? t('sessions.new') + ' - ' + (preSelectedTeamName || '') : t('newSession.title')}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('newSession.description')}
            </p>
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
                    {t('newSession.error')}
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Session Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('newSession.name')}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t('newSession.namePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              {t('newSession.descriptionLabel')}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder={t('newSession.descriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Project */}
          <div>
            <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-2">
              {t('newSession.project')} <span className="text-gray-500">({t('newSession.optional')})</span>
            </label>
            {preSelectedTeamId ? (
              <div className="space-y-2">
                <div className="text-xs text-gray-500">{t('projects.form.preSelected')} {preSelectedTeamName}</div>
                <select
                  id="projectId"
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('newSession.noProject')}</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <select
                id="projectId"
                name="projectId"
                value={formData.projectId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('newSession.noProject')}</option>
                {availableProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Voting Mode */}
          <div>
            <label htmlFor="votingMode" className="block text-sm font-medium text-gray-700 mb-2">
              {t('newSession.votingMode')}
            </label>
            <select
              id="votingMode"
              name="votingMode"
              value={formData.votingMode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {votingModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          {/* Auto Reveal */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoReveal"
              name="autoReveal"
              checked={formData.autoReveal}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoReveal" className="ml-2 block text-sm text-gray-900">
              {t('newSession.autoReveal')}
            </label>
          </div>

          {/* Allow Observers */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowObservers"
              name="allowObservers"
              checked={formData.allowObservers}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="allowObservers" className="ml-2 block text-sm text-gray-900">
              {t('newSession.allowObservers')}
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('newSession.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('newSession.creating') : t('newSession.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}