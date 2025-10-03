'use client'

import { useEffect } from 'react'

/**
 * Fase 5: Redireciona registro interno para IdP externo
 */
export default function RegisterRedirect() {
  useEffect(() => {
    // Redirecionar para IdP
    const idpUrl = process.env.NEXT_PUBLIC_IDP_ISSUER || 'http://localhost:3100'
    const idpRegisterUrl = `${idpUrl}/register`
    
    console.log('[Redirect] Redirecting to IdP:', idpRegisterUrl)
    window.location.href = idpRegisterUrl
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
        <h2>Redirecionando para registro...</h2>
        <p>Você será redirecionado para o Identity Provider.</p>
      </div>
    </div>
  )
}

