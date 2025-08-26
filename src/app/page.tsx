"use client";

import "@/i18n/index";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { usePlans } from "@/lib/hooks/usePlans";
import {
  ArrowRight,
  Check,
  Star,
  Users,
  Zap,
  BarChart3,
  Clock,
  Settings,
  Globe,
  ChevronDown,
  ChevronUp,
  Loader2
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { t } = useTranslation("common");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { plans, loading: plansLoading, error: plansError } = usePlans();

  const handleGetStarted = () => {
    router.push("/register");
  };

  const handleWatchDemo = () => {
    // Implementar modal de demonstração
    console.log("Watch demo clicked");
  };

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
              <h1 className="text-2xl font-bold text-blue-600">Poker Planning</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleWatchDemo}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Demo
              </button>
              <button
                onClick={() => router.push("/login")}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </button>
              <button
                onClick={handleGetStarted}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Começar
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
              <button
                onClick={handleWatchDemo}
                className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                {t("landing.hero.ctaSecondary")}
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

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t("landing.pricing.title")}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t("landing.pricing.subtitle")}
            </p>
          </div>

          {plansLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">{t("landing.loading.plans")}</span>
            </div>
          ) : plansError ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{t("landing.loading.error")}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {t("landing.loading.retry")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-white p-8 rounded-xl shadow-sm border ${plan.popular ? 'shadow-lg border-2 border-blue-500 relative' : ''
                    }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        {t("landing.pricing.pro.popular")}
                      </span>
                    </div>
                  )}

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price === 0 ? 'Gratuito' : `R$ ${plan.price}`}
                    </span>
                    <span className="text-gray-600">
                      {plan.period === 'monthly' ? '/mês' : '/ano'}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-8">
                    {plan.description}
                  </p>

                  <ul className="space-y-4 mb-8">
                    {plan.features
                      .filter(feature => feature.included)
                      .map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="w-5 h-5 text-green-500 mr-3" />
                          <span className="text-gray-700">{feature.name}</span>
                        </li>
                      ))}
                  </ul>

                  <button
                    onClick={plan.id === 'enterprise' ? handleWatchDemo : handleGetStarted}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

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
              <h3 className="text-xl font-bold mb-4">Poker Planning</h3>
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
