"use client"

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function LoginPage() {
  const { t } = useTranslation('idp')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'error')
      setResult(json)
      // TODO: Redirecionar para app com token
      console.log('[IdP Login] Success:', json)
    } catch (err: any) {
      setError(err?.message || t('errors.unexpected'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 600 }}>
      <h1>{t('login.title')}</h1>
      <p>{t('login.subtitle')}</p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <label>
          <div>{t('login.username')}</div>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder={t('login.usernamePlaceholder')}
            type="email"
            required
            style={{ border: '1px solid #ccc', padding: 8, width: '100%' }}
          />
        </label>
        <label>
          <div>{t('login.password')}</div>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder={t('login.passwordPlaceholder')}
            required
            style={{ border: '1px solid #ccc', padding: 8, width: '100%' }}
          />
        </label>
        <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? t('login.loading') : t('login.submit')}
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 16 }}>
          <h2>{t('login.result')}</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      <p style={{ marginTop: 12 }}>
        {t('login.noAccount')} <a href="/register">{t('login.register')}</a>
      </p>
    </div>
  )
}


