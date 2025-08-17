// 🚀 Performance Monitoring Service
// Monitora métricas de performance da aplicação

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  metadata?: Record<string, unknown>
}

interface PerformanceObserver {
  onMetric: (metric: PerformanceMetric) => void
}

class PerformanceService {
  private observers: PerformanceObserver[] = []
  private metrics: PerformanceMetric[] = []
  private readonly MAX_METRICS = 1000

  /**
   * Registra um observador de métricas
   */
  addObserver(observer: PerformanceObserver): void {
    this.observers.push(observer)
  }

  /**
   * Remove um observador
   */
  removeObserver(observer: PerformanceObserver): void {
    const index = this.observers.indexOf(observer)
    if (index > -1) {
      this.observers.splice(index, 1)
    }
  }

  /**
   * Registra uma métrica de performance
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    metadata?: Record<string, unknown>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata
    }

    this.metrics.push(metric)
    this.notifyObservers(metric)

    // Limpar métricas antigas
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS)
    }
  }

  /**
   * Notifica observadores sobre nova métrica
   */
  private notifyObservers(metric: PerformanceMetric): void {
    this.observers.forEach(observer => {
      try {
        observer.onMetric(metric)
      } catch (error) {
        console.error('Error in performance observer:', error)
      }
    })
  }

  /**
   * Obtém métricas por nome
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (!name) return [...this.metrics]
    return this.metrics.filter(m => m.name === name)
  }

  /**
   * Obtém estatísticas de uma métrica
   */
  getMetricStats(name: string): {
    count: number
    average: number
    min: number
    max: number
    p95: number
  } | null {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) return null

    const values = metrics.map(m => m.value).sort((a, b) => a - b)
    const count = values.length
    const sum = values.reduce((a, b) => a + b, 0)
    const average = sum / count
    const min = values[0]
    const max = values[count - 1]
    const p95Index = Math.floor(count * 0.95)
    const p95 = values[p95Index]

    return { count, average, min, max, p95 }
  }

  /**
   * Limpa métricas antigas
   */
  clearOldMetrics(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 horas
    const cutoff = Date.now() - maxAge
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
  }
}

// Instância global
export const performanceService = new PerformanceService()

// 🔧 Utilitários para monitoramento específico

/**
 * Monitora tempo de resposta de API
 */
export function monitorApiResponse(
  endpoint: string,
  startTime: number,
  success: boolean,
  statusCode?: number
): void {
  const duration = Date.now() - startTime
  
  performanceService.recordMetric(
    'api_response_time',
    duration,
    'ms',
    {
      endpoint,
      success,
      statusCode
    }
  )

  // Alertar se resposta muito lenta
  if (duration > 5000) { // 5 segundos
    console.warn(`🐌 API lenta: ${endpoint} levou ${duration}ms`)
  }
}

/**
 * Monitora tempo de carregamento de página
 */
export function monitorPageLoad(pageName: string, loadTime: number): void {
  performanceService.recordMetric(
    'page_load_time',
    loadTime,
    'ms',
    { pageName }
  )
}

/**
 * Monitora uso de memória
 */
export function monitorMemoryUsage(): void {
  if (typeof window !== 'undefined' && 'memory' in performance) {
    const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
    performanceService.recordMetric(
      'memory_usage',
      memory.usedJSHeapSize,
      'bytes',
      {
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      }
    )
  }
}

/**
 * Monitora tempo de renderização de componente
 */
export function monitorComponentRender(
  componentName: string,
  renderTime: number
): void {
  performanceService.recordMetric(
    'component_render_time',
    renderTime,
    'ms',
    { componentName }
  )
}

/**
 * Monitora queries do banco de dados
 */
export function monitorDatabaseQuery(
  queryName: string,
  duration: number,
  success: boolean
): void {
  performanceService.recordMetric(
    'database_query_time',
    duration,
    'ms',
    {
      queryName,
      success
    }
  )

  // Alertar queries lentas
  if (duration > 1000) { // 1 segundo
    console.warn(`🐌 Query lenta: ${queryName} levou ${duration}ms`)
  }
}

/**
 * Hook para monitorar performance de componentes React
 */
export function usePerformanceMonitor(componentName: string) {
  const startTime = Date.now()

  return {
    recordRender: () => {
      const renderTime = Date.now() - startTime
      monitorComponentRender(componentName, renderTime)
    }
  }
}

/**
 * Decorator para monitorar funções
 */
export function monitorFunction<T extends (...args: unknown[]) => unknown>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const startTime = Date.now()
    
    try {
      const result = fn(...args)
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = Date.now() - startTime
          performanceService.recordMetric(
            'async_function_time',
            duration,
            'ms',
            { functionName: name }
          )
        }) as ReturnType<T>
      } else {
        const duration = Date.now() - startTime
        performanceService.recordMetric(
          'function_time',
          duration,
          'ms',
          { functionName: name }
        )
        return result as ReturnType<T>
      }
    } catch (error) {
      const duration = Date.now() - startTime
      performanceService.recordMetric(
        'function_error_time',
        duration,
        'ms',
        { functionName: name, error: error instanceof Error ? error.message : 'Erro desconhecido' }
      )
      throw error
    }
  }) as T
}

// 📊 Observador para console (desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  performanceService.addObserver({
    onMetric: (metric) => {
      if (metric.value > 1000) { // Log métricas lentas
        console.log(`🐌 Operação lenta: ${metric.name} levou ${metric.value}${metric.unit}`, metric.metadata)
      }
    }
  })
}

// 🧹 Limpeza automática de métricas antigas
setInterval(() => {
  performanceService.clearOldMetrics()
}, 60 * 60 * 1000) // Limpar a cada hora

export default performanceService 