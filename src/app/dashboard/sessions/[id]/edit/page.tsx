'use client';

import "@/i18n/index";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBreadcrumbs } from '@/lib/context/breadcrumbContext';
import PageHeader from '@/components/PageHeader';

interface Session {
  id: string;
  name: string;
  description?: string;
  status: string;
  votingMode: string;
  autoReveal: boolean;
  allowObservers: boolean;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
  };
}

export default function EditSessionPage() {
  const { t } = useTranslation("dashboard");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { apiService } = useAuth();
  const { setBreadcrumbs } = useBreadcrumbs();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    votingMode: 'FIBONACCI',
    autoReveal: false,
    allowObservers: true,
    projectId: '',
  });
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);

  const sessionId = params.id as string;

  const votingModes = [
    { value: 'FIBONACCI', label: t('votingModes.fibonacci') },
    { value: 'TSHIRT', label: t('votingModes.tshirt') },
    { value: 'LINEAR', label: t('votingModes.linear') },
  ];

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails();
      fetchAvailableProjects();
    }
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      setBreadcrumbs([
        { name: t('breadcrumbs.dashboard'), href: '/dashboard' },
        { name: t('breadcrumbs.sessions'), href: '/dashboard/sessions' },
        { name: session.name, href: `/dashboard/sessions/${session.id}` },
        { name: t('sessions.edit'), href: `/dashboard/sessions/${session.id}/edit` }
      ]);
    }
  }, [session, setBreadcrumbs, t]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSession(sessionId);
      
      if (response.success && response.data) {
        const sessionData = response.data;
        setSession(sessionData);
        
        setFormData({
          name: sessionData.name || '',
          description: sessionData.description || '',
          votingMode: sessionData.votingMode || 'FIBONACCI',
          autoReveal: sessionData.autoReveal || false,
          allowObservers: sessionData.allowObservers !== false,
          projectId: (sessionData as any).projectId || '',
        });
      } else {
        setError(response.error?.message || t('errors.loadSession'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProjects = async () => {
    try {
      const response = await apiService.get('/api/projects');
      if (response.success && response.data) {
        setAvailableProjects((response.data as any).projects || (response.data as any) || []);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const sessionData = {
        ...formData,
        projectId: formData.projectId || null,
      };
      
      const response = await apiService.updateSession(sessionId, sessionData);

      if (response.success && response.data) {
        // Redirecionar para a sessão editada
        router.push(`/dashboard/sessions/${sessionId}`);
      } else {
        setError(response.error?.message || t('editSession.error'));
      }
    } catch (err) {
      setError(t('editSession.serverError'));
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleCancel = () => {
    router.push(`/dashboard/sessions/${sessionId}`);
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
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">{t('errors.title')}</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title={t('sessions.edit')}
        subtitle={t('sessions.editDescription')}
      />

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome da Sessão */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('sessions.name')} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('sessions.namePlaceholder')}
            />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              {t('sessions.descriptionLabel')}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('sessions.descriptionPlaceholder')}
            />
          </div>

          {/* Modo de Votação */}
          <div>
            <label htmlFor="votingMode" className="block text-sm font-medium text-gray-700 mb-2">
              {t('sessions.votingMode')} *
            </label>
            <select
              id="votingMode"
              name="votingMode"
              value={formData.votingMode}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {votingModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>

          {/* Projeto */}
          <div>
            <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-2">
              {t('sessions.project')}
            </label>
            <select
              id="projectId"
              name="projectId"
              value={formData.projectId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('sessions.noProject')}</option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Opções */}
          <div className="space-y-4">
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
                {t('sessions.autoReveal')}
              </label>
            </div>

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
                {t('sessions.allowObservers')}
              </label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
