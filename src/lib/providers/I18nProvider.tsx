'use client';

import { ReactNode } from 'react';

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  return <>{children}</>;
}