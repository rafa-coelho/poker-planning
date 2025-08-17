import React, { Suspense, lazy } from 'react'
import { OptimizedLoading } from './OptimizedComponents'
import { useTranslation } from 'react-i18next'

// 🚀 Lazy Loading Components
// Componentes pesados carregados sob demanda

// Dashboard components
export const LazyDashboard = lazy(() => import('../app/dashboard/page'))
export const LazySessionsPage = lazy(() => import('../app/dashboard/sessions/page'))
export const LazyProjectsPage = lazy(() => import('../app/dashboard/projects/page'))
export const LazyTeamsPage = lazy(() => import('../app/dashboard/teams/page'))

// Session components
export const LazyTicketManager = lazy(() => import('./TicketManager'))
export const LazyVoteSummary = lazy(() => import('./VoteSummary'))

// 🎯 Suspense Wrapper Component
interface SuspenseWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  loadingText?: string
}

export const SuspenseWrapper: React.FC<SuspenseWrapperProps> = ({
  children,
  fallback,
  loadingText
}) => {
  const { t } = useTranslation("common")
  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <OptimizedLoading text={loadingText || t('loading')} />
    </div>
  )

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  )
}

// 🚀 Route-based Lazy Loading
export const LazyRoute = {
  Dashboard: () => {
    const { t } = useTranslation("dashboard")
    return (
      <SuspenseWrapper loadingText={t('dashboard.loading')}>
        <LazyDashboard />
      </SuspenseWrapper>
    )
  },
  
  Sessions: () => {
    const { t } = useTranslation("sessions")
    return (
      <SuspenseWrapper loadingText={t('sessions.loading')}>
        <LazySessionsPage />
      </SuspenseWrapper>
    )
  },
  
  Projects: () => {
    const { t } = useTranslation("projects")
    return (
      <SuspenseWrapper loadingText={t('projects.loading')}>
        <LazyProjectsPage />
      </SuspenseWrapper>
    )
  },
  
  Teams: () => {
    const { t } = useTranslation("teams")
    return (
      <SuspenseWrapper loadingText={t('teams.loading')}>
        <LazyTeamsPage />
      </SuspenseWrapper>
    )
  }
}

// 🚀 Feature-based Lazy Loading
export const LazyFeature = {
  TicketManager: (props: { sessionId: string; isCreator: boolean; onTicketSelect: (ticket: { id: string; title: string; description: string | null; sessionId: string; status: string; priority: string; finalEstimate: string | null; createdAt: Date; updatedAt: Date; }) => void; [key: string]: unknown }) => {
    const { t } = useTranslation("tickets")
    return (
      <SuspenseWrapper loadingText={t('tickets.loading')}>
        <LazyTicketManager {...props} />
      </SuspenseWrapper>
    )
  },
  
  VoteSummary: (props: { votes: string[]; [key: string]: unknown }) => {
    const { t } = useTranslation("votes")
    return (
      <SuspenseWrapper loadingText={t('votes.loading')}>
        <LazyVoteSummary {...props} />
      </SuspenseWrapper>
    )
  }
}

// 🎯 Error Boundary para Lazy Components
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      return (
        <div className="flex items-center justify-center p-8 text-red-600">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">
              Erro ao carregar componente
            </div>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 🚀 Hook para preload de componentes
export function usePreloadComponent(componentLoader: () => Promise<unknown>) {
  const preload = React.useCallback(() => {
    componentLoader()
  }, [componentLoader])

  return preload
}

// 🚀 Hook para lazy loading com retry
export function useLazyWithRetry<T>(
  loader: () => Promise<{ default: T }>,
  maxRetries: number = 3
) {
  const [Component, setComponent] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)
  const retryCount = React.useRef(0)

  const loadComponent = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const module = await loader()
      setComponent(() => module.default)
      retryCount.current = 0
    } catch (err) {
      setError(err as Error)
      
      if (retryCount.current < maxRetries) {
        retryCount.current++
        setTimeout(loadComponent, 1000 * retryCount.current) // Backoff exponencial
      }
    } finally {
      setLoading(false)
    }
  }, [loader, maxRetries])

  React.useEffect(() => {
    loadComponent()
  }, [loadComponent])

  return { Component, loading, error, retry: loadComponent }
}

// 🎯 Componente de loading otimizado para lazy loading
export const LazyLoadingSpinner: React.FC<{ text?: string }> = ({ text }) => {
  const { t } = useTranslation("common")
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
      {text && (
        <div className="text-sm text-gray-600 animate-pulse">
          {text}
        </div>
      )}
    </div>
  )
}

const lazyComponents = {
  SuspenseWrapper,
  LazyRoute,
  LazyFeature,
  LazyErrorBoundary,
  usePreloadComponent,
  useLazyWithRetry,
  LazyLoadingSpinner
}

export default lazyComponents 