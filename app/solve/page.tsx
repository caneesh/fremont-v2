'use client'

import { Suspense } from 'react'
import SolvePage from '@/components/solve/SolvePage'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import MobileNav from '@/components/MobileNav'

function SolvePageContent() {
  // When Dashboard v3 is enabled, the AppShell handles navigation
  // Otherwise, we need to include MobileNav for legacy layout
  const useDashboardLayout = FEATURE_FLAGS.DASHBOARD_V3

  if (!useDashboardLayout) {
    return (
      <>
        <MobileNav />
        <SolvePage useDashboardLayout={false} />
      </>
    )
  }

  return <SolvePage useDashboardLayout={true} />
}

export default function SolveRoute() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <SolvePageContent />
    </Suspense>
  )
}
