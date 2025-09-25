export type Locale = 'pt' | 'en';

/**
 * Resolve a locale from an Accept-Language header string.
 * Defaults to 'pt' when not provided or unrecognized.
 */
export function resolveLocaleFromHeader(headerValue?: string | null, fallback: Locale = 'pt'): Locale {
  if (!headerValue || typeof headerValue !== 'string') {
    return fallback;
  }

  const normalized = headerValue.toLowerCase();

  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('pt')) return 'pt';

  // Fallback to the provided default
  return fallback;
}


