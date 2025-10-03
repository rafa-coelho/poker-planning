"use client"

import './globals.css'
import '../i18n'
import { useEffect } from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ensure client i18n is initialized
  }, [])
  return (
    <html lang="pt" className="h-full">
      <body className="h-full bg-gradient-to-br from-blue-50 to-indigo-100">{children}</body>
    </html>
  )
}


