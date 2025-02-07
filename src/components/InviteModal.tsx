"use client";

import React from "react";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { FiCopy, FiXCircle } from "react-icons/fi";

interface InviteModalProps {
  inviteLink: string;
  onClose: () => void;
}

export default function InviteModal ({
  inviteLink,
  onClose,
}: InviteModalProps) {
  const { t } = useTranslation("common");

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
        <h2 className="text-xl font-bold mb-3">
          {t("invitePlayers")}
        </h2>
        <p className="text-sm text-gray-600">
          {t("shareThisLink")}
        </p>
        <div className="flex items-center mt-3 space-x-2">
          <input className="border p-2 flex-1" type="text" readOnly value={inviteLink} />
          <button
            onClick={copyLink}
            className="p-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            <FiCopy />
          </button>
        </div>
        <div className="flex justify-end mt-4 space-x-2">
          <button
            onClick={shareLink}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            {t("share")}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
          >
            {t("close") || "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
