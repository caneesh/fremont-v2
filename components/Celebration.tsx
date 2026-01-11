'use client'

import { useEffect, useState } from 'react'

interface CelebrationProps {
  show: boolean
  onComplete?: () => void
}

/**
 * Subtle success feedback component
 * Shows a calm, minimal success message that fades in and out
 */
export default function Celebration({ show, onComplete }: CelebrationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)

      // Auto-hide after brief display
      const timer = setTimeout(() => {
        setIsVisible(false)
        onComplete?.()
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-fade-in bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 text-center max-w-sm mx-4 shadow-sm">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
          Problem Solved
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Keep up the momentum.
        </p>
      </div>
    </div>
  )
}
