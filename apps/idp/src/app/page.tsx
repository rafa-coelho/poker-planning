"use client"

import { useTranslation } from 'react-i18next'

export default function Home() {
  const { t } = useTranslation('idp')
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>{t('home.title')}</h1>
      <p>{t('home.endpoints')}</p>
      <ul>
        <li>/api/oidc/.well-known/openid-configuration</li>
        <li>/api/oidc/token</li>
        <li>/api/oidc/userinfo</li>
      </ul>
      <p style={{ marginTop: 12 }}>
        <a href="/login">{t('home.login')}</a> · <a href="/register">{t('home.register')}</a>
      </p>
    </div>
  )
}


