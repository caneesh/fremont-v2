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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isPulling && pullDistance > 60} />
      <MobileNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <header className="mb-6 md:mb-8">
          <div className="mb-4">
            <button
              onClick={() => router.push('/')}
              className="px-3 py-2 text-gray-700 hover:text-gray-900 flex items-center gap-2 active:scale-95 transition-transform min-h-[44px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm sm:text-base">Back to Home</span>
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500 mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Concept Mastery Map</h1>
            <p className="text-gray-600">
              Track your mastery across all physics concepts. Click on weak concepts (red nodes) to start targeted practice.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div></div>
            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-3">
              <button
                onClick={() => router.push('/study-path')}
                className="px-6 py-3 bg-white border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 flex items-center gap-2 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Study Path
              </button>
              <button
                onClick={() => router.push('/history')}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
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
        <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200" style={{ height: '70vh', minHeight: '500px' }}>
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
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How to Use the Concept Map</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Green nodes</strong>: High mastery (≥75%) - You&apos;ve got this!</li>
            <li>• <strong>Yellow nodes</strong>: Medium mastery (40-75%) - Keep practicing</li>
            <li>• <strong>Red nodes</strong>: Low mastery (&lt;40%) - Click to start Repair Mode</li>
            <li>• <strong>Gray nodes</strong>: No practice data yet - Solve problems to build mastery</li>
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
