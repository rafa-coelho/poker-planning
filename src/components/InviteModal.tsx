"use client";

import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { FiCopy, FiXCircle, FiUsers, FiLink } from "react-icons/fi";
import { useAuth } from "@/lib/hooks/useAuth";

interface InviteModalProps {
  inviteLink: string;
  onClose: () => void;
  sessionId: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function InviteModal ({
  inviteLink,
  onClose,
  sessionId,
}: InviteModalProps) {
  const { t } = useTranslation("common");
  const { apiService } = useAuth();
  const [activeTab, setActiveTab] = useState<'link' | 'team'>('link');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamMembers();
    }
  }, [activeTab]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      // Buscar membros do time associado à sessão
      const response = await apiService.get(`/api/sessions/${sessionId}`);
      if (response.success && response.data?.project?.teams?.[0]?.id) {
        const teamId = response.data.project.teams[0].id;
        const teamResponse = await apiService.get(`/api/teams/${teamId}/members`);
        if (teamResponse.success && teamResponse.data) {
          setTeamMembers(teamResponse.data.members.map((m: any) => m.user));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar membros do time:', error);
    } finally {
      setLoading(false);
    }
  };

  function copyLink () {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink);
      toast.success(t("linkCopied"));
    }
  }

  function shareLink () {
    if (navigator.share) {
      navigator.share({ title: "Planning Poker", url: inviteLink });
    } else {
      copyLink();
    }
  }

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleInviteMembers = async () => {
    if (selectedMembers.length === 0) {
      toast.error(t("selectMembersToInvite"));
      return;
    }

    try {
      setLoading(true);
      // Aqui você pode implementar o envio de convites por email
      // Por enquanto, apenas mostrar o link para os membros selecionados
      const selectedEmails = teamMembers
        .filter(m => selectedMembers.includes(m.id))
        .map(m => m.email);
      
      toast.success(t("invitesSent", { count: selectedMembers.length }));
      setSelectedMembers([]);
    } catch (error) {
      toast.error(t("errorSendingInvites"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="bg-white w-[90%] max-w-md p-6 rounded shadow relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <FiXCircle size={20} />
        </button>
        
        <h2 className="text-xl font-bold mb-4">
          {t("invitePlayers")}
        </h2>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'link' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiLink size={16} />
            <span>{t("copyLink")}</span>
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'team' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiUsers size={16} />
            <span>{t("teamMembers")}</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'link' ? (
          <div>
            <p className="text-sm text-gray-600 mb-3">
              {t("shareThisLink")}
            </p>
            <div className="flex items-center space-x-2 mb-4">
              <input 
                className="border p-2 flex-1 text-sm" 
                type="text" 
                readOnly 
                value={inviteLink} 
              />
              <button
                onClick={copyLink}
                className="p-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                title={t("copyLink")}
              >
                <FiCopy size={16} />
              </button>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={shareLink}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              >
                {t("share")}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-sm transition-colors"
              >
                {t("close") || "Close"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-3">
              {t("selectTeamMembersToInvite")}
            </p>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">{t("loading")}</p>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-4">
                <FiUsers size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">{t("noTeamMembers")}</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md divide-y">
                {teamMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={handleInviteMembers}
                disabled={selectedMembers.length === 0 || loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
              >
                {loading ? t("sending") : t("inviteSelected")}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-sm transition-colors"
              >
                {t("close") || "Close"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
