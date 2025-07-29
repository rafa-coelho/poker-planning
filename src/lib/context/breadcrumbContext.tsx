"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Breadcrumb {
  name: string;
  href: string;
}

interface BreadcrumbContextType {
  customBreadcrumbs: Breadcrumb[];
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  clearBreadcrumbs: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const useBreadcrumbs = () => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider');
  }
  return context;
};

interface BreadcrumbProviderProps {
  children: ReactNode;
}

export const BreadcrumbProvider: React.FC<BreadcrumbProviderProps> = ({ children }) => {
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState<Breadcrumb[]>([]);

  const setBreadcrumbs = useCallback((breadcrumbs: Breadcrumb[]) => {
    setCustomBreadcrumbs(breadcrumbs);
  }, []);

  const clearBreadcrumbs = useCallback(() => {
    setCustomBreadcrumbs([]);
  }, []);

  return (
    <BreadcrumbContext.Provider value={{
      customBreadcrumbs,
      setBreadcrumbs,
      clearBreadcrumbs,
    }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};