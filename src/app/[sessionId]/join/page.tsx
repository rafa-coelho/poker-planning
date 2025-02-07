"use client";
import "../../../i18n/index";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import toast, { Toaster } from "react-hot-toast";
import { useSession } from "@/components/useSession";

export default function JoinSessionPage () {
  const router = useRouter();
  const { t } = useTranslation("common");
  const { sessionId } = useParams() as { sessionId: string };
  const [name, setName] = useState("");

  const { sessionData } = useSession();

  useEffect(() => {
    const storedName = localStorage.getItem("pokerUserName");
    if (storedName)
      setName(storedName);
  }, [sessionId]);

  function handleJoin (event: React.FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      toast.error(t("errorEnterName"));
      return;
    }

    localStorage.setItem("pokerUserName", name.trim());
    router.push(`/${sessionId}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-100">
      <Toaster position="top-right" reverseOrder={false} />

      {/* Título */}
      <h1 className="text-4xl font-extrabold text-gray-800">{t("joinSessionTitle")}</h1>
      <p className="text-lg text-gray-600 mt-2 text-center">
        {t("joinSessionDescription")} <br />
        <strong>{sessionData.sessionName}</strong>
      </p>

      {/* Formulário */}
      <form onSubmit={handleJoin} className="mt-6 w-full max-w-md bg-white p-6 rounded-lg shadow-md">
        <label className="block text-gray-700 font-medium mb-1">{t("yourName")}</label>
        <input
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-lg shadow-sm"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          type="submit"
          className="mt-4 w-full px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          {t("enterSession")}
        </button>
      </form>
    </div>
  );
}
