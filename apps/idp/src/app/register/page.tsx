"use client"

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function RegisterPage() {
  const { t } = useTranslation('idp')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, organizationName })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'error')
      setResult(json)
      // TODO: Redirecionar para app com token
      console.log('[IdP Register] Success:', json)
    } catch (err: any) {
      setError(err?.message || t('errors.unexpected'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 600 }}>
      <h1>{t('register.title')}</h1>
      <p>{t('register.subtitle')}</p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <label>
          <div>{t('register.name')}</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('register.namePlaceholder')}
            style={{ border: '1px solid #ccc', padding: 8, width: '100%' }}
          />
        </label>
        <label>
          <div>{t('register.email')}</div>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder={t('register.emailPlaceholder')}
            required
            style={{ border: '1px solid #ccc', padding: 8, width: '100%' }}
          />
        </label>
        <label>
          <div>Organization Name</div>
          <input
            value={organizationName}
            onChange={e => setOrganizationName(e.target.value)}
            placeholder="Ex: My Company"
            required
            style={{ border: '1px solid #ccc', padding: 8, width: '100%' }}
          />
        </label>
        <label>
          <div>{t('register.password')}</div>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder={t('register.passwordPlaceholder')}
            required
            style={{ border: '1px solid #ccc', padding: 8, width: '100%' }}
          />
        </label>
        <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? t('login.loading') : t('register.submit')}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 16 }}>
          <h2>{t('register.result')}</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      <p style={{ marginTop: 12 }}>
        {t('register.hasAccount')} <a href="/login">{t('register.login')}</a>
      </p>
    </div>
  )
}


