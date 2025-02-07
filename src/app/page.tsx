"use client";

import "../i18n/index";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useSession } from "@/components/useSession";
import { Loader } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";


export default function HomePage () {
  const router = useRouter();
  const { t } = useTranslation("common");
  const { createSession } = useSession();
  const [sessionName, setSessionName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!sessionName.trim()) {
      toast.error(t("errorEnterSessionName"));

      return;
    }

    setLoading(true);
    try {
      const sessionId = createSession(sessionName);
      router.push(`/${sessionId}/join`);
    } catch (error) {
      toast.error(t("errorCreatingSession"));
      console.error("Erro ao criar a sessão:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreateSession}>
      <main className="flex flex-col items-center justify-center min-h-screen px-6 bg-gray-100">
        <Toaster position="top-center" reverseOrder={false} />

        {/* Título */}
        <h1 className="text-4xl font-extrabold text-gray-800">{t("welcomeTitle")}</h1>
        <p className="text-lg text-gray-600 mt-2">{t("welcomeDescription")}</p>


        {/* Campo de Nome da Sessão */}
        <div className="mt-6 w-full max-w-md">
          <label className="block text-gray-700 font-medium mb-1">{t("sessionName")}</label>
          <input
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 text-lg shadow-sm"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder={t("sessionPlaceholder")}
          />
        </div>

        {/* Botão de Criar Sessão */}
        <button
          type="submit"
          className="mt-4 px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? <Loader className="animate-spin w-5 h-5" /> : t("createGame")}
        </button>
      </main>
    </form>
  );
}
