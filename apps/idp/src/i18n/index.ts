import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enIdp from './locales/en/idp.json'
import ptIdp from './locales/pt/idp.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { idp: enIdp },
      pt: { idp: ptIdp },
    },
    lng: 'pt',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    defaultNS: 'idp',
  })

export default i18n


