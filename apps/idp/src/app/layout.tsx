"use client"

import '../i18n'
import { useEffect } from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ensure client i18n is initialized
  }, [])
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  )
}


