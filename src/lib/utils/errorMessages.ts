import { TFunction } from 'i18next'

/**
 * 🎯 Utility to translate error messages from error codes
 * 
 * This utility handles the translation of error codes returned by the API
 * into user-friendly messages using i18n
 */
export function translateErrorMessage(
  errorCode: string,
  t: TFunction,
  params?: Record<string, any>
): string {
  // Handle error codes with parameters (e.g., "SESSION_LIMIT_REACHED:5")
  if (errorCode.includes(':')) {
    const [baseCode, param] = errorCode.split(':')
    
    // Try to translate with the base code
    const translation = t(`errors.${baseCode}`, { ...params, limit: param })
    
    // If translation exists and is different from the key, return it
    if (translation && translation !== `errors.${baseCode}`) {
      return translation
    }
    
    // Fallback: return the base code
    return baseCode
  }
  
  // Handle simple error codes
  const translation = t(`errors.${errorCode}`, params)
  
  // If translation exists and is different from the key, return it
  if (translation && translation !== `errors.${errorCode}`) {
    return translation
  }
  
  // Fallback: return the error code
  return errorCode
}

/**
 * 🎯 Parse error message to extract parameters
 */
export function parseErrorMessage(message: string): { code: string; params?: Record<string, any> } {
  if (message.includes(':')) {
    const [code, param] = message.split(':')
    return {
      code,
      params: { limit: param }
    }
  }
  
  return { code: message }
} 