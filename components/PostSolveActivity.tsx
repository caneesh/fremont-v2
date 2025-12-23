'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PostSolveActivityProps {
  problemText: string
  onDismiss: () => void
}

type Activity = {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action: () => void
  color: string
  benefits: string[]
}

export default function PostSolveActivity({ problemText, onDismiss }: PostSolveActivityProps) {
  const router = useRouter()
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

  useEffect(() => {
    // Define all available activities
    const activities: Activity[] = [
      {
        id: 'explain-to-friend',
        title: 'Explain to a Friend',
        description: 'Solidify your understanding by explaining the solution in your own words.',
        icon: (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        ),
        action: () => {
          onDismiss()
          // Scroll to Explain to a Friend section (if visible on page)
        },
        color: 'blue',
        benefits: [
          'Master the Feynman Technique',
          'Identify gaps in understanding',
          'Improve retention by 2x'
        ]
      },
      {
        id: 'practice-similar',
        title: 'Practice Similar Problems',
        description: 'Test your understanding with variations of this concept.',
        icon: (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
        action: () => {
          onDismiss()
          // Scroll to Practice Similar Problems section
        },
        color: 'purple',
        benefits: [
          'Strengthen pattern recognition',
          'Build problem-solving speed',
          'Apply concepts in new contexts'
        ]
      },
      {
        id: 'next-challenge',
        title: 'Level Up Challenge',
        description: 'Ready for a harder problem? Take on the next challenge.',
        icon: (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
        action: () => {
          onDismiss()
          // Scroll to Next Challenge section
        },
        color: 'green',
        benefits: [
          'Progressive difficulty scaling',
          'Build exam confidence',
          'Master advanced concepts'
        ]
      },
      {
        id: 'spot-mistake',
        title: 'Spot the Mistake',
        description: 'Sharpen your critical thinking by finding errors in student solutions.',
        icon: (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        action: () => {
          router.push('/spot-mistake')
        },
        color: 'orange',
        benefits: [
          'Develop error detection skills',
          'Learn from common mistakes',
          'Essential for exam success'
        ]
      },
      {
        id: 'error-patterns',
        title: 'View Your Error Patterns',
        description: 'Track HOW you make mistakes and improve systematically.',
        icon: (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        action: () => {
          router.push('/error-patterns')
        },
        color: 'red',
        benefits: [
          'Identify recurring mistakes',
          'Get targeted remediation',
          'Track improvement over time'
        ]
      },
    ]

    // Randomly select one activity
    const randomActivity = activities[Math.floor(Math.random() * activities.length)]
    setSelectedActivity(randomActivity)
  }, [router, onDismiss])

  if (!selectedActivity) return null

  const colorClasses = {
    blue: {
      gradient: 'from-blue-50 to-cyan-50',
      border: 'border-blue-400',
      icon: 'bg-blue-100 text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700',
      text: 'text-blue-900',
      benefit: 'text-blue-700'
    },
    purple: {
      gradient: 'from-purple-50 to-pink-50',
      border: 'border-purple-400',
      icon: 'bg-purple-100 text-purple-600',
      button: 'bg-purple-600 hover:bg-purple-700',
      text: 'text-purple-900',
      benefit: 'text-purple-700'
    },
    green: {
      gradient: 'from-green-50 to-emerald-50',
      border: 'border-green-400',
      icon: 'bg-green-100 text-green-600',
      button: 'bg-green-600 hover:bg-green-700',
      text: 'text-green-900',
      benefit: 'text-green-700'
    },
    orange: {
      gradient: 'from-orange-50 to-red-50',
      border: 'border-orange-400',
      icon: 'bg-orange-100 text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700',
      text: 'text-orange-900',
      benefit: 'text-orange-700'
    },
    red: {
      gradient: 'from-red-50 to-pink-50',
      border: 'border-red-400',
      icon: 'bg-red-100 text-red-600',
      button: 'bg-red-600 hover:bg-red-700',
      text: 'text-red-900',
      benefit: 'text-red-700'
    },
  }

  const colors = colorClasses[selectedActivity.color as keyof typeof colorClasses]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`bg-gradient-to-br ${colors.gradient} max-w-md w-full rounded-lg shadow-2xl border-2 ${colors.border} overflow-hidden animate-scale-in`}>
        {/* Header */}
        <div className="p-6 text-center">
          <div className="flex justify-end mb-2">
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${colors.icon} mb-4`}>
            {selectedActivity.icon}
          </div>

          <h2 className={`text-2xl font-bold ${colors.text} mb-2`}>
            Great Job! 🎉
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            You&apos;ve solved the problem. Want to reinforce your learning?
          </p>
        </div>

        {/* Activity Card */}
        <div className="bg-white p-6 mx-4 mb-6 rounded-lg border-2 border-gray-200">
          <h3 className={`text-xl font-bold ${colors.text} mb-2`}>
            {selectedActivity.title}
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            {selectedActivity.description}
          </p>

          {/* Benefits */}
          <div className="space-y-2 mb-4">
            {selectedActivity.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2">
                <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.benefit}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className={`text-sm ${colors.benefit}`}>{benefit}</span>
              </div>
            ))}
          </div>

          <button
            onClick={selectedActivity.action}
            className={`w-full px-6 py-3 ${colors.button} text-white rounded-lg font-semibold transition-colors`}
          >
            {selectedActivity.id === 'spot-mistake' || selectedActivity.id === 'error-patterns'
              ? `Go to ${selectedActivity.title}`
              : `Try ${selectedActivity.title}`}
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <button
            onClick={onDismiss}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
