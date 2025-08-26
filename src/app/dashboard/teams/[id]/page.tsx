'use client';

import "@/i18n/index";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBreadcrumbs } from '@/lib/context/breadcrumbContext';
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

interface TeamMember {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    members: number;
    sessions: number;
  };
}

export default function TeamDetailsPage() {
  const { t } = useTranslation("dashboard");
  const router = useRouter();
  const params = useParams();
  const { apiService } = useAuth();
  const { setBreadcrumbs } = useBreadcrumbs();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'projects'>('overview');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserRole, setSelectedUserRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [canManageMembers, setCanManageMembers] = useState<boolean>(false);

  const teamId = params.id as string;

  useEffect(() => {
    if (teamId) {
      fetchTeamDetails();
      fetchTeamMembers();
      fetchTeamProjects();
    }
  }, [teamId]);

  useEffect(() => {
    // simples verificação por role para exibir ações (admins)
    try {
      const role = (localStorage.getItem('userRole') || '').toUpperCase();
      setCanManageMembers(role === 'SUPER_ADMIN' || role === 'ADMIN');
    } catch {}
  }, []);

  useEffect(() => {
    if (team) {
      setBreadcrumbs([
        { name: t('breadcrumbs.dashboard'), href: '/dashboard' },
        { name: t('breadcrumbs.teams'), href: '/dashboard/teams' },
        { name: team.name, href: `/dashboard/teams/${team.id}` }
      ]);
    }
  }, [team, setBreadcrumbs, t]);

  const fetchTeamDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/api/teams/${teamId}`);
      
      if (response.success && response.data) {
        setTeam((response.data as any).team);
      } else {
        setError(t('teams.errors.loadTeam'));
      }
    } catch (err) {
      setError(t('teams.errors.loadTeam'));
      console.error('Erro ao carregar time:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await apiService.get(`/api/teams/${teamId}/members`);
      if (response.success && response.data) {
        setMembers((response.data as any).members || []);
      }
    } catch (error) {
      console.error('Erro ao carregar membros do time:', error);
    }
  };

  const fetchTeamProjects = async () => {
    try {
      const response = await apiService.get(`/api/teams/${teamId}/projects`);
      if (response.success && response.data) {
        setProjects((response.data as any).projects || []);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos do time:', error);
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getStatusLabel = (isActive: boolean) => {
    return t(`teams.status.${isActive ? 'active' : 'inactive'}`);
  };

  const getRoleLabel = (role: string) => {
    return t(`teams.members.roles.${role}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handleCreateProject = () => {
    // Redirecionar para criação de projeto com time pré-selecionado
    const params = new URLSearchParams({
      teamId: teamId,
      teamName: team?.name || ''
    });
    router.push(`/dashboard/projects/new?${params.toString()}`);
  };

  const handleCreateSession = () => {
    // Redirecionar para criação de sessão com time pré-selecionado
    const params = new URLSearchParams({
      teamId: teamId,
      teamName: team?.name || ''
    });
    router.push(`/dashboard/sessions/new?${params.toString()}`);
  };

  const handleAddUser = () => {
    setShowAddUserModal(true);
  };

  // Carregar usuários disponíveis quando o modal abrir ou ao buscar
  useEffect(() => {
    const loadUsers = async () => {
      if (!showAddUserModal) return;
      try {
        setUsersLoading(true);
        const params = new URLSearchParams({ limit: '100', isActive: 'true' });
        if (userSearch) params.append('search', userSearch);
        const response = await apiService.get(`/api/users?${params.toString()}`);
        if (response.success && response.data) {
          const existingIds = new Set(members.map(m => m.user.id));
          const list = (response.data as any).users || [];
          setAvailableUsers(list.filter((u: any) => !existingIds.has(u.id)));
        }
      } catch (error) {
        console.error('Erro ao carregar usuários disponíveis:', error);
      } finally {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, [showAddUserModal, userSearch, members, apiService]);

  const handleConfirmAddUser = async () => {
    if (!selectedUserId) return;
    try {
      setUsersLoading(true);
      const response = await apiService.post(`/api/teams/${teamId}/members`, {
        userId: selectedUserId,
        role: selectedUserRole,
      });
      if (response.success) {
        setShowAddUserModal(false);
        setSelectedUserId('');
        setSelectedUserRole('MEMBER');
        fetchTeamMembers();
      }
    } catch (error) {
      console.error('Erro ao adicionar usuário ao time:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">{error || t('teams.errors.notFound')}</h3>
        <div className="mt-6">
          <button
            onClick={() => router.push('/dashboard/teams')}
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
      <PageHeader
        title={team.name}
        subtitle={`${t('teams.table.createdAt')}: ${formatDate(team.createdAt)} • ${t('teams.table.createdBy')}: ${team.createdBy.name}`}
        iconText={team.name.charAt(0)}
        iconBg={team.color || '#3B82F6'}
        badges={[
          <span key="status" className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(team.isActive)}`}>
            {getStatusLabel(team.isActive)}
          </span>
        ]}
        primaryAction={{
          label: t('teams.actions.createSession'),
          onClick: handleCreateSession,
        }}
        menuActions={[
          { label: t('teams.actions.createProject'), onClick: handleCreateProject },
          ...(canManageMembers ? [{ label: t('teams.actions.addUser'), onClick: handleAddUser }] : []),
          { label: t('quickActions.backToList'), onClick: () => router.push('/dashboard/teams') },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {t('teams.table.members')}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {team._count.members}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {t('teams.table.projects')}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {team._count.projects}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {t('teams.details.createdAt')}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {formatDate(team.createdAt)}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'overview', label: t('teams.details.tabs.overview'), icon: 'info' },
              { key: 'members', label: t('teams.details.tabs.members'), icon: 'users' },
              { key: 'projects', label: t('teams.details.tabs.projects'), icon: 'folder' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {t('teams.details.overview.info')}
                </h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('teams.form.name')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{team.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('teams.table.status')}</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(team.isActive)}`}>
                        {getStatusLabel(team.isActive)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('teams.form.color')}</dt>
                    <dd className="mt-1 flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: team.color || '#3B82F6' }}
                      />
                      {team.color || '#3B82F6'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('teams.details.createdBy')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{team.createdBy.name}</dd>
                  </div>
                  {team.description && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">{t('teams.form.description')}</dt>
                      <dd className="mt-1 text-sm text-gray-900">{team.description}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('teams.members.title')} ({members.length})
                </h3>
              </div>
              
              {members.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">{t('teams.members.noMembers')}</p>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('users.table.name')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('users.table.email')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('teams.members.role')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('teams.members.joinedAt')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {member.user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{member.user.name}</div>
                                <div className="text-sm text-gray-500">{getRoleLabel(member.user.role)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {member.user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {getRoleLabel(member.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(member.joinedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('teams.projects.title')} ({projects.length})
                </h3>
              </div>
              
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">{t('teams.projects.noAssociated')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                         onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: project.color || '#3B82F6' }}
                          >
                            <span className="text-white text-sm font-medium">
                              {project.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {project.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {project._count.sessions} {t('teams.projects.sessions')}
                            </p>
                          </div>
                        </div>
                        {project.description && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('teams.members.addMember')}
              </h3>

              <div className="space-y-4">
                {/* Busca */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('filters.search')}
                  </label>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={t('filters.searchPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Lista de usuários */}
                <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-md divide-y">
                  {usersLoading ? (
                    <div className="p-4 text-center text-sm text-gray-500">{t('common.loading') || 'Carregando...'}</div>
                  ) : availableUsers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">{t('users.noUsers')}</div>
                  ) : (
                    availableUsers.map((u: any) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className={`w-full text-left p-3 flex items-center justify-between hover:bg-gray-50 ${selectedUserId === u.id ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-700">{u.name?.charAt(0)?.toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">{t(`users.roles.${u.role}`)}</div>
                      </button>
                    ))
                  )}
                </div>

                {/* Role no time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('teams.members.role')}
                  </label>
                  <select
                    value={selectedUserRole}
                    onChange={(e) => setSelectedUserRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ADMIN">{t('teams.members.roles.ADMIN')}</option>
                    <option value="MEMBER">{t('teams.members.roles.MEMBER')}</option>
                    <option value="VIEWER">{t('teams.members.roles.VIEWER')}</option>
                  </select>
                </div>

                {/* Ações */}
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {t('teams.form.cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={!selectedUserId || usersLoading}
                    onClick={handleConfirmAddUser}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {usersLoading ? t('teams.form.saving') : t('teams.members.addMember')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal Adicionar Usuário ao Time
/* Render modal after component to keep file cohesion */