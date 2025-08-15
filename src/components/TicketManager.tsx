"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Ticket } from "@prisma/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { ApiService } from "@/lib/services/apiService";
import { 
  PencilIcon, 
  TrashIcon,
  FlagIcon
} from "@heroicons/react/24/outline";
import TicketModal from "./TicketModal";

interface TicketManagerProps {
  sessionId: string;
  isCreator: boolean;
  currentTicketId?: string | null;
  votingMode?: string;
  onTicketSelect: (ticket: Ticket) => void;
  onOpenFinalEstimateModal?: (ticket: Ticket) => void;
  registerTicketUpdateCallback?: (callback: (ticket: Ticket) => void) => void;
  emitTicketSelected?: (ticketId: string | null) => void;
  emitTicketCreated?: (ticket: Ticket) => void;
  emitTicketUpdated?: (ticket: Ticket) => void;
  emitTicketDeleted?: (ticketId: string) => void;
  reloadCurrentTicket?: () => Promise<void>;
  selectTicketDirectly?: (ticketId: string | null) => void;
}

interface CreateTicketData {
  title: string;
  description?: string;
  priority: any; // Priority type is not directly imported, so using 'any' for now
}

export default function TicketManager({
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
}: TicketManagerProps) {
  const { t } = useTranslation("common");
  const { apiService } = useAuth();

  // Função para determinar o texto apropriado baseado no modo de votação
  const getEstimateText = (value: string) => {
    const isTshirtMode = votingMode === "TSHIRT" || votingMode === "T-SHIRT";
    return isTshirtMode ? value : `${value} pts`;
  };
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTicketIdRef = useRef<string | null>(currentTicketId ?? null);

  // Manter o currentTicketId mais recente disponível para handlers sem refazer efeitos
  useEffect(() => {
    currentTicketIdRef.current = currentTicketId ?? null;
  }, [currentTicketId]);

  // Debounce para atualizações de tickets
  const debouncedUpdate = useCallback((updater: (prev: Ticket[]) => Ticket[]) => {
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
      const updateTicketInList = (updatedTicket: Ticket) => {
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
      };
      registerTicketUpdateCallback(updateTicketInList);
    }
  }, [registerTicketUpdateCallback]);

  // Carregar tickets e configurar listeners
  useEffect(() => {
    if (!sessionId) return;

    loadTickets();

    // Handlers para eventos do socket
    const handleTicketDelete = (data: { ticketId: string }) => {
      debouncedUpdate(prev => prev.filter(t => t.id !== data.ticketId));
      
      // Se o ticket deletado era o selecionado, notificar o useSession
      if (currentTicketIdRef.current === data.ticketId) {
        if (emitTicketSelected) {
          emitTicketSelected(null);
        } else {
          // Fallback direto no socket
          const socket = typeof window !== 'undefined' ? (window as any).socket : null;
          if (socket) {
            socket.emit("ticket_selected", { 
              sessionId, 
              ticketId: null 
            });
          }
        }
      }
    };

    const handleTicketCreate = (data: { ticket: any }) => {
      debouncedUpdate(prev => {
        const newTickets = [data.ticket, ...prev];
        // Ordenar: tickets não estimados primeiro, estimados no final
        return newTickets.sort((a: Ticket, b: Ticket) => {
          if ((a.status === "ESTIMATED") === (b.status === "ESTIMATED")) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return a.status === "ESTIMATED" ? 1 : -1;
        });
      });
    };

    const handleTicketUpdate = (data: { ticket: any }) => {
      debouncedUpdate(prev => {
        const updatedTickets = prev.map(t => 
          t.id === data.ticket.id ? data.ticket : t
        );
        // Ordenar após atualização
        return updatedTickets.sort((a: Ticket, b: Ticket) => {
          if ((a.status === "ESTIMATED") === (b.status === "ESTIMATED")) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return a.status === "ESTIMATED" ? 1 : -1;
        });
      });
      
      // Se o ticket atualizado era o selecionado, recarregar currentTicket via prop
      if (currentTicketIdRef.current === data.ticket.id && reloadCurrentTicket) {
        reloadCurrentTicket();
      }
    };

    const handleFinalEstimateSet = (data: { ticketId: string, finalEstimate: string }) => {
      debouncedUpdate(prev => {
        const updatedTickets = prev.map(t => 
          t.id === data.ticketId 
            ? { ...t, finalEstimate: data.finalEstimate, status: "ESTIMATED" as any }
            : t
        );
        // Ordenar após atualização
        return updatedTickets.sort((a: Ticket, b: Ticket) => {
          if ((a.status === "ESTIMATED") === (b.status === "ESTIMATED")) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return a.status === "ESTIMATED" ? 1 : -1;
        });
      });
    };

    const handleTicketSelected = (data: { ticketId: string | null }) => {
      if (data.ticketId === null) {
        // Quando um ticket é desselecionado, apenas reordenar a lista atual
        // em vez de recarregar todos os tickets do servidor
        debouncedUpdate(prev => {
          return prev.sort((a: Ticket, b: Ticket) => {
            if ((a.status === "ESTIMATED") === (b.status === "ESTIMATED")) {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return a.status === "ESTIMATED" ? 1 : -1;
          });
        });
      }
      // Se um ticket foi selecionado, não precisamos fazer nada aqui
      // pois o currentTicketId será atualizado via props
    };

    // Função para configurar listeners quando socket estiver disponível
    const setupSocketListeners = () => {
      const socket = typeof window !== 'undefined' ? (window as any).socket : null;
      if (socket) {
        // Registrar listeners
        socket.off('ticket_updated', handleTicketUpdate);
        socket.off('ticket_deleted', handleTicketDelete);
        socket.off('ticket_created', handleTicketCreate);
        socket.off('final_estimate_set', handleFinalEstimateSet);
        socket.off('ticket_selected', handleTicketSelected);

        socket.on('ticket_updated', handleTicketUpdate);
        socket.on('ticket_deleted', handleTicketDelete);
        socket.on('ticket_created', handleTicketCreate);
        socket.on('final_estimate_set', handleFinalEstimateSet);
        socket.on('ticket_selected', handleTicketSelected);
        
        return () => {
          socket.off('ticket_updated', handleTicketUpdate);
          socket.off('ticket_deleted', handleTicketDelete);
          socket.off('ticket_created', handleTicketCreate);
          socket.off('final_estimate_set', handleFinalEstimateSet);
          socket.off('ticket_selected', handleTicketSelected);
        };
      }
      return undefined;
    };

    // Tentar configurar listeners com retry
    let cleanup = setupSocketListeners();
    
    if (!cleanup) {
      // Se não conseguiu, tentar novamente após delays crescentes
      const retryDelays = [500, 1000, 2000];
      let retryCount = 0;
      
      const retrySetup = () => {
        cleanup = setupSocketListeners();
        if (!cleanup && retryCount < retryDelays.length) {
          setTimeout(retrySetup, retryDelays[retryCount]);
          retryCount++;
        }
      };
      
      setTimeout(retrySetup, retryDelays[0]);
      
      return () => {
        if (cleanup) cleanup();
      };
    }
    
    return cleanup;
  }, [sessionId]); // Evitar refazer efeito ao alterar seleção para não gerar flicker

  // Cleanup do timeout quando componente desmontar
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Callback para notificar seleção de ticket
  const handleTicketClick = (ticket: Ticket) => {
    // Se não for o criador, não permitir seleção
    if (!isCreator) return;
    
    // Usar a função centralizada do hook se disponível
    if (selectTicketDirectly) {
      const isSameTicket = currentTicketId === ticket.id;
      selectTicketDirectly(isSameTicket ? null : ticket.id);
    } else {
      // Fallback para o callback antigo
      onTicketSelect(ticket);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSessionTickets(sessionId);
      if (response.success && response.data) {
        // Ordenar: tickets não estimados primeiro, estimados no final
        const sortedTickets = (response.data as any).sort((a: Ticket, b: Ticket) => {
          // Se ambos são estimados ou ambos não são estimados, ordenar por data
          if ((a.status === "ESTIMATED") === (b.status === "ESTIMATED")) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          // Tickets não estimados primeiro
          return a.status === "ESTIMATED" ? 1 : -1;
        });
        setTickets(sortedTickets);
      }
    } catch (error) {
      console.error("Erro ao carregar tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (data: CreateTicketData) => {
    try {
      const response = await apiService.createTicket(sessionId, data);
      if (response.success && response.data) {
        const newTicket = response.data as any;
        
        if (emitTicketCreated) {
          emitTicketCreated(newTicket);
        }
      }
    } catch (error) {
      console.error("Erro ao criar ticket:", error);
      throw error;
    }
  };

  const handleEditTicket = async (data: CreateTicketData) => {
    if (!editingTicket) return;

    try {
      const response = await apiService.updateTicket(editingTicket.id, data);
      if (response.success && response.data) {
        const updatedTicket = response.data as any;
        
        // NÃO atualizar estado local aqui - deixar o WebSocket fazer isso
        // para evitar duplicação quando o evento ticket_updated chegar
        
        // Emitir evento WebSocket via useSession
        if (emitTicketUpdated) {
          emitTicketUpdated(updatedTicket);
        }
        
        // Se o ticket editado era o selecionado, atualizar o currentTicket
        if (currentTicketId === editingTicket.id) {
          // Recarregar o currentTicket
          if (reloadCurrentTicket) {
            await reloadCurrentTicket();
          }
        }
      }
    } catch (error) {
      console.error("Erro ao editar ticket:", error);
      throw error;
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm(t("tickets.deleteConfirm"))) return;

    try {
      const response = await apiService.deleteTicket(ticketId);
      if (response.success) {
        // NÃO atualizar estado local aqui - deixar o WebSocket fazer isso
        // para evitar duplicação quando o evento ticket_deleted chegar
        
        // Emitir evento WebSocket via useSession
        if (emitTicketDeleted) {
          emitTicketDeleted(ticketId);
        }
        
        // Se o ticket deletado era o selecionado, desselecionar
        if (currentTicketIdRef.current === ticketId) {
          if (emitTicketSelected) {
            emitTicketSelected(null);
          } else {
            const socket = typeof window !== 'undefined' ? (window as any).socket : null;
            if (socket) {
              socket.emit("ticket_selected", { 
                sessionId, 
                ticketId: null 
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro ao deletar ticket:", error);
    }
  };

  const startEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setShowModal(true);
  };

  const handleModalSubmit = async (data: CreateTicketData) => {
    if (editingTicket) {
      await handleEditTicket(data);
    } else {
      await handleCreateTicket(data);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTicket(null);
  };

  const getPriorityColor = (priority: any) => { // Priority type is not directly imported, so using 'any' for now
    switch (priority) {
      case "LOW":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "URGENT":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: any) => { // TicketStatus type is not directly imported, so using 'any' for now
    switch (status) {
      case "PENDING":
        return "bg-gray-100 text-gray-800";
      case "VOTING":
        return "bg-blue-100 text-blue-800";
      case "ESTIMATED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityLabel = (priority: any) => { // Priority type is not directly imported, so using 'any' for now
    switch (priority) {
      case "LOW":
        return t("tickets.priority.low");
      case "MEDIUM":
        return t("tickets.priority.medium");
      case "HIGH":
        return t("tickets.priority.high");
      case "URGENT":
        return t("tickets.priority.urgent");
      default:
        return priority;
    }
  };

  const getStatusLabel = (status: any) => { // TicketStatus type is not directly imported, so using 'any' for now
    switch (status) {
      case "PENDING":
        return t("tickets.status.pending");
      case "VOTING":
        return t("tickets.status.voting");
      case "ESTIMATED":
        return t("tickets.status.estimated");
      default:
        return status;
    }
  };

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
      <TicketModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        ticket={editingTicket}
        isEditing={!!editingTicket}
      />

      {/* Lista de tickets */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border border-gray-200 rounded-lg bg-gray-50 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
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
                  : ticket.status === "ESTIMATED"
                  ? "border-green-200 bg-green-50 hover:border-green-300"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
              } ${isCreator ? "cursor-pointer" : "cursor-default"}`}
              onClick={() => handleTicketClick(ticket)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm mb-1 ${
                    ticket.status === "ESTIMATED" ? "text-green-800" : "text-gray-900"
                  }`}>
                    {ticket.title}
                  </h4>
                  {ticket.description && (
                    <p className={`text-xs mb-2 line-clamp-1 ${
                      ticket.status === "ESTIMATED" ? "text-green-600" : "text-gray-600"
                    }`}>
                      {ticket.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                    {ticket.finalEstimate && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        {getEstimateText(ticket.finalEstimate)}
                      </span>
                    )}
                    {!ticket.finalEstimate && ticket.averageVote && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Média: {typeof ticket.averageVote === 'number' ? ticket.averageVote.toFixed(1) : ticket.averageVote}
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
                  {currentTicketId !== ticket.id && ticket.status === "PENDING" && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      {isCreator ? t("tickets.hints.pendingCreator") : t("tickets.hints.pendingParticipant")}
                    </div>
                  )}
                  
                  {currentTicketId !== ticket.id && ticket.status === "VOTING" && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      ⏳ {t("tickets.status.voting")} - {isCreator ? t("tickets.hints.votingCreator") : t("tickets.hints.votingParticipant")}
                    </div>
                  )}
                  
                  {currentTicketId !== ticket.id && ticket.status === "ESTIMATED" && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      ✅ {t("tickets.status.estimated")} - {isCreator ? t("tickets.hints.estimatedCreator") : t("tickets.hints.estimatedParticipant")}
                    </div>
                  )}
                  
                  {/* Indicador especial para re-votação */}
                  {currentTicketId === ticket.id && ticket.status === "ESTIMATED" && (
                    <div className="mt-2 text-xs text-orange-600 font-medium">
                      🔄 Re-votando ticket estimado
                    </div>
                  )}
                  {currentTicketId === ticket.id && ticket.status === "ESTIMATED" && (
                    <div className="mt-2 text-xs text-orange-600 font-medium">
                      {t("tickets.hints.currentEstimated")}
                    </div>
                  )}
                </div>

                {isCreator && (
                  <div className="flex items-center gap-1 ml-3">
                    {/* Botão de atualizar valor para tickets estimados */}
                    {ticket.status === "ESTIMATED" && onOpenFinalEstimateModal && (
                      <button 
                        onClick={e => { 
                          e.stopPropagation(); 
                          onOpenFinalEstimateModal(ticket); 
                        }} 
                        className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-all duration-200 hover:scale-110 active:scale-95" 
                        title={t("tickets.buttons.updateEstimate")}
                      > 
                        <FlagIcon className="h-4 w-4" /> 
                      </button>
                    )}
                    
                    {/* Editar - sempre disponível */}
                    <button 
                      onClick={e => { 
                        e.stopPropagation(); 
                        startEditTicket(ticket); 
                      }} 
                      className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors" 
                      title={t("tickets.buttons.edit")}
                    > 
                      <PencilIcon className="h-4 w-4" /> 
                    </button>
                    
                    {/* Excluir - sempre disponível */}
                    <button 
                      onClick={e => { 
                        e.stopPropagation(); 
                        handleDeleteTicket(ticket.id); 
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
} 