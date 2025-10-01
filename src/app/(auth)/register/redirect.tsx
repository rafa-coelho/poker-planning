'use client'

import { useEffect } from 'react'
import { APP_CONFIG } from '@nyx/config'

/**
 * Fase 5: Redireciona registro interno para IdP externo
 */
export default function RegisterRedirect() {
  useEffect(() => {
    if (APP_CONFIG.USE_EXTERNAL_IDP && APP_CONFIG.EXTERNAL_IDP_ISSUER) {
      const idpRegisterUrl = `${APP_CONFIG.EXTERNAL_IDP_ISSUER}/register`
      const currentUrl = window.location.href
      const returnUrl = encodeURIComponent(currentUrl)
      
      // Redirecionar para IdP com return URL
      window.location.href = `${idpRegisterUrl}?return_to=${returnUrl}`
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
        <h2>Redirecionando para registro...</h2>
        <p>Você será redirecionado para o Identity Provider.</p>
      </div>
    </div>
  )
}

