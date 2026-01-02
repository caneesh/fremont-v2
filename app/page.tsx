'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SolvePage from '@/components/solve/SolvePage'
import MobileNav from '@/components/MobileNav'
import { FEATURE_FLAGS } from '@/lib/featureFlags'

/**
 * Home page routing logic:
 *
 * When DASHBOARD_V3 is enabled:
 * - / redirects to /study-path (dashboard)
 * - /?question=... redirects to /solve?question=...
 * - /?loadProblem=... redirects to /solve?loadProblem=...
 *
 * When DASHBOARD_V3 is disabled (legacy):
 * - / renders the solver directly (existing behavior)
 */
function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    // Only handle redirects when Dashboard v3 is enabled
    if (!FEATURE_FLAGS.DASHBOARD_V3) return

    // Check for query parameters that should go to /solve
    const questionId = searchParams.get('question')
    const loadProblemId = searchParams.get('loadProblem')

    if (questionId || loadProblemId) {
      // Preserve query params and redirect to /solve
      const params = new URLSearchParams()
      if (questionId) params.set('question', questionId)
      if (loadProblemId) params.set('loadProblem', loadProblemId)
      router.replace(`/solve?${params.toString()}`)
    } else {
      // No query params - redirect to dashboard
      router.replace('/study-path')
    }
  }, [searchParams, router])

  // When Dashboard v3 is enabled, show loading while redirecting
  if (FEATURE_FLAGS.DASHBOARD_V3) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-accent mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Loading...</p>
        </div>
      </main>
    )
  }

  // Legacy layout - render solver directly on home page
  return (
    <>
      <MobileNav />
      <SolvePage useDashboardLayout={false} />
    </>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <HomeContent />
    </Suspense>
  )
}
