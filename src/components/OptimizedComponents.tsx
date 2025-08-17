import React, { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

// 🚀 Componentes Otimizados com React.memo
// Previnem re-renders desnecessários

// 🎯 Lista Otimizada
interface OptimizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string
  emptyMessage?: string
  className?: string
}

export const OptimizedList = React.memo(<T,>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage,
  className = ''
}: OptimizedListProps<T>) => {
  const { t } = useTranslation("common")
  
  const memoizedItems = useMemo(() => items, [items])
  
  if (memoizedItems.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        {emptyMessage || t('noItems')}
      </div>
    )
  }

  return (
    <div className={className}>
      {memoizedItems.map((item, index) => (
        <div key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
})

// 🎯 Card Otimizado
interface OptimizedCardProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  onClick?: () => void
  className?: string
  loading?: boolean
}

export const OptimizedCard = React.memo(({
  title,
  subtitle,
  children,
  onClick,
  className = '',
  loading = false
}: OptimizedCardProps) => {
  const handleClick = useCallback(() => {
    if (onClick && !loading) {
      onClick()
    }
  }, [onClick, loading])

  const cardClasses = useMemo(() => {
    const baseClasses = 'bg-white rounded-lg shadow-md p-6 border border-gray-200'
    const clickableClasses = onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''
    const loadingClasses = loading ? 'opacity-50 pointer-events-none' : ''
    return `${baseClasses} ${clickableClasses} ${loadingClasses} ${className}`
  }, [onClick, loading, className])

  return (
    <div className={cardClasses} onClick={handleClick}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
})

// 🎯 Botão Otimizado
interface OptimizedButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export const OptimizedButton = React.memo(({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  type = 'button'
}: OptimizedButtonProps) => {
  const handleClick = useCallback(() => {
    if (onClick && !disabled && !loading) {
      onClick()
    }
  }, [onClick, disabled, loading])

  const buttonClasses = useMemo(() => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
    
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
    }
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }
    
    const stateClasses = (disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''
    
    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${stateClasses} ${className}`
  }, [variant, size, disabled, loading, className])

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
})

// 🎯 Input Otimizado
interface OptimizedInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  type?: 'text' | 'email' | 'password' | 'search'
  error?: string
  disabled?: boolean
  className?: string
}

export const OptimizedInput = React.memo(({
  value,
  onChange,
  placeholder,
  label,
  type = 'text',
  error,
  disabled = false,
  className = ''
}: OptimizedInputProps) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }, [onChange])

  const inputClasses = useMemo(() => {
    const baseClasses = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
    const errorClasses = error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
    const disabledClasses = disabled ? 'bg-gray-50 cursor-not-allowed' : ''
    return `${baseClasses} ${errorClasses} ${disabledClasses} ${className}`
  }, [error, disabled, className])

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

// 🎯 Loading Otimizado
interface OptimizedLoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export const OptimizedLoading = React.memo(({
  size = 'md',
  text,
  className = ''
}: OptimizedLoadingProps) => {
  const { t } = useTranslation("common")
  
  const spinnerClasses = useMemo(() => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12'
    }
    return `animate-spin ${sizeClasses[size]}`
  }, [size])

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      <div className={spinnerClasses}>
        <svg className="w-full h-full text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      {text && (
        <p className="text-sm text-gray-600">{text}</p>
      )}
    </div>
  )
})

// 🏷️ Display names para debugging
OptimizedList.displayName = 'OptimizedList'
OptimizedCard.displayName = 'OptimizedCard'
OptimizedButton.displayName = 'OptimizedButton'
OptimizedInput.displayName = 'OptimizedInput'
OptimizedLoading.displayName = 'OptimizedLoading' 