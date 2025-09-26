import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { APP_CONFIG } from '@nyx/config';
import enCommon from './locales/en/common.json';
import ptCommon from './locales/pt/common.json';
import enDashboard from './locales/en/dashboard.json';
import ptDashboard from './locales/pt/dashboard.json';

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
    fallbackLng: 'en',
    interpolation: { 
      escapeValue: false,
      defaultVariables: {
        appName: APP_CONFIG.APP_NAME,
        year: (() => {
          const currentYear = new Date().getFullYear();
          return `2025${currentYear > 2025 ? '-' + currentYear : ''}`;
        })(),
      }
    },
    react: {
      useSuspense: false, // Importante para Next.js
    },
  });

export default i18n;
