'use client'

/**
 * WarmUpGate Component
 *
 * Shows warm-up information and allows the user to start or skip.
 */

import type { WarmUpSession } from '@/types/warmUp'

interface WarmUpGateProps {
  session: WarmUpSession | null
  canSkip: boolean
  isLoading: boolean
  onStart: () => void
  onSkip: (reason?: string) => void
}

export default function WarmUpGate({
  session,
  canSkip,
  isLoading,
  onStart,
  onSkip,
}: WarmUpGateProps) {
  const blocks = session?.assignedBlocks || []
  const totalBlocks = blocks.length
  const estimatedMinutes = Math.min(5, Math.max(2, totalBlocks * 2))

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-dark-card rounded-2xl shadow-xl dark:shadow-dark-lg border border-slate-200 dark:border-dark-border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔥</span>
            <h2 className="text-2xl font-bold">Warm-Up Time!</h2>
          </div>
          <p className="text-amber-100 text-sm">
            Quick drills to activate your physics brain
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-dark-card-soft rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-slate-800 dark:text-dark-text-primary">
                {totalBlocks}
              </div>
              <div className="text-sm text-slate-500 dark:text-dark-text-muted">
                {totalBlocks === 1 ? 'Block' : 'Blocks'}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-dark-card-soft rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-slate-800 dark:text-dark-text-primary">
                ~{estimatedMinutes}
              </div>
              <div className="text-sm text-slate-500 dark:text-dark-text-muted">
                Minutes
              </div>
            </div>
          </div>

          {/* Topics */}
          {blocks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-600 dark:text-dark-text-secondary mb-2">
                Today&apos;s Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {blocks.map((block, index) => (
                  <span
                    key={block.blockId}
                    className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-sm font-medium"
                  >
                    {index + 1}. {formatBlockName(block.blockId)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-300">
            <div className="flex gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                Warm-up helps you review rusty concepts before tackling new problems.
                Complete it to unlock today&apos;s study session!
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={onStart}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Warm-Up
                </>
              )}
            </button>

            {canSkip && (
              <button
                onClick={() => onSkip('User requested skip')}
                disabled={isLoading}
                className="w-full py-2 text-slate-500 dark:text-dark-text-muted hover:text-slate-700 dark:hover:text-dark-text-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Skip today (1 skip remaining)
              </button>
            )}

            {!canSkip && (
              <p className="text-center text-sm text-slate-400 dark:text-dark-text-muted">
                You&apos;ve already skipped today. Complete the warm-up to continue.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Format block ID into readable name
 */
function formatBlockName(blockId: string): string {
  // Remove prefix like "warmup_block_" and format
  const name = blockId
    .replace(/^warmup_block_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())

  return name
}
