import { useState, useEffect, useCallback } from 'react'

/**
 * Hook para debounce de valores
 * Útil para otimizar pesquisas e inputs
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook para debounce de função
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args)
    }, delay)

    setTimeoutId(newTimeoutId)
  }) as T
}

/**
 * Hook para throttle de função
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const [lastCall, setLastCall] = useState(0)

  return ((...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastCall >= delay) {
      callback(...args)
      setLastCall(now)
    }
  }) as T
}

/**
 * Hook para memoização de função com dependências
 */
export function useMemoizedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  dependencies: unknown[]
): T {
  const memoizedCallback = useCallback(callback, dependencies)
  return memoizedCallback
} 