import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import ptCommon from './locales/pt/common.json';
import enDashboard from './locales/en/dashboard.json';
import ptDashboard from './locales/pt/dashboard.json';

// Função para detectar idioma do navegador
const detectBrowserLanguage = (): string => {
  if (typeof window === 'undefined') return 'pt'; // SSR fallback
  
  const browserLang = navigator.language || (navigator as any).userLanguage;
  
  // Verifica se é português brasileiro ou português
  if (browserLang.startsWith('pt')) {
    return 'pt';
  }
  
  // Verifica se é inglês
  if (browserLang.startsWith('en')) {
    return 'en';
  }
  
  // Fallback para português
  return 'pt';
};

// Detecta idioma salvo no localStorage ou usa detecção automática
const getInitialLanguage = (): string => {
  if (typeof window === 'undefined') return 'pt'; // SSR fallback
  
  const savedLang = localStorage.getItem('poker-planning-language');
  if (savedLang && ['pt', 'en'].includes(savedLang)) {
    return savedLang;
  }
  
  return detectBrowserLanguage();
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { 
        common: enCommon,
        dashboard: enDashboard
      },
      pt: { 
        common: ptCommon,
        dashboard: ptDashboard
      },
    },
    lng: getInitialLanguage(), // Usa detecção automática
    fallbackLng: 'pt',
    interpolation: { escapeValue: false },
    react: {
      useSuspense: false, // Importante para Next.js
    },
  });

// Salva a mudança de idioma no localStorage
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('poker-planning-language', lng);
  }
});

export default i18n;
