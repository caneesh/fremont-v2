'use client'

import { useRouter } from 'next/navigation'

interface PostSolveActivityProps {
  problemText: string
  onDismiss: () => void
}

export default function PostSolveActivity({ problemText, onDismiss }: PostSolveActivityProps) {
  const router = useRouter()

  // Only show "Spot the Mistake" activity
  const activity = {
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
  }

  // Orange color theme for Spot the Mistake
  const colors = {
    gradient: 'from-orange-50 to-red-50',
    border: 'border-orange-400',
    icon: 'bg-orange-100 text-orange-600',
    button: 'bg-orange-600 hover:bg-orange-700',
    text: 'text-orange-900',
    benefit: 'text-orange-700'
  }

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
            {activity.icon}
          </div>

          <h2 className={`text-2xl font-bold ${colors.text} mb-2`}>
            Great Job! 🎉
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            You&apos;ve solved the problem. Want to sharpen your critical thinking?
          </p>
        </div>

        {/* Activity Card */}
        <div className="bg-white p-6 mx-4 mb-6 rounded-lg border-2 border-gray-200">
          <h3 className={`text-xl font-bold ${colors.text} mb-2`}>
            {activity.title}
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            {activity.description}
          </p>

          {/* Benefits */}
          <div className="space-y-2 mb-4">
            {activity.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2">
                <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.benefit}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className={`text-sm ${colors.benefit}`}>{benefit}</span>
              </div>
            ))}
          </div>

          <button
            onClick={activity.action}
            className={`w-full px-6 py-3 ${colors.button} text-white rounded-lg font-semibold transition-colors`}
          >
            Go to {activity.title}
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
