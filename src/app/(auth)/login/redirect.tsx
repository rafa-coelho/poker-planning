'use client'

import { useEffect } from 'react'
import { APP_CONFIG } from '@nyx/config'

/**
 * Fase 5: Redireciona login interno para IdP externo
 */
export default function LoginRedirect() {
  useEffect(() => {
    if (APP_CONFIG.USE_EXTERNAL_IDP && APP_CONFIG.EXTERNAL_IDP_ISSUER) {
      const idpLoginUrl = `${APP_CONFIG.EXTERNAL_IDP_ISSUER}/login`
      const currentUrl = window.location.href
      const returnUrl = encodeURIComponent(currentUrl)
      
      // Redirecionar para IdP com return URL
      window.location.href = `${idpLoginUrl}?return_to=${returnUrl}`
    }
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

