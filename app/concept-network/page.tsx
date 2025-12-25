'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConceptMapVisualization from '@/components/ConceptMapVisualization'
import RepairModeModal from '@/components/RepairModeModal'
import MobileNav from '@/components/MobileNav'
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import type { ConceptMasteryData } from '@/types/conceptMastery'
import PageHeader from '@/components/PageHeader'

export default function ConceptNetworkPage() {
  const router = useRouter()
  const [repairConcept, setRepairConcept] = useState<{ id: string; name: string } | null>(null)

  // Pull to refresh - reload the page
  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 800))
    window.location.reload()
  }

  const { isPulling, pullDistance } = usePullToRefresh(handleRefresh)

  // Swipe gestures
  useSwipeGesture({
    onSwipeLeft: () => {
      if (window.innerWidth < 768) {
        router.push('/study-path')
      }
    },
    onSwipeRight: () => {
      if (window.innerWidth < 768) {
        router.push('/')
      }
    },
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isPulling && pullDistance > 60} />
      <MobileNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <header className="mb-6 md:mb-8">
          <PageHeader />

          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 border-l-4 border-purple-500 dark:border-purple-400 mb-4 border-r border-t border-b border-transparent dark:border-r-dark-border dark:border-t-dark-border dark:border-b-dark-border">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">Concept Mastery Map</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary">
              Track your mastery across all physics concepts. Click on weak concepts (red nodes) to start targeted practice.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div></div>
            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-3">
              <button
                onClick={() => router.push('/study-path')}
                className="px-5 py-2.5 bg-white dark:bg-dark-card border border-accent text-accent rounded-lg hover:bg-blue-50 dark:hover:bg-accent/10 flex items-center gap-2 font-medium transition-all hover:shadow-md dark:hover:shadow-dark-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Study Path
              </button>
              <button
                onClick={() => router.push('/history')}
                className="px-5 py-2.5 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft flex items-center gap-2 transition-all hover:shadow-md dark:hover:shadow-dark-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </button>
            </div>
          </div>
        </header>

        {/* Network Visualization */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg border border-gray-200 dark:border-dark-border" style={{ height: '70vh', minHeight: '500px' }}>
          <ConceptMapVisualization
            onNodeClick={(conceptId, masteryData) => {
              // Open repair mode for weak concepts (mastery < 0.4)
              if (masteryData && masteryData.masteryScore < 0.4) {
                setRepairConcept({ id: conceptId, name: masteryData.conceptName })
              }
            }}
          />
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 dark:bg-accent/10 border border-blue-200 dark:border-accent/30 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-accent mb-2">How to Use the Concept Map</h3>
          <ul className="text-sm text-blue-800 dark:text-dark-text-secondary space-y-1">
            <li>• <strong className="dark:text-dark-text-primary">Green nodes</strong>: High mastery (≥75%) - You&apos;ve got this!</li>
            <li>• <strong className="dark:text-dark-text-primary">Yellow nodes</strong>: Medium mastery (40-75%) - Keep practicing</li>
            <li>• <strong className="dark:text-dark-text-primary">Red nodes</strong>: Low mastery (&lt;40%) - Click to start Repair Mode</li>
            <li>• <strong className="dark:text-dark-text-primary">Gray nodes</strong>: No practice data yet - Solve problems to build mastery</li>
            <li>• Click on any node to see details and practice history</li>
            <li>• Use the minimap (bottom right) to navigate large graphs</li>
          </ul>
        </div>
      </div>

      {/* Repair Mode Modal */}
      {repairConcept && (
        <RepairModeModal
          conceptId={repairConcept.id}
          conceptName={repairConcept.name}
          onClose={() => setRepairConcept(null)}
          onComplete={() => {
            // Could trigger a refresh of mastery data here
            console.log('Repair mode completed for', repairConcept.name)
          }}
        />
      )}
    </main>
  )
}
