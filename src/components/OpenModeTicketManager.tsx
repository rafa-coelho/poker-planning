
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
  finalEstimate?: string; // Corrigido para corresponder ao banco
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
  emitTicketSelected?: (ticketId: string | null) => void;
  socket?: any;
}

interface CreateTicketData {
  title: string;
  description?: string;
  priority: string;
}

const OpenModeTicketManager: React.FC<OpenModeTicketManagerProps> = ({
  sessionId,
  isCreator,
  currentTicketId,
  votingMode = "FIBONACCI",
  onTicketSelect,
  onOpenFinalEstimateModal,
  emitTicketSelected,
  socket,
}) => {
  const { t } = useTranslation("common");
  const [tickets, setTickets] = useState<OpenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<OpenTicket | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTicketIdRef = useRef<string | null>(currentTicketId ?? null);

  useEffect(() => {
    currentTicketIdRef.current = currentTicketId ?? null;
    console.log('🎯 OpenModeTicketManager: currentTicketId atualizado para:', currentTicketId);
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

  // Carregar tickets da API
  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/open/sessions/${sessionId}/tickets`);
      const result = await response.json();
      if (result.success) {
        // Ordenar: tickets sem finalEstimate primeiro, depois por data
        const sorted = (result.tickets || []).sort((a: OpenTicket, b: OpenTicket) => {
          if ((a.finalEstimate ? 1 : 0) === (b.finalEstimate ? 1 : 0)) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return a.finalEstimate ? 1 : -1;
        });
        setTickets(sorted);
      }
    } catch (e) {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Handlers para eventos do socket
  const handleTicketCreate = useCallback((data: { ticket: OpenTicket }) => {
    console.log('🎫 OpenModeTicketManager: Ticket criado via socket:', data);
    debouncedUpdate(prev => {
      const newTickets = [data.ticket, ...prev];
      return newTickets.sort((a, b) => {
        if ((a.finalEstimate ? 1 : 0) === (b.finalEstimate ? 1 : 0)) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.finalEstimate ? 1 : -1;
      });
    });
  }, [debouncedUpdate]);

  const handleTicketUpdate = useCallback((data: { ticket: OpenTicket }) => {
    console.log('🎫 OpenModeTicketManager: Ticket atualizado via socket:', data);
    debouncedUpdate(prev => {
      const updatedTickets = prev.map(t => t.id === data.ticket.id ? data.ticket : t);
      return updatedTickets.sort((a, b) => {
        if ((a.finalEstimate ? 1 : 0) === (b.finalEstimate ? 1 : 0)) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.finalEstimate ? 1 : -1;
      });
    });
  }, [debouncedUpdate]);

  const handleTicketDelete = useCallback((data: { ticketId: string }) => {
    console.log('🎫 OpenModeTicketManager: Ticket deletado via socket:', data);
    debouncedUpdate(prev => prev.filter(t => t.id !== data.ticketId));
    if (currentTicketIdRef.current === data.ticketId && emitTicketSelected) {
      emitTicketSelected(null);
    }
  }, [debouncedUpdate, emitTicketSelected]);

  // Carregamento inicial apenas uma vez
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Setup listeners separado para evitar recarregamentos
  useEffect(() => {
    if (!socket) {
      return;
    }
    
    console.log('🔧 OpenModeTicketManager: Configurando listeners de socket');
    socket.off('ticket_created', handleTicketCreate);
    socket.off('ticket_updated', handleTicketUpdate);
    socket.off('ticket_deleted', handleTicketDelete);
    socket.on('ticket_created', handleTicketCreate);
    socket.on('ticket_updated', handleTicketUpdate);
    socket.on('ticket_deleted', handleTicketDelete);
    return () => {
      socket.off('ticket_created', handleTicketCreate);
      socket.off('ticket_updated', handleTicketUpdate);
      socket.off('ticket_deleted', handleTicketDelete);
    };
  }, [socket, handleTicketCreate, handleTicketUpdate, handleTicketDelete]);

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
      if (!response.ok) throw new Error(t("tickets.errors.createFailed"));
      const result = await response.json();
      setShowModal(false);
      // loadTickets removido - evento de socket irá atualizar
    } catch (error) {
      console.error(t("tickets.errors.createFailed"), error);
    }
  };

  // Atualizar ticket
  const updateTicket = async (data: CreateTicketData) => {
    if (!editingTicket) return;
    try {
      const response = await fetch(`/api/open/sessions/${sessionId}/tickets/${editingTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(t("tickets.errors.updateFailed"));
      const result = await response.json();
      setEditingTicket(null);
      setShowModal(false);
      // loadTickets removido - evento de socket irá atualizar
    } catch (error) {
      console.error(t("tickets.errors.updateFailed"), error);
    }
  };

  // Deletar ticket
  const deleteTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/open/sessions/${sessionId}/tickets/${ticketId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Falha ao deletar ticket');
      if (currentTicketIdRef.current === ticketId && emitTicketSelected) {
        emitTicketSelected(null);
      }
      // loadTickets removido - evento de socket irá atualizar
    } catch (error) {
      console.error('Erro ao deletar ticket:', error);
    }
  };

  // Selecionar ticket (apenas criador pode)
  const selectTicket = (ticket: OpenTicket) => {
    if (!isCreator) return;
    onTicketSelect(ticket.id);
    emitTicketSelected?.(ticket.id);
  };

  // Finalizar estimativa
  const finishEstimate = (ticket: OpenTicket) => {
    if (onOpenFinalEstimateModal) {
      onOpenFinalEstimateModal();
    }
  };

  // Cleanup do timeout quando componente desmontar
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Função para determinar o texto apropriado baseado no modo de votação
  const getEstimateText = (value: string) => {
    const isTshirtMode = votingMode === "TSHIRT" || votingMode === "T-SHIRT";
    return isTshirtMode ? value : `${value} pts`;
  };

  // ... (JSX do componente permanece igual)

  if (loading) {
    return (
      <div className="h-full">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header com título e botão de adicionar */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t("tickets.title")}
        </h3>
        {isCreator && (
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            {t("tickets.create")}
          </button>
        )}
      </div>

      {/* Formulário de criação/edição */}
      <OpenModeTicketModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingTicket(null); }}
        onSubmit={editingTicket ? updateTicket : createTicket}
        ticket={editingTicket}
        votingMode={votingMode}
      />

      {/* Lista de tickets */}
      {tickets.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {t("tickets.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                currentTicketId === ticket.id
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200 cursor-pointer"
                  : ticket.finalEstimate
                  ? "border-green-200 bg-green-50 hover:border-green-300"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
              } ${isCreator ? "cursor-pointer" : "cursor-default"}`}
              onClick={() => selectTicket(ticket)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm mb-1 ${
                    ticket.finalEstimate ? "text-green-800" : "text-gray-900"
                  }`}>
                    {ticket.title}
                  </h4>
                  {ticket.description && (
                    <p className={`text-xs mb-2 line-clamp-1 ${
                      ticket.finalEstimate ? "text-green-600" : "text-gray-600"
                    }`}>
                      {ticket.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    {ticket.priority && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {t(`tickets.priority.${ticket.priority.toLowerCase()}`)}
                      </span>
                    )}
                    {ticket.finalEstimate && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        {getEstimateText(ticket.finalEstimate)}
                      </span>
                    )}
                  </div>

                  {/* Dica visual para tickets selecionados */}
                  {currentTicketId === ticket.id && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      {t("tickets.hints.selectedForVoting")}
                    </div>
                  )}
                  {/* Dicas visuais para diferentes status */}
                  {currentTicketId !== ticket.id && !ticket.finalEstimate && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      {isCreator ? t("tickets.hints.pendingCreator") : t("tickets.hints.pendingParticipant")}
                    </div>
                  )}
                  {currentTicketId !== ticket.id && ticket.finalEstimate && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      ✅ {t("tickets.status.estimated")} - {isCreator ? t("tickets.hints.estimatedCreator") : t("tickets.hints.estimatedParticipant")}
                    </div>
                  )}
                </div>

                {isCreator && (
                  <div className="flex items-center gap-1 ml-3">
                    {/* Editar */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditingTicket(ticket);
                        setShowModal(true);
                      }}
                      className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
                      title={t("tickets.buttons.edit")}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    {/* Excluir */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteTicket(ticket.id);
                      }}
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title={t("tickets.buttons.delete")}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OpenModeTicketManager;
