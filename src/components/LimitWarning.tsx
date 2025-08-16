'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LimitWarning as LimitWarningType } from '@/lib/config/plans'
import PlanUpgradeModal from './PlanUpgradeModal'

interface LimitWarningProps {
  warnings: LimitWarningType[]
  onDismiss?: () => void
  showUpgradeButton?: boolean
}

export default function LimitWarning({
  warnings,
  onDismiss,
  showUpgradeButton = true
}: LimitWarningProps) {
  const { t } = useTranslation('dashboard')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || warnings.length === 0) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  const handleUpgrade = () => {
    setShowUpgradeModal(true)
  }

  // 🚨 Obter warning mais crítico (maior porcentagem)
  const criticalWarning = warnings.reduce((prev, current) =>
    current.percentage > prev.percentage ? current : prev
  )

  // 🎯 Obter mensagem baseada no tipo de limite
  const getWarningMessage = (warning: LimitWarningType) => {
    const featureNames: Record<string, string> = {
      maxSessions: t('limits.sessions'),
      maxParticipants: t('limits.participants'),
      maxTeamMembers: t('limits.teamMembers'),
      maxProjectMembers: t('limits.projectMembers')
    }

    const featureName = featureNames[warning.feature] || warning.feature

    if (warning.percentage >= 100) {
      return t('limits.limitReachedMessage', { feature: featureName, current: warning.current, limit: warning.limit })
    } else if (warning.percentage >= 80) {
      return t('limits.limitWarningMessage', { feature: featureName, current: warning.current, limit: warning.limit })
    } else {
      return t('limits.usageMessage', { feature: featureName, current: warning.current, limit: warning.limit })
    }
  }

  // 🎨 Obter cor baseada na severidade
  const getWarningColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-50 border-red-200 text-red-800'
    if (percentage >= 80) return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    return 'bg-blue-50 border-blue-200 text-blue-800'
  }

  // 🎨 Obter ícone baseado na severidade
  const getWarningIcon = (percentage: number) => {
    if (percentage >= 100) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    }
    if (percentage >= 80) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  }

  return (
    <>
      <div className={`border rounded-lg p-4 ${getWarningColor(criticalWarning.percentage)}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getWarningIcon(criticalWarning.percentage)}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium">
              {criticalWarning.percentage >= 100
                ? t('limits.limitReached')
                : t('limits.limitWarning')
              }
            </h3>
            <div className="mt-2 text-sm">
              <p>{getWarningMessage(criticalWarning)}</p>

              {/* Progress Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>{t('limits.currentUsage')}</span>
                  <span>{criticalWarning.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${criticalWarning.percentage >= 100
                        ? 'bg-red-500'
                        : criticalWarning.percentage >= 80
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                    style={{ width: `${Math.min(criticalWarning.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Múltiplos warnings */}
              {warnings.length > 1 && (
                <div className="mt-2 text-xs">
                  <p>{t('limits.otherLimits')}</p>
                  <ul className="mt-1 space-y-1">
                    {warnings
                      .filter(w => w.feature !== criticalWarning.feature)
                      .slice(0, 2)
                      .map((warning, index) => (
                        <li key={index}>
                          • {getWarningMessage(warning)}
                        </li>
                      ))}
                  </ul>
                  {warnings.length > 3 && (
                    <p className="text-gray-600 mt-1">
                      {t('limits.otherLimitsCount', { count: warnings.length - 3 })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex items-center space-x-3">
              {showUpgradeButton && (
                <button
                  onClick={handleUpgrade}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  {t('limits.upgradePlan')}
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                {t('limits.dismiss')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        trigger="limit_exceeded"
        feature={criticalWarning.feature}
        currentUsage={criticalWarning.current}
        limit={criticalWarning.limit}
      />
    </>
  )
} 