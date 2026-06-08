import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UDSM Secure VoIP System Portal',
  description: 'University of Dar es Salaam - Secure VoIP Portal powered by Asterisk PBX',
  icons: {
    icon: '/images/udsm-logo.png',
    apple: '/images/udsm-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        {children}
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  )
}