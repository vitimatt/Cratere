import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cratere - Next.js + Sanity CMS',
  description: 'A Next.js application with embedded Sanity CMS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


