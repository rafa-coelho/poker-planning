'use client';

import "@/i18n/index";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBreadcrumbs } from '@/lib/context/breadcrumbContext';
import PageHeader from '@/components/PageHeader';
import { UserRole } from '@/lib/auth/roles';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  _count: {
    teamsAsLeader: number;
    teamsAsMember: number;
    createdProjects: number;
    createdSessions: number;
  };
}

interface UserTeam {
  id: string;
  role: string;
  joinedAt: string;
  team: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    isActive: boolean;
  };
}

export default function UserDetailsPage() {
  const { t } = useTranslation("dashboard");
  const router = useRouter();
  const params = useParams();
  const { apiService, user: currentUser } = useAuth();
  const { setBreadcrumbs } = useBreadcrumbs();
  
  const [user, setUser] = useState<User | null>(null);
  const [userTeams, setUserTeams] = useState<UserTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'activity'>('overview');
  const [showAddToTeamModal, setShowAddToTeamModal] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeamRole, setSelectedTeamRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  const userId = params.id as string;
  const isCurrentUser = currentUser?.id === userId;
  const canManageUser = currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.ADMIN;

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
      fetchUserTeams();
    }
  }, [userId]);

  useEffect(() => {
    if (user) {
      setBreadcrumbs([
        { name: t('breadcrumbs.dashboard'), href: '/dashboard' },
        { name: t('breadcrumbs.users'), href: '/dashboard/users' },
        { name: user.name, href: `/dashboard/users/${user.id}` }
      ]);
    }
  }, [user, setBreadcrumbs, t]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/api/users/${userId}`);
      
      if (response.success && response.data) {
        setUser((response.data as any).user);
      } else {
        setError(t('users.errors.loadUser'));
      }
    } catch (err) {
      setError(t('users.errors.loadUser'));
      console.error('Erro ao carregar usuário:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTeams = async () => {
    try {
      const response = await apiService.get(`/api/users/${userId}/teams`);
      if (response.success && response.data) {
        setUserTeams((response.data as any).teams || []);
      }
    } catch (error) {
      console.error('Erro ao carregar times do usuário:', error);
    }
  };

  // Carregar times disponíveis ao abrir o modal
  useEffect(() => {
    const loadTeams = async () => {
      if (!showAddToTeamModal) return;
      try {
        setTeamsLoading(true);
        const params = new URLSearchParams({ limit: '100' });
        if (teamSearch) params.append('search', teamSearch);
        const response = await apiService.get(`/api/teams?${params.toString()}`);
        if (response.success && response.data) {
          const existingIds = new Set(userTeams.map(ut => ut.team.id));
          const list = (response.data as any).teams || [];
          setAvailableTeams(list.filter((t: any) => !existingIds.has(t.id)));
        }
      } catch (error) {
        console.error('Erro ao carregar times disponíveis:', error);
      } finally {
        setTeamsLoading(false);
      }
    };
    loadTeams();
  }, [showAddToTeamModal, teamSearch, apiService, userTeams]);

  const handleConfirmAddToTeam = async () => {
    if (!selectedTeamId) return;
    try {
      setTeamsLoading(true);
      const response = await apiService.post(`/api/teams/${selectedTeamId}/members`, {
        userId: userId,
        role: selectedTeamRole,
      });
      if (response.success) {
        setShowAddToTeamModal(false);
        setSelectedTeamId('');
        setSelectedTeamRole('MEMBER');
        fetchUserTeams();
      }
    } catch (error) {
      console.error('Erro ao adicionar usuário ao time:', error);
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user || !canManageUser || isCurrentUser) return;

    const action = user.isActive ? 'deactivate' : 'activate';
    const confirmMessage = user.isActive 
      ? t('users.actions.confirmDeactivate')
      : t('users.actions.confirmActivate');

    if (!confirm(confirmMessage)) return;

    try {
      const response = await apiService.patch(`/api/users/${userId}`, {
        isActive: !user.isActive
      });

      if (response.success) {
        setUser(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
      }
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
    }
  };

  const handleResetPassword = async () => {
    if (!user || (!canManageUser && !isCurrentUser)) return;

    setResetPasswordLoading(true);

    try {
      const response = await apiService.sendUserPasswordReset(userId);
      
      if (response.success) {
        toast.success(
          isCurrentUser 
            ? t('users.messages.passwordResetSentSelf')
            : t('users.messages.passwordResetSent', { name: user.name })
        );
        setShowResetPasswordModal(false);
      } else {
        // Tratar erros específicos baseados no status HTTP
        let errorMessage = t('users.errors.passwordResetFailed');
        
        if (response.error?.message) {
          const apiError = response.error.message;
          
          // Mapear erros específicos para mensagens mais claras
          if (apiError.includes('Serviço de email não configurado')) {
            errorMessage = t('users.errors.emailServiceNotConfigured');
          } else if (apiError.includes('Usuário não encontrado')) {
            errorMessage = t('users.errors.userNotFound');
          } else if (apiError.includes('Já existe um link de recuperação válido')) {
            errorMessage = t('users.errors.resetTokenAlreadyExists');
          } else if (apiError.includes('Erro ao enviar email')) {
            errorMessage = t('users.errors.emailSendFailed');
          } else {
            errorMessage = apiError; // Usar a mensagem da API se for específica
          }
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      toast.error(t('users.errors.networkError'));
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return 'text-purple-600 bg-purple-100';
      case UserRole.ADMIN:
        return 'text-red-600 bg-red-100';
      case UserRole.MEMBER:
        return 'text-blue-600 bg-blue-100';
      case UserRole.VIEWER:
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    return t(`users.roles.${role}`);
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getStatusLabel = (isActive: boolean) => {
    return t(`users.status.${isActive ? 'active' : 'inactive'}`);
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

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">{error || t('users.errors.notFound')}</h3>
        <div className="mt-6">
          <button
            onClick={() => router.push('/dashboard/users')}
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
        title={user.name}
        subtitle={user.email}
        iconText={user.name.charAt(0)}
        iconBg={user.avatar ? undefined : '#9CA3AF'}
        primaryAction={canManageUser ? { label: t('users.actions.addToTeam'), onClick: () => setShowAddToTeamModal(true), variant: 'primary' } : undefined}
        menuActions={[
          ...(canManageUser && !isCurrentUser ? [{ label: t('users.actions.edit'), onClick: () => router.push(`/dashboard/users/${userId}/edit`) }] : []),
          ...(canManageUser || isCurrentUser ? [{ label: t('users.actions.resetPassword'), onClick: () => {
            setShowResetPasswordModal(true);
          }}] : []),
          ...(canManageUser && !isCurrentUser ? [{ label: user.isActive ? t('users.actions.deactivate') : t('users.actions.activate'), onClick: handleToggleStatus }] : []),
          { label: t('quickActions.backToList'), onClick: () => router.push('/dashboard/users') },
        ]}
      />

      {/* User Info & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {/* Role Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {t('users.form.role')}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {getRoleLabel(user.role)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Status
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {getStatusLabel(user.isActive)}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {t('users.details.totalTeams')}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {user._count.teamsAsMember + user._count.teamsAsLeader}
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
                  {t('users.details.projectsCreated')}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {user._count.createdProjects}
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
                  {t('users.details.sessionsCreated')}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {user._count.createdSessions}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {t('users.details.lastLogin')}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {user.lastLoginAt ? formatDateOnly(user.lastLoginAt) : t('users.labels.never')}
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
              { key: 'overview', label: t('users.details.tabs.overview'), icon: 'info' },
              { key: 'teams', label: t('users.details.tabs.teams'), icon: 'users' },
              { key: 'activity', label: t('users.details.tabs.activity'), icon: 'clock' },
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
                  {t('users.details.overview.personalInfo')}
                </h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('users.form.name')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('users.form.email')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('users.table.role')}</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('users.table.status')}</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.isActive)}`}>
                        {getStatusLabel(user.isActive)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('users.details.memberSince')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDateOnly(user.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('users.details.organization')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.organization.name}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('users.details.tabs.teams')} ({userTeams.length})
                </h3>
                {canManageUser && (
                  <button
                    onClick={() => setShowAddToTeamModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t('users.actions.addToTeam')}
                  </button>
                )}
              </div>
              
              {userTeams.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">{t('users.details.noTeams')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {userTeams.map((userTeam) => (
                    <div key={userTeam.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: userTeam.team.color || '#3B82F6' }}
                          >
                            <span className="text-white text-sm font-medium">
                              {userTeam.team.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {userTeam.team.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {getRoleLabel(userTeam.role as UserRole)} • {t('users.details.joinedOn')} {formatDateOnly(userTeam.joinedAt)}
                            </p>
                          </div>
                        </div>
                        {userTeam.team.description && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600 line-clamp-2">{userTeam.team.description}</p>
                          </div>
                        )}
                        {/* Removido botão "visualizar" para seguir o padrão de nome clicável nas listagens */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('users.details.activity.comingSoon')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('users.details.activity.description')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add to Team Modal */}
      {showAddToTeamModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('users.actions.addToTeam')}
              </h3>

              <div className="space-y-4">
                {/* Busca */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('filters.search')}
                  </label>
                  <input
                    type="text"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    placeholder={t('teams.searchPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Lista de times */}
                <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-md divide-y">
                  {teamsLoading ? (
                    <div className="p-4 text-center text-sm text-gray-500">{t('common.loading') || 'Carregando...'}</div>
                  ) : availableTeams.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">{t('teams.noTeams')}</div>
                  ) : (
                    availableTeams.map((team: any) => (
                      <button
                        type="button"
                        key={team.id}
                        onClick={() => setSelectedTeamId(team.id)}
                        className={`w-full text-left p-3 flex items-center justify-between hover:bg-gray-50 ${selectedTeamId === team.id ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || '#3B82F6' }} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{team.name}</p>
                            <p className="text-xs text-gray-500">{team.description || '-'}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">{t('teams.table.members')}: {team._count?.members ?? 0}</div>
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
                    value={selectedTeamRole}
                    onChange={(e) => setSelectedTeamRole(e.target.value as any)}
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
                    onClick={() => setShowAddToTeamModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {t('teams.form.cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={!selectedTeamId || teamsLoading}
                    onClick={handleConfirmAddToTeam}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {teamsLoading ? t('teams.form.saving') : t('users.actions.addToTeam')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">
                  {t('users.actions.resetPassword')}
                </h3>
              </div>
              {!resetPasswordLoading && (
                <button
                  onClick={() => setShowResetPasswordModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                {isCurrentUser 
                  ? t('users.resetPassword.confirmSelf')
                  : t('users.resetPassword.confirmOther', { name: user.name })
                }
              </p>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowResetPasswordModal(false)}
                  disabled={resetPasswordLoading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('users.form.cancel')}
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={resetPasswordLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {resetPasswordLoading && (
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {resetPasswordLoading ? t('users.actions.resettingPassword') : t('users.actions.resetPassword')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}