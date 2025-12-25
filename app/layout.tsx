import type { Metadata } from 'next'
import './globals.css'
import AuthGate from '@/components/AuthGate'
import { ThemeProvider } from '@/lib/ThemeContext'

export const metadata: Metadata = {
  title: 'PhysiScaffold - The Socratic Physics Engine',
  description: 'Active Decomposition: We don\'t give answers; we give the framework for the answer.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>
          <AuthGate>{children}</AuthGate>
        </ThemeProvider>
      </body>
    </html>
  )
}
