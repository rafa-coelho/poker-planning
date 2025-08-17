import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import ptCommon from './locales/pt/common.json';
import enDashboard from './locales/en/dashboard.json';
import ptDashboard from './locales/pt/dashboard.json';
import enSessions from './locales/en/sessions.json';
import ptSessions from './locales/pt/sessions.json';
import enProjects from './locales/en/projects.json';
import ptProjects from './locales/pt/projects.json';
import enTeams from './locales/en/teams.json';
import ptTeams from './locales/pt/teams.json';
import enVotes from './locales/en/votes.json';
import ptVotes from './locales/pt/votes.json';
import enTickets from './locales/en/tickets.json';
import ptTickets from './locales/pt/tickets.json';
import enAuth from './locales/en/auth.json';
import ptAuth from './locales/pt/auth.json';
import enReports from './locales/en/reports.json';
import ptReports from './locales/pt/reports.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { 
        common: enCommon,
        dashboard: enDashboard,
        sessions: enSessions,
        projects: enProjects,
        teams: enTeams,
        votes: enVotes,
        tickets: enTickets,
        auth: enAuth,
        reports: enReports
      },
      pt: { 
        common: ptCommon,
        dashboard: ptDashboard,
        sessions: ptSessions,
        projects: ptProjects,
        teams: ptTeams,
        votes: ptVotes,
        tickets: ptTickets,
        auth: ptAuth,
        reports: ptReports
      },
    },
    lng: 'pt', // Português como padrão
    fallbackLng: 'pt',
    interpolation: { escapeValue: false },
    react: {
      useSuspense: false, // Importante para Next.js
    },
  });

export default i18n;
