"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import "@/i18n/index";

interface PendingRequest {
  id: string;
  name: string;
  createdAt: string;
}

interface PendingRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: PendingRequest[];
  onApprove: (participantId: string) => void;
  onReject: (participantId: string) => void;
  loading?: boolean;
}

export default function PendingRequestsModal({
  isOpen,
  onClose,
  requests,
  onApprove,
  onReject,
  loading = false
}: PendingRequestsModalProps) {
  const { t } = useTranslation("common");

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {t('pendingRequests')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">{t('loading.general')}</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noPendingRequests')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('noPendingRequestsMessage')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{request.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('requestedAt')} {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => onApprove(request.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 transition"
                      >
                        {t('approve')}
                      </button>
                      <button
                        onClick={() => onReject(request.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 transition"
                      >
                        {t('reject')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            <p>• <strong>{t('approve')}:</strong> {t('approveDescription')}</p>
            <p>• <strong>{t('reject')}:</strong> {t('rejectDescription')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
