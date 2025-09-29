"use client";

import "@/i18n/index";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { APP_CONFIG } from "@nyx/config";
// import { OpenModeLandingPage } from "@/components/OpenModeLandingPage";
import {
  ArrowRight,
  Star,
  Users,
  Zap,
  BarChart3,
  Clock,
  Settings,
  Globe,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play
} from "lucide-react";

// Componente para o modo aberto
function OpenModeLandingPageContent() {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [mounted, setMounted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    creatorName: "",
    votingMode: "FIBONACCI" as const,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);


  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    setError(null);

    try {
      const requestBody = {
        ...formData,
        autoReveal: false,
        allowObservers: true,
      };
      
      const response = await fetch('/api/open/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Erro ao criar sessão: ${response.status}`);
      }

      const result = await response.json();
      console.log('Resultado da criação:', result);
       
      // Salvar dados do usuário criador no localStorage
      if (result.participant && typeof window !== 'undefined') {
        const userData = {
          id: result.participant.id,
          name: result.participant.name
        };
        localStorage.setItem(`openModeUser_${result.sessionId}`, JSON.stringify(userData));
        console.log('Dados salvos no localStorage:', userData);
      }
      
      // Definir redirecionamento para ser executado no useEffect
      console.log('Definindo redirecionamento para:', `/open/${result.sessionId}`);
      router.replace(`/open/${result.sessionId}`);
    
    } catch (err) {
      console.error('Erro ao criar sessão:', err);
      setError(`Erro ao criar sessão: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setError(null);
    setLoading(false);
    // Resetar o formulário
    setFormData({
      name: "",
      description: "",
      creatorName: "",
      votingMode: "FIBONACCI" as const,
    });
  };

  const features = [
    {
      icon: Zap,
      title: t("openMode.landing.features.realTime.title"),
      description: t("openMode.landing.features.realTime.description")
    },
    {
      icon: Users,
      title: t("openMode.landing.features.participation.title"),
      description: t("openMode.landing.features.participation.description")
    },
    {
      icon: Clock,
      title: t("openMode.landing.features.temporary.title"),
      description: t("openMode.landing.features.temporary.description")
    },
    {
      icon: Settings,
      title: t("openMode.landing.features.modes.title"),
      description: t("openMode.landing.features.modes.description")
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
              <h1 className="text-2xl font-bold text-blue-600">{APP_CONFIG.APP_NAME}</h1>
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                {t("openMode.landing.subtitle")}
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
              {t("openMode.landing.hero.title")}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t("openMode.landing.hero.subtitle")}
            </p>
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
              {t("openMode.landing.hero.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                {t("openMode.landing.hero.createSession")}
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
              {t("openMode.landing.features.title")}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t("openMode.landing.features.subtitle")}
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
            {t("openMode.landing.cta.title")}
          </h2>
          <p className="text-xl text-green-100 mb-8">
            {t("openMode.landing.cta.subtitle")}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2 mx-auto"
          >
            <Play className="w-5 h-5" />
            {t("openMode.landing.cta.button")}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            {t("openMode.landing.footer.title")}
          </p>
        </div>
      </footer>

      {/* Modal de Criação de Sessão */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t("openMode.createModal.title")}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleCreateSession}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("openMode.createModal.sessionName")}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder={t("openMode.createModal.sessionNamePlaceholder")}
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("openMode.createModal.description")}
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder={t("openMode.createModal.descriptionPlaceholder")}
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="creatorName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("openMode.createModal.creatorName")}
                </label>
                <input
                  type="text"
                  id="creatorName"
                  name="creatorName"
                  value={formData.creatorName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder={t("openMode.createModal.creatorNamePlaceholder")}
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="votingMode" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("openMode.createModal.votingMode")}
                </label>
                <select
                  id="votingMode"
                  name="votingMode"
                  value={formData.votingMode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="FIBONACCI">{t("openMode.createModal.votingModes.fibonacci")}</option>
                  <option value="TSHIRT">{t("openMode.createModal.votingModes.tshirt")}</option>
                  <option value="LINEAR">{t("openMode.createModal.votingModes.linear")}</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {t("openMode.createModal.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t("openMode.createModal.creating")}
                    </>
                  ) : (
                    t("openMode.createModal.create")
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  // Removed plans/pricing from closed landing

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Se estiver no modo aberto, mostrar a landing page do modo aberto
  if (APP_CONFIG.OPEN_MODE) {
    return <OpenModeLandingPageContent />;
  }

  const handleGetStarted = () => {
    router.push("/register");
  };

  // Demo removed

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const features = [
    {
      icon: Zap,
      title: t("landing.features.realTime.title"),
      description: t("landing.features.realTime.description")
    },
    {
      icon: Settings,
      title: t("landing.features.multipleModes.title"),
      description: t("landing.features.multipleModes.description")
    },
    {
      icon: Clock,
      title: t("landing.features.persistentSessions.title"),
      description: t("landing.features.persistentSessions.description")
    },
    {
      icon: Users,
      title: t("landing.features.teamManagement.title"),
      description: t("landing.features.teamManagement.description")
    },
    {
      icon: BarChart3,
      title: t("landing.features.reports.title"),
      description: t("landing.features.reports.description")
    },
    {
      icon: Globe,
      title: t("landing.features.publicSessions.title"),
      description: t("landing.features.publicSessions.description")
    }
  ];

  const testimonials = [
    {
      text: t("landing.testimonials.testimonial1.text"),
      author: t("landing.testimonials.testimonial1.author"),
      role: t("landing.testimonials.testimonial1.role"),
      company: t("landing.testimonials.testimonial1.company"),
      rating: 5
    },
    {
      text: t("landing.testimonials.testimonial2.text"),
      author: t("landing.testimonials.testimonial2.author"),
      role: t("landing.testimonials.testimonial2.role"),
      company: t("landing.testimonials.testimonial2.company"),
      rating: 5
    },
    {
      text: t("landing.testimonials.testimonial3.text"),
      author: t("landing.testimonials.testimonial3.author"),
      role: t("landing.testimonials.testimonial3.role"),
      company: t("landing.testimonials.testimonial3.company"),
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">{APP_CONFIG.APP_NAME}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/login")}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t("login")}
              </button>
              <button
                onClick={handleGetStarted}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t("landing.hero.ctaPrimary")}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              {t("landing.hero.title")}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t("landing.hero.subtitle")}
            </p>
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
              {t("landing.hero.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handleGetStarted}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {t("landing.hero.ctaPrimary")}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-8">
              {t("landing.hero.trustedBy")}
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t("landing.features.title")}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t("landing.features.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-blue-600" />
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

      {/* Pricing Section removed */}

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t("landing.testimonials.title")}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t("landing.testimonials.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-xl">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-gray-600">{testimonial.role}</p>
                  <p className="text-gray-500 text-sm">{testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t("landing.faq.title")}
            </h2>
            <p className="text-xl text-gray-600">
              {t("landing.faq.subtitle")}
            </p>
          </div>
          <div className="space-y-4">
            {(t("landing.faq.questions", { returnObjects: true }) as Array<{ question: string, answer: string }>).map((faq, index: number) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            {t("landing.cta.title")}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {t("landing.cta.subtitle")}
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2 mx-auto"
          >
            {t("landing.cta.button")}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">{APP_CONFIG.APP_NAME}</h3>
              <p className="text-gray-400">
                {t("landing.footer.description")}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footer.product")}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">{t("landing.footer.features")}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t("landing.footer.pricing")}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t("landing.footer.integrations")}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t("landing.footer.api")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footer.support")}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">{t("landing.footer.documentation")}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t("landing.footer.faq")}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t("landing.footer.contact")}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t("landing.footer.status")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footer.company")}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">{t("landing.footer.about")}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t("landing.footer.blog")}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t("landing.footer.careers")}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t("landing.footer.privacy")}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>{t("landing.footer.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
