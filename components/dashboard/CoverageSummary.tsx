'use client'

import type { TopicCoverage } from '@/types/dashboard'

interface CoverageSummaryProps {
  coverage: TopicCoverage[]
}

/**
 * Shows topics practiced this week
 */
export default function CoverageSummary({ coverage }: CoverageSummaryProps) {
  if (coverage.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl p-5 shadow-md dark:shadow-dark-md border border-gray-100 dark:border-dark-border">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-3">This Week&apos;s Coverage</h3>
        <p className="text-sm text-gray-500 dark:text-dark-text-muted">No topics practiced yet this week</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-5 shadow-md dark:shadow-dark-md border border-gray-100 dark:border-dark-border">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-3">This Week&apos;s Coverage</h3>
      <div className="flex flex-wrap gap-2">
        {coverage.map(topic => (
          <div
            key={topic.topicId}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-dark-card-soft rounded-full"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
              {topic.topicName}
            </span>
            <span className="text-xs text-gray-500 dark:text-dark-text-muted">
              {topic.questionsSolved}/{topic.questionsAttempted}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
