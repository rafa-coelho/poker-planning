'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/hooks/useAuth';
import { useBreadcrumbs } from '@/lib/context/breadcrumbContext';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { 
  Download, 
  Filter, 
  Calendar, 
  TrendingUp, 
  Users, 
  Clock, 
  Target, 
  BarChart3,
  Activity,
  FileText,
  Settings,
  Eye,
  Play
} from 'lucide-react';
import toast from 'react-hot-toast';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ReportData {
  metrics: {
    totalSessions: number;
    activeSessions: number;
    totalTickets: number;
    estimatedTickets: number;
    totalParticipants: number;
    averageConsensus: number;
    averageVotingTime: number;
  };
  charts: {
    sessionsOverTime: Array<{
      date: string;
      sessions: number;
      consensus: number;
      participants: number;
    }>;
    consensusRates: Array<{
      label: string;
      count: number;
    }>;
    participationRates: Array<{
      date: string;
      rate: number;
    }>;
  };
  period: string;
  generatedAt: string;
}

type ReportTab = 'overview' | 'sessions' | 'consensus' | 'productivity';

export default function ReportsPage() {
  const { t } = useTranslation("dashboard");
  const { user, apiService } = useAuth();
  const { setBreadcrumbs } = useBreadcrumbs();
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [filters, setFilters] = useState({
    period: '30d',
    teamId: '',
    projectId: ''
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [step, setStep] = useState<'config' | 'report'>('config');

  useEffect(() => {
    setBreadcrumbs([
      { name: t('breadcrumbs.dashboard'), href: '/dashboard' },
      { name: t('breadcrumbs.reports'), href: '/dashboard/reports' }
    ]);

    fetchProjectsAndTeams();
  }, [setBreadcrumbs, t]);

  // Filtrar projetos baseado no time selecionado
  useEffect(() => {
    console.log('Filtrando projetos:', { teamId: filters.teamId, projects, filteredProjects });
    
    if (filters.teamId) {
      // Filtrar projetos que pertencem ao time selecionado
      const teamProjects = projects.filter(project => 
        project.teams && project.teams.some((team: any) => team.id === filters.teamId)
      );
      console.log('Projetos do time:', teamProjects);
      setFilteredProjects(teamProjects);
      
      // Se o projeto selecionado não pertence ao time, limpar a seleção
      if (filters.projectId && !teamProjects.find(p => p.id === filters.projectId)) {
        setFilters(prev => ({ ...prev, projectId: '' }));
      }
    } else {
      // Se nenhum time está selecionado, mostrar todos os projetos
      setFilteredProjects(projects);
    }
  }, [filters.teamId, projects, filters.projectId]);

  const fetchProjectsAndTeams = async () => {
    try {
      const [projectsResponse, teamsResponse] = await Promise.all([
        apiService.get('/api/projects'),
        apiService.get('/api/teams')
      ]);

      if (projectsResponse.success) {
        const projectsData = projectsResponse.data as any;
        const projectsList = Array.isArray(projectsData?.projects) ? projectsData.projects : [];
        setProjects(projectsList);
        setFilteredProjects(projectsList); // Inicialmente mostrar todos os projetos
      }
      if (teamsResponse.success) {
        const teamsData = teamsResponse.data as any;
        setTeams(Array.isArray(teamsData?.teams) ? teamsData.teams : []);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos e times:', error);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        period: filters.period,
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.teamId && { teamId: filters.teamId })
      });

      const response = await apiService.get(`/api/reports?${params}`);
      
      if (response.success) {
        console.log('Dados do relatório:', response.data);
        setReportData(response.data as ReportData);
        setStep('report');
      } else {
        toast.error(t('reports.errors.loadFailed'));
      }
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast.error(t('reports.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async (type: string) => {
    try {
      const params = new URLSearchParams({
        type,
        period: filters.period,
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.teamId && { teamId: filters.teamId })
      });

      const response = await fetch(`/api/reports/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `${type}-report.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success(t('reports.messages.exportSuccess'));
      } else {
        toast.error(t('reports.errors.exportFailed'));
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error(t('reports.errors.exportFailed'));
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '7d': return t('reports.config.period7d');
      case '30d': return t('reports.config.period30d');
      case '90d': return t('reports.config.period90d');
      case '1y': return t('reports.config.period1y');
      default: return t('reports.config.period30d');
    }
  };

  // Tela de configuração de filtros
  if (step === 'config') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
                <p className="text-gray-600 mt-1">{t('reports.description')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo de Configuração */}
        <div className="px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t('reports.config.title')}
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                {t('reports.config.description')}
              </p>
            </div>
            
            {/* Filtros */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.config.filtersTitle')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Período */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('reports.config.periodLabel')}
                  </label>
                  <select
                    value={filters.period}
                    onChange={(e) => handleFilterChange('period', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="7d">{t('reports.config.period7d')}</option>
                    <option value="30d">{t('reports.config.period30d')}</option>
                    <option value="90d">{t('reports.config.period90d')}</option>
                    <option value="1y">{t('reports.config.period1y')}</option>
                  </select>
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('reports.config.teamLabel')}
                  </label>
                  <select
                    value={filters.teamId}
                    onChange={(e) => handleFilterChange('teamId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('reports.config.allTeams')}</option>
                    {Array.isArray(teams) && teams.map((team: any) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Projeto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('reports.config.projectLabel')}
                  </label>
                  <select
                    value={filters.projectId}
                    onChange={(e) => handleFilterChange('projectId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!!(filters.teamId && filteredProjects.length === 0)}
                  >
                    <option value="">
                      {filters.teamId && filteredProjects.length === 0 
                        ? t('reports.config.noProjectsForTeam')
                        : t('reports.config.allProjects')
                      }
                    </option>
                    {Array.isArray(filteredProjects) && filteredProjects.map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resumo dos Filtros */}
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('reports.config.summaryTitle')}:</h4>
                <div className="text-sm text-gray-600">
                  <p>• {t('reports.config.period')}: {getPeriodLabel(filters.period)}</p>
                  {filters.teamId && (
                    <p>• {t('reports.config.team')}: {teams.find(t => t.id === filters.teamId)?.name}</p>
                  )}
                  {filters.projectId && (
                    <p>• {t('reports.config.project')}: {filteredProjects.find(p => p.id === filters.projectId)?.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tipos de Análise */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <Calendar className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{t('reports.config.analysisTypes.temporal.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('reports.config.analysisTypes.temporal.description')}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <Target className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{t('reports.config.analysisTypes.consensus.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('reports.config.analysisTypes.consensus.description')}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <Activity className="h-8 w-8 text-purple-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">{t('reports.config.analysisTypes.productivity.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('reports.config.analysisTypes.productivity.description')}
                </p>
              </div>
            </div>

            {/* Botão Gerar Relatório */}
            <div className="text-center">
              <button
                onClick={fetchReportData}
                disabled={loading}
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {t('reports.config.generatingReport')}
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    {t('reports.config.generateReport')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela de relatórios com dados
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
              <p className="text-gray-600 mt-1">
                {getPeriodLabel(filters.period)}
                {filters.projectId && ` • ${projects.find(p => p.id === filters.projectId)?.name || 'Projeto'}`}
                {filters.teamId && ` • ${teams.find(t => t.id === filters.teamId)?.name || 'Time'}`}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setStep('config')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="h-4 w-4 mr-2" />
                {t('reports.config.newAnalysis')}
              </button>
              <div className="relative">
                <button
                  onClick={() => handleExport('sessions')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('reports.config.export')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo do Relatório */}
      {reportData && (
        <div className="px-6 py-6">
          {/* Abas */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: t('reports.tabs.overview'), icon: BarChart3 },
                { id: 'sessions', label: t('reports.tabs.sessions'), icon: Calendar },
                { id: 'consensus', label: t('reports.tabs.consensus'), icon: Target },
                { id: 'productivity', label: t('reports.tabs.productivity'), icon: Activity }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ReportTab)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Conteúdo das Abas */}
          {activeTab === 'overview' && (
            <OverviewTab reportData={reportData} />
          )}
          
          {activeTab === 'sessions' && (
            <SessionsTab reportData={reportData} />
          )}
          
          {activeTab === 'consensus' && (
            <ConsensusTab reportData={reportData} />
          )}
          
          {activeTab === 'productivity' && (
            <ProductivityTab reportData={reportData} />
          )}
        </div>
      )}

      {/* Sem dados */}
      {!reportData && (
        <div className="px-6 py-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('reports.noDataFound')}</h3>
          <p className="text-gray-600">
            {t('reports.noDataDescription')}
          </p>
        </div>
      )}
    </div>
  );
}

// Componente da aba Visão Geral
function OverviewTab({ reportData }: { reportData: ReportData }) {
  const { t } = useTranslation("dashboard");

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title={t('reports.overview.totalSessionsTitle')}
          value={reportData.metrics.totalSessions}
          icon={Calendar}
          color="blue"
        />
        <MetricCard
          title={t('reports.overview.activeSessionsTitle')}
          value={reportData.metrics.activeSessions}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title={t('reports.overview.estimatedTicketsTitle')}
          value={reportData.metrics.estimatedTickets}
          icon={Target}
          color="purple"
        />
        <MetricCard
          title={t('reports.overview.totalParticipantsTitle')}
          value={reportData.metrics.totalParticipants}
          icon={Users}
          color="orange"
        />
      </div>

      {/* Gráfico de Sessões ao Longo do Tempo */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.overview.sessionsOverTimeTitle')}</h3>
        <div className="h-64">
          {reportData.charts.sessionsOverTime.length > 0 ? (
            <Line
              data={{
                labels: reportData.charts.sessionsOverTime.map(item => 
                  new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                ),
                datasets: [
                  {
                    label: t('reports.overview.sessionsLabel'),
                    data: reportData.charts.sessionsOverTime.map(item => item.sessions),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>{t('reports.overview.noDataAvailable')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente da aba Sessões
function SessionsTab({ reportData }: { reportData: ReportData }) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.sessions.summaryTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{reportData.metrics.totalSessions}</div>
            <div className="text-sm text-gray-600">{t('reports.sessions.totalSessionsLabel')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{reportData.metrics.activeSessions}</div>
            <div className="text-sm text-gray-600">{t('reports.sessions.activeSessionsLabel')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{reportData.metrics.totalTickets}</div>
            <div className="text-sm text-gray-600">{t('reports.sessions.totalTicketsLabel')}</div>
          </div>
        </div>
      </div>

      {/* Gráfico de Participação */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.sessions.participationTitle')}</h3>
        <div className="h-64">
          {reportData.charts.sessionsOverTime.length > 0 ? (
            <Bar
              data={{
                labels: reportData.charts.sessionsOverTime.map(item => 
                  new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                ),
                datasets: [
                  {
                    label: t('reports.sessions.participantsLabel'),
                    data: reportData.charts.sessionsOverTime.map(item => item.participants),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)'
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>{t('reports.sessions.noDataAvailable')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente da aba Consenso
function ConsensusTab({ reportData }: { reportData: ReportData }) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.consensus.qualityTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {(reportData.metrics.averageConsensus * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">{t('reports.consensus.averageConsensusLabel')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {reportData.metrics.estimatedTickets}
            </div>
            <div className="text-sm text-gray-600">{t('reports.consensus.estimatedTicketsLabel')}</div>
          </div>
        </div>
      </div>

      {/* Gráfico de Distribuição do Consenso */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.consensus.distributionTitle')}</h3>
        <div className="h-64">
          {reportData.charts.consensusRates.length > 0 ? (
            <Doughnut
              data={{
                labels: reportData.charts.consensusRates.map(item => item.label),
                datasets: [
                  {
                    data: reportData.charts.consensusRates.map(item => item.count),
                    backgroundColor: [
                      'rgba(239, 68, 68, 0.8)',
                      'rgba(245, 158, 11, 0.8)',
                      'rgba(59, 130, 246, 0.8)',
                      'rgba(34, 197, 94, 0.8)'
                    ]
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Target className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>{t('reports.consensus.noDataAvailable')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente da aba Produtividade
function ProductivityTab({ reportData }: { reportData: ReportData }) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.productivity.metricsTitle')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {reportData.metrics.averageVotingTime.toFixed(1)} {t('reports.productivity.averageVotingTimeLabel')}
            </div>
            <div className="text-sm text-gray-600">{t('reports.productivity.averageVotingTimeDesc')}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {reportData.metrics.totalTickets > 0 
                ? (reportData.metrics.estimatedTickets / reportData.metrics.totalTickets * 100).toFixed(1)
                : 0
              }%
            </div>
            <div className="text-sm text-gray-600">{t('reports.productivity.completionRateLabel')}</div>
          </div>
        </div>
      </div>

      {/* Gráfico de Taxa de Participação */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.productivity.participationRateTitle')}</h3>
        <div className="h-64">
          {reportData.charts.participationRates.length > 0 ? (
            <Line
              data={{
                labels: reportData.charts.participationRates.map(item => 
                  new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                ),
                datasets: [
                  {
                    label: t('reports.productivity.participationRateLabel'),
                    data: reportData.charts.participationRates.map(item => item.rate),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 1,
                    ticks: {
                      callback: function(value) {
                        return (Number(value) * 100).toFixed(0) + '%';
                      }
                    }
                  }
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>{t('reports.productivity.noDataAvailable')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de Card de Métrica
function MetricCard({ title, value, icon: Icon, color }: { 
  title: string; 
  value: number; 
  icon: any; 
  color: string; 
}) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className={`h-8 w-8 ${colorClasses[color as keyof typeof colorClasses]}`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
} 