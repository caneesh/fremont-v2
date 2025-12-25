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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Error Pattern Analytics
            </h1>
            <p className="text-gray-600">
              Track HOW you&apos;re making mistakes, not just IF you&apos;re making them.
              Identify recurring patterns and improve systematically.
            </p>
          </div>
        </div>

        {/* Analytics Dashboard */}
        <ErrorPatternAnalytics studentId={studentId} />

        {/* Help Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">How It Works</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div>
                <strong>Pattern Detection:</strong> When you struggle with a problem (use 3+ hint levels),
                our AI analyzes your approach to identify fundamental error patterns.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <strong>Pattern Tracking:</strong> Each mistake is categorized (e.g., &quot;Chooses energy when force analysis is required&quot;)
                and tracked over time across different problems.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div>
                <strong>Insights & Warnings:</strong> Get personalized insights like &quot;You&apos;ve made this mistake 3 times&quot;
                and receive targeted remediation advice to fix each pattern.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold text-xs">
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
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Error Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-gray-50 rounded">
              <strong className="text-gray-900">Conceptual Confusion:</strong>
              <p className="text-gray-600">Mixing up fundamental physics concepts</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <strong className="text-gray-900">Method Selection:</strong>
              <p className="text-gray-600">Choosing wrong approach or solution method</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <strong className="text-gray-900">Sign Convention:</strong>
              <p className="text-gray-600">Getting positive/negative signs wrong</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <strong className="text-gray-900">Vector/Scalar Confusion:</strong>
              <p className="text-gray-600">Treating vectors as scalars or vice versa</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <strong className="text-gray-900">Conservation Misapplication:</strong>
              <p className="text-gray-600">Wrongly applying conservation laws</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <strong className="text-gray-900">Reference Frame Issues:</strong>
              <p className="text-gray-600">Mixing different reference frames</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <strong className="text-gray-900">Assumption Violation:</strong>
              <p className="text-gray-600">Making invalid assumptions</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <strong className="text-gray-900">Boundary Conditions:</strong>
              <p className="text-gray-600">Ignoring problem constraints</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
