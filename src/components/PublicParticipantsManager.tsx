'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface PublicParticipant {
  id: string;
  name: string;
  email?: string;
  status: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  approvedAt?: string;
  expiresAt?: string;
  approver?: {
    id: string;
    name: string;
    email: string;
  };
}

interface PublicParticipantsManagerProps {
  sessionId: string;
  onParticipantUpdate?: () => void;
}

export default function PublicParticipantsManager({ 
  sessionId, 
  onParticipantUpdate 
}: PublicParticipantsManagerProps) {
  const { t } = useTranslation('common');
  const [participants, setParticipants] = useState<PublicParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadParticipants();
  }, [sessionId]);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sessions/${sessionId}/public-participants`);
      const data = await response.json();

      if (data.success) {
        setParticipants(data.data.participants);
      } else {
        setError(data.error?.message || 'Erro ao carregar participantes');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (participantId: string) => {
    await handleAction(participantId, 'APPROVE');
  };

  const handleReject = async (participantId: string) => {
    await handleAction(participantId, 'REJECT');
  };

  const handleAction = async (participantId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      setProcessingId(participantId);
      setError(null);

      const response = await fetch(`/api/sessions/${sessionId}/public-participants/${participantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        // Atualizar a lista de participantes
        await loadParticipants();
        onParticipantUpdate?.();
      } else {
        setError(data.error?.message || `Erro ao ${action.toLowerCase()} participante`);
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'APPROVED':
        return 'Aprovado';
      case 'REJECTED':
        return 'Rejeitado';
      case 'EXPIRED':
        return 'Expirado';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingParticipants = participants.filter(p => p.status === 'PENDING');
  const approvedParticipants = participants.filter(p => p.status === 'APPROVED');
  const otherParticipants = participants.filter(p => !['PENDING', 'APPROVED'].includes(p.status));

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Carregando participantes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Participantes Públicos
        </h3>
        <p className="text-sm text-gray-600">
          Gerencie participantes que solicitaram acesso público
        </p>
      </div>

      {error && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Pending Participants */}
      {pendingParticipants.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Aguardando Aprovação ({pendingParticipants.length})
          </h4>
          <div className="space-y-3">
            {pendingParticipants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">
                      {participant.name}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(participant.status)}`}>
                      {getStatusText(participant.status)}
                    </span>
                  </div>
                  {participant.email && (
                    <p className="text-sm text-gray-600 mt-1">{participant.email}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Solicitado em {formatDate(participant.createdAt)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleApprove(participant.id)}
                    disabled={processingId === participant.id}
                    className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {processingId === participant.id ? 'Aprovando...' : 'Aprovar'}
                  </button>
                  <button
                    onClick={() => handleReject(participant.id)}
                    disabled={processingId === participant.id}
                    className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {processingId === participant.id ? 'Rejeitando...' : 'Rejeitar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Participants */}
      {approvedParticipants.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Aprovados ({approvedParticipants.length})
          </h4>
          <div className="space-y-2">
            {approvedParticipants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">
                      {participant.name}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(participant.status)}`}>
                      {getStatusText(participant.status)}
                    </span>
                  </div>
                  {participant.email && (
                    <p className="text-sm text-gray-600 mt-1">{participant.email}</p>
                  )}
                  <div className="text-xs text-gray-500 mt-1 space-x-4">
                    <span>Aprovado em {participant.approvedAt ? formatDate(participant.approvedAt) : 'N/A'}</span>
                    {participant.approver && (
                      <span>por {participant.approver.name}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Participants */}
      {otherParticipants.length > 0 && (
        <div className="px-6 py-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Outros ({otherParticipants.length})
          </h4>
          <div className="space-y-2">
            {otherParticipants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">
                      {participant.name}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(participant.status)}`}>
                      {getStatusText(participant.status)}
                    </span>
                  </div>
                  {participant.email && (
                    <p className="text-sm text-gray-600 mt-1">{participant.email}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {participant.status === 'REJECTED' && participant.approver && (
                      <span>Rejeitado por {participant.approver.name} em {participant.approvedAt ? formatDate(participant.approvedAt) : 'N/A'}</span>
                    )}
                    {participant.status === 'EXPIRED' && (
                      <span>Expirado em {participant.expiresAt ? formatDate(participant.expiresAt) : 'N/A'}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {participants.length === 0 && (
        <div className="px-6 py-8 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Nenhum participante público
          </h3>
          <p className="text-sm text-gray-500">
            Quando pessoas solicitarem acesso público, elas aparecerão aqui para aprovação.
          </p>
        </div>
      )}
    </div>
  );
}
