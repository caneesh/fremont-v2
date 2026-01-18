import type { Metadata } from 'next'
import { ThemeProvider } from '@/lib/ThemeContext'
import { ToastProvider } from '@/components/ui/ToastProvider'

export const metadata: Metadata = {
  title: 'PhysiScaffold Demo - Experience Socratic Physics',
  description: 'Try our guided physics problem-solving approach - no login required.',
}

/**
 * Demo Layout - Bypasses AuthGate for zero-login demo experience
 */
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  )
}
