"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { 
  PencilIcon, 
  TrashIcon,
  FlagIcon
} from "@heroicons/react/24/outline";
import OpenModeTicketModal from "./OpenModeTicketModal";

interface OpenTicket {
  id: string;
  title: string;
  description?: string;
  priority: string;
  estimate?: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

interface OpenModeTicketManagerProps {
  sessionId: string;
  isCreator: boolean;
  currentTicketId?: string | null;
  votingMode?: string;
  onTicketSelect: (ticketId: string) => void;
  onOpenFinalEstimateModal?: () => void;
  registerTicketUpdateCallback?: (callback: (ticket: OpenTicket) => void) => void;
  emitTicketSelected?: (ticketId: string | null) => void;
  emitTicketCreated?: (ticket: OpenTicket) => void;
  emitTicketUpdated?: (ticket: OpenTicket) => void;
  emitTicketDeleted?: (ticketId: string) => void;
  reloadCurrentTicket?: () => Promise<void>;
  selectTicketDirectly?: (ticketId: string | null) => void;
}

interface CreateTicketData {
  title: string;
  description?: string;
  priority: string;
}

export default function OpenModeTicketManager({
  sessionId,
  isCreator,
  currentTicketId,
  votingMode = "FIBONACCI",
  onTicketSelect,
  onOpenFinalEstimateModal,
  registerTicketUpdateCallback,
  emitTicketSelected,
  emitTicketCreated,
  emitTicketUpdated,
  emitTicketDeleted,
  reloadCurrentTicket,
  selectTicketDirectly,
}: OpenModeTicketManagerProps) {
  const { t } = useTranslation("common");

  // Função para determinar o texto apropriado baseado no modo de votação
  const getEstimateText = (value: string) => {
    const isTshirtMode = votingMode === "TSHIRT" || votingMode === "T-SHIRT";
    return isTshirtMode ? value : `${value} pts`;
  };

  const [tickets, setTickets] = useState<OpenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<OpenTicket | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTicketIdRef = useRef<string | null>(currentTicketId ?? null);

  // Manter o currentTicketId mais recente disponível para handlers sem refazer efeitos
  useEffect(() => {
    currentTicketIdRef.current = currentTicketId ?? null;
  }, [currentTicketId]);

  // Debounce para atualizações de tickets
  const debouncedUpdate = useCallback((updater: (prev: OpenTicket[]) => OpenTicket[]) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    const timeout = setTimeout(() => {
      setTickets(updater);
      updateTimeoutRef.current = null;
    }, 100);
    
    updateTimeoutRef.current = timeout;
  }, []);

  // Registrar callback de atualização
  useEffect(() => {
    if (registerTicketUpdateCallback) {
      const updateTicketInList = (updatedTicket: OpenTicket) => {
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
      };
      registerTicketUpdateCallback(updateTicketInList);
    }
  }, [registerTicketUpdateCallback]);

  // Carregar tickets
  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/open/sessions/${sessionId}/tickets`);
      
      if (!response.ok) {
        throw new Error('Falha ao carregar tickets');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setTickets(result.tickets || []);
      } else {
        console.error('Erro ao carregar tickets:', result.error);
      }
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Carregar tickets e configurar listeners
  useEffect(() => {
    if (!sessionId) return;

    loadTickets();
  }, [sessionId, loadTickets]);

  // Criar ticket
  const createTicket = async (data: CreateTicketData) => {
    try {
      const response = await fetch(`/api/open/sessions/${sessionId}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Falha ao criar ticket');
      }

      const result = await response.json();
      
      if (result.success) {
        const newTicket = result.ticket;
        setTickets(prev => [...prev, newTicket]);
        emitTicketCreated?.(newTicket);
        setShowModal(false);
      } else {
        console.error('Erro ao criar ticket:', result.error);
      }
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
    }
  };

  // Atualizar ticket
  const updateTicket = async (data: CreateTicketData) => {
    if (!editingTicket) return;

    try {
      const response = await fetch(`/api/open/sessions/${sessionId}/tickets/${editingTicket.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar ticket');
      }

      const result = await response.json();
      
      if (result.success) {
        const updatedTicket = result.ticket;
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        emitTicketUpdated?.(updatedTicket);
        setEditingTicket(null);
        setShowModal(false);
      } else {
        console.error('Erro ao atualizar ticket:', result.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar ticket:', error);
    }
  };

  // Deletar ticket
  const deleteTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/open/sessions/${sessionId}/tickets/${ticketId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Falha ao deletar ticket');
      }

      const result = await response.json();
      
      if (result.success) {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        emitTicketDeleted?.(ticketId);
        
        // Se o ticket deletado era o atual, limpar seleção
        if (currentTicketIdRef.current === ticketId) {
          emitTicketSelected?.(null);
        }
      } else {
        console.error('Erro ao deletar ticket:', result.error);
      }
    } catch (error) {
      console.error('Erro ao deletar ticket:', error);
    }
  };

  // Selecionar ticket
  const selectTicket = (ticket: OpenTicket) => {
    onTicketSelect(ticket.id);
    emitTicketSelected?.(ticket.id);
  };

  // Finalizar estimativa
  const finishEstimate = (ticket: OpenTicket) => {
    if (onOpenFinalEstimateModal) {
      onOpenFinalEstimateModal();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('tickets.title')}
        </h3>
        {isCreator && (
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
          >
            {t('tickets.add')}
          </button>
        )}
      </div>

      {/* Lista de tickets */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FlagIcon className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2">{t('tickets.empty')}</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`p-3 bg-white border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                currentTicketId === ticket.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {ticket.title}
                  </h4>
                  {ticket.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {ticket.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ticket.priority === 'HIGH' 
                        ? 'bg-red-100 text-red-800'
                        : ticket.priority === 'MEDIUM'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {t(`tickets.priority.${ticket.priority.toLowerCase()}`)}
                    </span>
                    {ticket.estimate && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {getEstimateText(ticket.estimate)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  {isCreator && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTicket(ticket);
                          setShowModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title={t('tickets.edit')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTicket(ticket.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title={t('tickets.delete')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => selectTicket(ticket)}
                  className={`flex-1 px-3 py-1 text-sm rounded-md transition-colors ${
                    currentTicketId === ticket.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {currentTicketId === ticket.id ? t('tickets.selected') : t('tickets.select')}
                </button>
                
                {currentTicketId === ticket.id && ticket.estimate && (
                  <button
                    onClick={() => finishEstimate(ticket)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {t('tickets.finish')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de ticket */}
      {showModal && (
        <OpenModeTicketModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingTicket(null);
          }}
          onSubmit={editingTicket ? updateTicket : createTicket}
          ticket={editingTicket}
          votingMode={votingMode}
        />
      )}
    </div>
  );
}
