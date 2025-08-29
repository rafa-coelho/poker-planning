'use client';

import { useState, useEffect } from 'react';
import { APP_CONFIG } from '@/lib/config';

interface OpenModeWrapperProps {
  children: React.ReactNode;
}

export function OpenModeWrapper({ children }: OpenModeWrapperProps) {
  const [isClient, setIsClient] = useState(false);
  const [isOpenMode, setIsOpenMode] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setIsOpenMode(APP_CONFIG.OPEN_MODE);
  }, []);

  // Não renderizar nada até que estejamos no cliente
  if (!isClient) {
    return null;
  }

  // Se não estiver no modo aberto, não renderizar
  if (!isOpenMode) {
    return null;
  }

  return <>{children}</>;
}
