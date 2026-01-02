'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { FEATURE_FLAGS } from '@/lib/featureFlags'

interface PageHeaderProps {
  showBackButton?: boolean
  backButtonText?: string
  backButtonPath?: string
}

export default function PageHeader({
  showBackButton = true,
  backButtonText = 'Back to Dashboard',
  backButtonPath
}: PageHeaderProps) {
  const router = useRouter()

  // Default to dashboard when v3 is enabled, otherwise legacy home
  const defaultPath = FEATURE_FLAGS.DASHBOARD_V3 ? '/study-path' : '/'
  const resolvedPath = backButtonPath ?? defaultPath

  return (
    <div className="mb-4">
      {/* PhysiScaffold Branding - Links to Dashboard */}
      <Link
        href={defaultPath}
        className="inline-flex items-center gap-2 group mb-3"
      >
        <Image
          src="/logo.png"
          alt="PhysiScaffold"
          width={180}
          height={40}
          className="h-8 sm:h-10 w-auto group-hover:opacity-80 transition-opacity dark:brightness-110 dark:contrast-90"
          priority
        />
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
          onClick={() => router.push(resolvedPath)}
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
