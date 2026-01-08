'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SolvePage from '@/components/solve/SolvePage'
import MobileNav from '@/components/MobileNav'
import ShellSkeleton from '@/components/shell/ShellSkeleton'
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
 *
 * IMPORTANT: We show a proper ShellSkeleton during redirect instead of a
 * simple spinner to avoid the "spinner -> redirect -> spinner" experience.
 * The skeleton matches the target layout structure for seamless transition.
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

  // When Dashboard v3 is enabled, show skeleton while redirecting
  // This eliminates the "spinner -> redirect -> spinner" experience
  if (FEATURE_FLAGS.DASHBOARD_V3) {
    // Determine which skeleton to show based on redirect target
    const questionId = searchParams.get('question')
    const loadProblemId = searchParams.get('loadProblem')
    const targetIsSolve = !!(questionId || loadProblemId)

    return <ShellSkeleton variant={targetIsSolve ? 'solve' : 'dashboard'} />
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
    <Suspense fallback={<ShellSkeleton variant="dashboard" />}>
      <HomeContent />
    </Suspense>
  )
}
