"use client";

import "@/i18n/index";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { APP_CONFIG } from "@/lib/config";
import {
  ArrowRight,
  Users,
  Zap,
  Clock,
  Settings,
  Play,
} from "lucide-react";

export function OpenModeLandingPage() {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [mounted, setMounted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    creatorName: "",
    votingMode: "FIBONACCI",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/open/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          autoReveal: false,
          allowObservers: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar sessão');
      }

      const result = await response.json();
      // No modo aberto, redirecionar para a rota da sessão
      router.push(`/open/${result.sessionId}`);
    } catch (err) {
      setError("Erro ao criar sessão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const features = [
    {
      icon: Zap,
      title: "Votação em Tempo Real",
      description: "Veja os votos dos participantes em tempo real"
    },
    {
      icon: Users,
      title: "Participação Imediata",
      description: "Entre na sessão sem necessidade de cadastro"
    },
    {
      icon: Clock,
      title: "Sessões Temporárias",
      description: "Sessões que expiram automaticamente"
    },
    {
      icon: Settings,
      title: "Múltiplos Modos",
      description: "Fibonacci, T-shirt, Linear e Custom"
    }
  ];

  // Não renderizar até que estejamos no cliente
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Poker Planning</h1>
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Modo Aberto
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-blue-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Poker Planning Gratuito
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Crie e participe de sessões de estimativa sem cadastro
            </p>
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
              Ideal para reuniões rápidas, workshops e testes. Sem persistência, sem complicação.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Criar Sessão
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Como Funciona
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simples, rápido e sem complicações
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Pronto para começar?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Crie sua primeira sessão em menos de 1 minuto
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2 mx-auto"
          >
            <Play className="w-5 h-5" />
            Criar Sessão Agora
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            Poker Planning - Modo Aberto | Versão gratuita para uso temporário
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Para uso empresarial com persistência e recursos avançados, acesse a versão completa
          </p>
        </div>
      </footer>

      {/* Modal de Criação de Sessão */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Criar Nova Sessão
            </h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleCreateSession}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Sessão *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Ex: Sprint Planning - Feature X"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Breve descrição da sessão"
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="creatorName" className="block text-sm font-medium text-gray-700 mb-1">
                  Seu Nome *
                </label>
                <input
                  type="text"
                  id="creatorName"
                  name="creatorName"
                  value={formData.creatorName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Como você quer ser chamado"
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="votingMode" className="block text-sm font-medium text-gray-700 mb-1">
                  Modo de Votação
                </label>
                <select
                  id="votingMode"
                  name="votingMode"
                  value={formData.votingMode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="FIBONACCI">Fibonacci (0, 1, 2, 3, 5, 8, 13, 21)</option>
                  <option value="T_SHIRT">T-Shirt (XS, S, M, L, XL, XXL)</option>
                  <option value="LINEAR">Linear (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)</option>
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {loading ? "Criando..." : "Criar Sessão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
