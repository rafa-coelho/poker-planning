import i18next from 'i18next'

// Importar as traduções diretamente
import ptCommon from './locales/pt/common.json'
import ptDashboard from './locales/pt/dashboard.json'
import enCommon from './locales/en/common.json'
import enDashboard from './locales/en/dashboard.json'

const resources = {
  pt: {
    common: ptCommon,
    dashboard: ptDashboard,
  },
  en: {
    common: enCommon,
    dashboard: enDashboard,
  },
}

i18next.init({
  resources,
  fallbackLng: 'pt',
  debug: false,
  interpolation: {
    escapeValue: false,
  },
})

export default i18next 