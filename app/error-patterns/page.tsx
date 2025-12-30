'use client'

import { useState, useEffect } from 'react'
import ErrorPatternAnalytics from '@/components/ErrorPatternAnalytics'
import PageHeader from '@/components/PageHeader'
import MobileNav from '@/components/MobileNav'

export default function ErrorPatternsPage() {
  const [studentId, setStudentId] = useState<string>('anonymous')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('physiscaffold_user') || 'anonymous'
      setStudentId(userId)
    }
  }, [])

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-dark-app dark:via-dark-card dark:to-dark-app flex items-center justify-center">
        <div className="animate-pulse text-gray-500 dark:text-dark-text-muted">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-dark-app dark:via-dark-card dark:to-dark-app py-8 px-4">
      <MobileNav />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <PageHeader />

          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 border-l-4 border-blue-500 dark:border-accent">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
              Error Pattern Analytics
            </h1>
            <p className="text-gray-600 dark:text-dark-text-secondary">
              Track HOW you&apos;re making mistakes, not just IF you&apos;re making them.
              Identify recurring patterns and improve systematically.
            </p>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <ErrorPatternAnalytics studentId={studentId} />

        {/* Help Section */}
        <div className="mt-8 bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-3">How It Works</h2>
          <div className="space-y-3 text-sm text-gray-700 dark:text-dark-text-secondary">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <strong>Pattern Detection:</strong> When you struggle with a problem (use 3+ hint levels),
                our AI analyzes your approach to identify fundamental error patterns.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <strong>Pattern Tracking:</strong> Each mistake is categorized (e.g., &quot;Chooses energy when force analysis is required&quot;)
                and tracked over time across different problems.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <strong>Insights & Warnings:</strong> Get personalized insights like &quot;You&apos;ve made this mistake 3 times&quot;
                and receive targeted remediation advice to fix each pattern.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <div>
                <strong>Mastery Tracking:</strong> Patterns are marked as &quot;Mastered&quot; when you haven&apos;t made
                that mistake in your last 5 relevant problems.
              </div>
            </div>
          </div>
        </div>

        {/* Categories Explained */}
        <div className="mt-8 bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-3">Error Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-gray-50 dark:bg-dark-card-soft rounded">
              <strong className="text-gray-900 dark:text-dark-text-primary">Conceptual Confusion:</strong>
              <p className="text-gray-600 dark:text-dark-text-secondary">Mixing up fundamental physics concepts</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-dark-card-soft rounded">
              <strong className="text-gray-900 dark:text-dark-text-primary">Method Selection:</strong>
              <p className="text-gray-600 dark:text-dark-text-secondary">Choosing wrong approach or solution method</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-dark-card-soft rounded">
              <strong className="text-gray-900 dark:text-dark-text-primary">Sign Convention:</strong>
              <p className="text-gray-600 dark:text-dark-text-secondary">Getting positive/negative signs wrong</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-dark-card-soft rounded">
              <strong className="text-gray-900 dark:text-dark-text-primary">Vector/Scalar Confusion:</strong>
              <p className="text-gray-600 dark:text-dark-text-secondary">Treating vectors as scalars or vice versa</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-dark-card-soft rounded">
              <strong className="text-gray-900 dark:text-dark-text-primary">Conservation Misapplication:</strong>
              <p className="text-gray-600 dark:text-dark-text-secondary">Wrongly applying conservation laws</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-dark-card-soft rounded">
              <strong className="text-gray-900 dark:text-dark-text-primary">Reference Frame Issues:</strong>
              <p className="text-gray-600 dark:text-dark-text-secondary">Mixing different reference frames</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-dark-card-soft rounded">
              <strong className="text-gray-900 dark:text-dark-text-primary">Assumption Violation:</strong>
              <p className="text-gray-600 dark:text-dark-text-secondary">Making invalid assumptions</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-dark-card-soft rounded">
              <strong className="text-gray-900 dark:text-dark-text-primary">Boundary Conditions:</strong>
              <p className="text-gray-600 dark:text-dark-text-secondary">Ignoring problem constraints</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
