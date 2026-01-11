'use client'

/**
 * WarmUpResults Component
 *
 * Shows warm-up session results with block-by-block scores.
 */

import type { WarmUpSession } from '@/types/warmUp'

interface WarmUpResultsProps {
  session: WarmUpSession | null
  onContinue: () => void
}

export default function WarmUpResults({
  session,
  onContinue,
}: WarmUpResultsProps) {
  if (!session) {
    return null
  }

  const blocks = session.assignedBlocks || []
  const completedBlocks = blocks.filter(b => b.status === 'completed')

  // Calculate overall stats
  let totalCorrect = 0
  let totalItems = 0

  completedBlocks.forEach(block => {
    if (block.itemResults) {
      totalItems += block.itemResults.length
      totalCorrect += block.itemResults.filter(r => r.isCorrect).length
    }
  })

  const accuracy = totalItems > 0 ? Math.round((totalCorrect / totalItems) * 100) : 0

  // Calculate duration
  const startTime = session.startedAt ? new Date(session.startedAt).getTime() : 0
  const endTime = session.completedAt ? new Date(session.completedAt).getTime() : Date.now()
  const durationSeconds = Math.round((endTime - startTime) / 1000)
  const durationMinutes = Math.floor(durationSeconds / 60)
  const durationRemainder = durationSeconds % 60

  // Performance message
  const getMessage = (acc: number) => {
    if (acc >= 90) return { text: "Excellent! You're warmed up!", color: 'text-green-600 dark:text-green-400' }
    if (acc >= 70) return { text: 'Good work! Ready to tackle problems.', color: 'text-blue-600 dark:text-blue-400' }
    if (acc >= 50) return { text: 'Not bad! Keep practicing these concepts.', color: 'text-amber-600 dark:text-amber-400' }
    return { text: 'Some review needed. Focus on these topics today.', color: 'text-red-600 dark:text-red-400' }
  }

  const message = getMessage(accuracy)

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-dark-card rounded-2xl shadow-xl dark:shadow-dark-lg border border-slate-200 dark:border-dark-border overflow-hidden">
        {/* Header */}
        <div className="bg-amber-500 p-6 text-white text-center">
          <div className="text-5xl mb-2">
            {accuracy >= 70 ? '🎉' : accuracy >= 50 ? '👍' : '📚'}
          </div>
          <h2 className="text-2xl font-bold">Warm-Up Complete!</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Score circle */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={accuracy >= 70 ? 'text-green-500' : accuracy >= 50 ? 'text-amber-500' : 'text-red-500'}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${accuracy}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-slate-800 dark:text-dark-text-primary">
                  {accuracy}%
                </span>
              </div>
            </div>
          </div>

          {/* Message */}
          <p className={`text-center font-medium ${message.color}`}>
            {message.text}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-50 dark:bg-dark-card-soft rounded-lg p-3">
              <div className="text-xl font-bold text-slate-800 dark:text-dark-text-primary">
                {totalCorrect}/{totalItems}
              </div>
              <div className="text-xs text-slate-500 dark:text-dark-text-muted">
                Correct
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-dark-card-soft rounded-lg p-3">
              <div className="text-xl font-bold text-slate-800 dark:text-dark-text-primary">
                {completedBlocks.length}
              </div>
              <div className="text-xs text-slate-500 dark:text-dark-text-muted">
                Blocks
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-dark-card-soft rounded-lg p-3">
              <div className="text-xl font-bold text-slate-800 dark:text-dark-text-primary">
                {durationMinutes}:{durationRemainder.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-slate-500 dark:text-dark-text-muted">
                Time
              </div>
            </div>
          </div>

          {/* Block details */}
          <div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-dark-text-secondary mb-3">
              Block Scores
            </h3>
            <div className="space-y-2">
              {completedBlocks.map((block, index) => {
                const blockCorrect = block.itemResults?.filter(r => r.isCorrect).length || 0
                const blockTotal = block.itemResults?.length || 0
                const blockScore = block.score ?? (blockTotal > 0 ? Math.round((blockCorrect / blockTotal) * 100) : 0)

                return (
                  <div
                    key={block.blockId}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-dark-card-soft rounded-lg"
                  >
                    <span className="text-sm text-slate-700 dark:text-dark-text-secondary">
                      {index + 1}. {formatBlockName(block.blockId)}
                    </span>
                    <span className={`text-sm font-semibold ${
                      blockScore >= 70 ? 'text-green-600 dark:text-green-400' :
                      blockScore >= 50 ? 'text-amber-600 dark:text-amber-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {blockScore}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Continue button */}
          <button
            onClick={onContinue}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            Continue to Study
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Format block ID into readable name
 */
function formatBlockName(blockId: string): string {
  const name = blockId
    .replace(/^warmup_block_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())

  return name
}
