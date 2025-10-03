'use client'

import { useEffect } from 'react'

/**
 * Fase 5: Redireciona login interno para IdP externo
 */
export default function LoginRedirect() {
  useEffect(() => {
    // Redirecionar para IdP
    const idpUrl = process.env.NEXT_PUBLIC_IDP_ISSUER || 'http://localhost:3100'
    const idpLoginUrl = `${idpUrl}/login`
    
    console.log('[Redirect] Redirecting to IdP:', idpLoginUrl)
    window.location.href = idpLoginUrl
  }, [])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Redirecionando para login...</h2>
        <p>Você será redirecionado para o Identity Provider.</p>
      </div>
    </div>
  )
}

