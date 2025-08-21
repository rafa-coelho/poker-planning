/**
 * Sistema de Monitoramento de Performance
 * Rastreia métricas importantes para otimização
 */

export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  bundleSize: number;
  timestamp: number;
}

export interface PerformanceEvent {
  type: 'page_load' | 'api_call' | 'component_render' | 'error';
  name: string;
  duration: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

class PerformanceMonitor {
  private events: PerformanceEvent[] = [];
  private metrics: PerformanceMetrics[] = [];
  private isEnabled: boolean = process.env.NODE_ENV === 'production';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitals();
    }
  }

  /**
   * Inicializa monitoramento de Web Vitals
   */
  private initializeWebVitals() {
    if (!this.isEnabled) return;

    // Monitorar LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.recordEvent('page_load', 'LCP', lastEntry.startTime, {
          element: lastEntry.element?.tagName,
          size: lastEntry.size,
        });
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }

    // Monitorar FID (First Input Delay)
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fidEntry = entry as any;
          this.recordEvent('page_load', 'FID', fidEntry.processingStart - fidEntry.startTime, {
            name: fidEntry.name,
            type: fidEntry.entryType,
          });
        });
      });
      observer.observe({ entryTypes: ['first-input'] });
    }

    // Monitorar CLS (Cumulative Layout Shift)
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordEvent('page_load', 'CLS', clsValue, { value: clsValue });
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    }
  }

  /**
   * Registra um evento de performance
   */
  recordEvent(type: PerformanceEvent['type'], name: string, duration: number, metadata?: Record<string, any>) {
    if (!this.isEnabled) return;

    const event: PerformanceEvent = {
      type,
      name,
      duration,
      metadata,
      timestamp: Date.now(),
    };

    this.events.push(event);

    // Limitar array para evitar vazamento de memória
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }

    // Log em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance: ${type} - ${name} (${duration.toFixed(2)}ms)`, metadata);
    }
  }

  /**
   * Registra métricas de performance
   */
  recordMetrics(metrics: Partial<PerformanceMetrics>) {
    if (!this.isEnabled) return;

    const fullMetrics: PerformanceMetrics = {
      pageLoadTime: 0,
      apiResponseTime: 0,
      memoryUsage: 0,
      bundleSize: 0,
      timestamp: Date.now(),
      ...metrics,
    };

    this.metrics.push(fullMetrics);

    // Limitar array
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-50);
    }
  }

  /**
   * Mede tempo de execução de uma função
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordEvent('api_call', name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordEvent('error', name, duration, { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Mede tempo de execução de uma função síncrona
   */
  measureSync<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordEvent('component_render', name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordEvent('error', name, duration, { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Obtém estatísticas de performance
   */
  getStats() {
    const now = Date.now();
    const lastHour = now - 60 * 60 * 1000;
    const recentEvents = this.events.filter(e => e.timestamp > lastHour);

    const stats = {
      totalEvents: this.events.length,
      recentEvents: recentEvents.length,
      averageApiResponseTime: this.calculateAverage(recentEvents.filter(e => e.type === 'api_call'), 'duration'),
      averagePageLoadTime: this.calculateAverage(recentEvents.filter(e => e.type === 'page_load'), 'duration'),
      errors: recentEvents.filter(e => e.type === 'error').length,
      memoryUsage: this.getMemoryUsage(),
    };

    return stats;
  }

  /**
   * Calcula média de uma propriedade
   */
  private calculateAverage(events: PerformanceEvent[], property: keyof PerformanceEvent): number {
    if (events.length === 0) return 0;
    const sum = events.reduce((acc, event) => acc + (event[property] as number), 0);
    return sum / events.length;
  }

  /**
   * Obtém uso de memória (se disponível)
   */
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
    return 0;
  }

  /**
   * Exporta dados para análise
   */
  exportData() {
    return {
      events: this.events,
      metrics: this.metrics,
      stats: this.getStats(),
    };
  }

  /**
   * Limpa dados antigos
   */
  clear() {
    this.events = [];
    this.metrics = [];
  }
}

// Instância global do monitor
export const performanceMonitor = new PerformanceMonitor();

// Hooks para uso em componentes React
export const usePerformanceMonitor = () => {
  return {
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    measureSync: performanceMonitor.measureSync.bind(performanceMonitor),
    recordEvent: performanceMonitor.recordEvent.bind(performanceMonitor),
    getStats: performanceMonitor.getStats.bind(performanceMonitor),
  };
};

// Decorator para medir performance de funções
export function measurePerformance(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measureAsync(methodName, () => method.apply(this, args));
    };

    return descriptor;
  };
}
