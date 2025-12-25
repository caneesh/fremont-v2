'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PageHeaderProps {
  showBackButton?: boolean
  backButtonText?: string
  backButtonPath?: string
}

export default function PageHeader({
  showBackButton = true,
  backButtonText = 'Back to Home',
  backButtonPath = '/'
}: PageHeaderProps) {
  const router = useRouter()

  return (
    <div className="mb-4">
      {/* PhysiScaffold Branding - Links to Home */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 group mb-3"
      >
        <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
          PhysiScaffold
        </span>
        <svg
          className="w-4 h-4 text-gray-400 dark:text-dark-text-muted group-hover:text-gray-600 dark:group-hover:text-dark-text-secondary transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </Link>

      {/* Back Button */}
      {showBackButton && (
        <button
          onClick={() => router.push(backButtonPath)}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-card-soft rounded-lg active:scale-95 transition-all min-h-[44px]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm sm:text-base font-medium">{backButtonText}</span>
        </button>
      )}
    </div>
  )
}
