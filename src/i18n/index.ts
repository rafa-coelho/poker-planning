import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/common.json';
import pt from './locales/pt/common.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      pt: { common: pt },
    },
    lng: 'en', // ou detecte automaticamente
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
