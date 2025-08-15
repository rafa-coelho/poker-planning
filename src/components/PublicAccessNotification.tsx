'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface PublicAccessNotificationProps {
  sessionId: string;
  onParticipantUpdate?: () => void;
}

export default function PublicAccessNotification({ 
  sessionId, 
  onParticipantUpdate 
}: PublicAccessNotificationProps) {
  const { t } = useTranslation('common');
  const [pendingCount, setPendingCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPendingParticipants();
    
    // Verificar a cada 30 segundos
    const interval = setInterval(checkPendingParticipants, 30000);
    
    return () => clearInterval(interval);
  }, [sessionId]);

  const checkPendingParticipants = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/sessions/${sessionId}/public-participants`);
      const data = await response.json();

      if (data.success) {
        const pending = data.data.participants.filter((p: any) => p.status === 'PENDING');
        const newCount = pending.length;
        
        // Mostrar notificação se há participantes pendentes
        if (newCount > 0 && newCount !== pendingCount) {
          setShowNotification(true);
        }
        
        setPendingCount(newCount);
      }
    } catch (err) {
      console.error('Erro ao verificar participantes pendentes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewParticipants = () => {
    setShowNotification(false);
    onParticipantUpdate?.();
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  if (!showNotification || pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-yellow-200 p-4 max-w-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              Novos participantes aguardando
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {pendingCount} {pendingCount === 1 ? 'pessoa' : 'pessoas'} solicitaram acesso público à sessão.
            </p>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={handleViewParticipants}
                className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors"
              >
                Ver Participantes
              </button>
              <button
                onClick={handleDismiss}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
