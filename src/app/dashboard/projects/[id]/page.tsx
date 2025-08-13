'use client';

import "@/i18n/index";
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBreadcrumbs } from '@/lib/context/breadcrumbContext';
import PageHeader from '@/components/PageHeader';

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; email: string };
  _count: { members: number; sessions: number };
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
}

interface Session {
  id: string;
  name: string;
  status: string;
  votingMode: string;
  createdAt: string;
  _count: { participants: number; tickets: number };
  createdBy: { name: string };
}

export default function ProjectDetailsPage() {
  const { t } = useTranslation('dashboard');
  const params = useParams();
  const router = useRouter();
  const { apiService } = useAuth();
  const { setBreadcrumbs } = useBreadcrumbs();

  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'sessions'>('overview');
  const [showManageTeams, setShowManageTeams] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3B82F6', isActive: true });

  useEffect(() => {
    if (!projectId) return;
    fetchProject();
    fetchProjectTeams();
    fetchProjectSessions();
  }, [projectId]);

  useEffect(() => {
    if (project) {
      setBreadcrumbs([
        { name: t('breadcrumbs.dashboard'), href: '/dashboard' },
        { name: t('breadcrumbs.projects'), href: '/dashboard/projects' },
        { name: project.name, href: `/dashboard/projects/${project.id}` }
      ]);
    }
  }, [project, setBreadcrumbs, t]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const res = await apiService.get(`/api/projects/${projectId}`);
      if (res.success && res.data) {
        const p = (res.data as any).project || res.data;
        setProject(p);
        setFormData({
          name: p.name,
          description: p.description || '',
          color: p.color || '#3B82F6',
          isActive: p.isActive,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTeams = async () => {
    try {
      const res = await apiService.get(`/api/projects/${projectId}/teams`);
      if (res.success && res.data) {
        setTeams(((res.data as any).teams) || []);
      }
    } catch (e) {
      // noop
    }
  };

  // Carregar times disponíveis para associação
  useEffect(() => {
    const loadAvailable = async () => {
      if (!showManageTeams) return;
      try {
        setTeamsLoading(true);
        const params = new URLSearchParams({ limit: '100' });
        if (teamSearch) params.append('search', teamSearch);
        const res = await apiService.get(`/api/teams?${params.toString()}`);
        if (res.success && res.data) {
          const all = ((res.data as any).teams || []) as Team[];
          const associatedIds = new Set(teams.map(t => t.id));
          setAvailableTeams(all.filter(t => !associatedIds.has(t.id)));
        }
      } finally {
        setTeamsLoading(false);
      }
    };
    loadAvailable();
  }, [showManageTeams, teamSearch, teams, apiService]);

  const handleAssociateTeam = async () => {
    if (!selectedTeamId) return;
    try {
      setTeamsLoading(true);
      await apiService.post(`/api/projects/${projectId}/teams`, { teamId: selectedTeamId });
      setSelectedTeamId('');
      await fetchProjectTeams();
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    try {
      setTeamsLoading(true);
      await apiService.delete(`/api/projects/${projectId}/teams?teamId=${teamId}`);
      await fetchProjectTeams();
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setEditSubmitting(true);
      const res = await apiService.patch(`/api/projects/${projectId}`, formData);
      if (res.success) {
        setShowEditModal(false);
        await fetchProject();
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const fetchProjectSessions = async () => {
    try {
      const res = await apiService.listSessions({ projectId, limit: 20 });
      if (res.success && res.data) {
        setSessions(res.data as any);
      }
    } catch (e) {
      // noop
    }
  };

  const getStatusColor = (isActive: boolean) => (isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100');
  const getStatusLabel = (isActive: boolean) => t(`projects.status.${isActive ? 'active' : 'inactive'}`);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');
  const getSessionStatusColor = (status: string) =>
    status === 'ACTIVE' ? 'bg-green-100 text-green-800' : status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">{t('projects.errors.notFound')}</h3>
        <div className="mt-6">
          <button
            onClick={() => router.push('/dashboard/projects')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            {t('quickActions.backToList')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={project.name}
        subtitle={`${t('projects.table.createdAt')}: ${formatDate(project.createdAt)} • ${t('session.createdBy')}: ${project.createdBy.name}`}
        iconText={project.name.charAt(0)}
        iconBg={project.color || '#3B82F6'}
        badges={[
          <span key="status" className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ring-1 ring-inset ${getStatusColor(project.isActive)}`}>
            {getStatusLabel(project.isActive)}
          </span>
        ]}
        primaryAction={{
          label: t('sessions.new'),
          onClick: () => router.push(`/dashboard/sessions/new?${new URLSearchParams({ projectId: project.id }).toString()}`),
          variant: 'primary'
        }}
        menuActions={[
          { label: t('projects.actions.manageTeams') || 'Gerenciar Times', onClick: () => setShowManageTeams(true) },
          { label: t('projects.edit'), onClick: () => setShowEditModal(true) },
          { label: t('quickActions.backToList'), onClick: () => router.push('/dashboard/projects') }
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{t('projects.table.members')}</dt>
                <dd className="text-lg font-medium text-gray-900">{project._count.members}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{t('projects.table.sessions')}</dt>
                <dd className="text-lg font-medium text-gray-900">{project._count.sessions}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{t('projects.table.createdAt')}</dt>
                <dd className="text-lg font-medium text-gray-900">{formatDate(project.createdAt)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'overview', label: t('projects.view') },
              { key: 'teams', label: t('teams.title') },
              { key: 'sessions', label: t('sessions.title') },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`${activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('projects.view')}</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('projects.form.name')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{project.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('projects.table.status')}</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.isActive)}`}>
                        {getStatusLabel(project.isActive)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('projects.form.color')}</dt>
                    <dd className="mt-1 flex items-center">
                      <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: project.color || '#3B82F6' }} />
                      {project.color || '#3B82F6'}
                    </dd>
                  </div>
                  {project.description && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">{t('projects.form.description')}</dt>
                      <dd className="mt-1 text-sm text-gray-900">{project.description}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div>
              {teams.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">{t('teams.noTeams')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {teams.map((team) => (
                    <div key={team.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: team.color || '#3B82F6' }}>
                            <span className="text-white text-sm font-medium">{team.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <button
                              onClick={() => router.push(`/dashboard/teams/${team.id}`)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left truncate"
                            >
                              {team.name}
                            </button>
                            {team.description && <p className="text-sm text-gray-500">{team.description}</p>}
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button onClick={() => handleRemoveTeam(team.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                            {t('projects.members.removeMember') || t('teams.projects.remove')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div>
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">{t('sessions.noSessions')}</p>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('sessions.title')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('session.status')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('session.votingMode')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('session.participants')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('session.tickets')}</th>
                        <th className="px-6 py-3" />
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => router.push(`/dashboard/sessions/${session.id}`)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                            >
                              {session.name}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSessionStatusColor(session.status)}`}>
                              {session.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.votingMode}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session._count.participants}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session._count.tickets}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm" />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manage Teams Modal */}
      {showManageTeams && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="mt-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('projects.form.teams')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Associados */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{t('teams.projects.associated')}</h4>
                  {teamsLoading ? (
                    <div className="p-4 text-center text-sm text-gray-500">{t('common.loading')}</div>
                  ) : teams.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">{t('teams.projects.noAssociated')}</div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {teams.map((team) => (
                        <div key={team.id} className="p-3 rounded-lg border flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || '#3B82F6' }} />
                            <span className="text-sm text-gray-900">{team.name}</span>
                          </div>
                          <button onClick={() => handleRemoveTeam(team.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                            {t('teams.projects.remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Disponíveis */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{t('teams.projects.addNew')}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('teams.projects.search')}</label>
                      <input
                        type="text"
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        placeholder={t('teams.projects.searchPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {teamsLoading ? (
                        <div className="p-4 text-center text-sm text-gray-500">{t('common.loading')}</div>
                      ) : availableTeams.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">{teamSearch ? t('teams.projects.noResults') : t('teams.projects.noAvailable')}</p>
                      ) : (
                        <div className="space-y-2">
                          {availableTeams.map((team) => (
                            <div
                              key={team.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedTeamId === team.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                              onClick={() => setSelectedTeamId(team.id)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || '#3B82F6' }} />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-sm">{team.name}</p>
                                  {team.description && <p className="text-xs text-gray-500">{team.description}</p>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleAssociateTeam}
                      disabled={!selectedTeamId || teamsLoading}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {teamsLoading ? t('teams.projects.adding') : t('teams.projects.add')}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button onClick={() => setShowManageTeams(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  {t('teams.form.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && project && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('projects.edit')}</h3>
              <form onSubmit={handleUpdateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.form.name')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('projects.form.namePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.form.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('projects.form.descriptionPlaceholder')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.form.color')}</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: (e.target as HTMLInputElement).value })}
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
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">{t('projects.form.isActive')}</label>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {t('projects.form.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editSubmitting ? t('projects.form.updating') : t('projects.form.update')}
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

