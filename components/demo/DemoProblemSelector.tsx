'use client'

/**
 * DemoProblemSelector - Problem selection screen for the demo
 */

import type { DemoProblem } from '@/lib/demo/demoProblems'

interface DemoProblemSelectorProps {
  problems: DemoProblem[]
  onSelect: (problem: DemoProblem) => void
}

export default function DemoProblemSelector({
  problems,
  onSelect,
}: DemoProblemSelectorProps) {
  const examColors = {
    JEE: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    NEET: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
    Boards: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-3">
          Welcome to PhysiScaffold Demo
        </h2>
        <p className="text-gray-600 dark:text-dark-text-secondary max-w-2xl mx-auto">
          Experience how we guide students through physics problems with structured
          thinking. Select a problem below to see our approach in action.
        </p>
      </div>

      {/* How It Works */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg dark:shadow-dark-lg p-6 border border-gray-200 dark:border-dark-border mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">How It Works</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <span className="text-2xl">🤔</span>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-dark-text-primary mb-1">1. Think First</h4>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Answer conceptual questions before calculating
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <span className="text-2xl">💡</span>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-dark-text-primary mb-1">2. Guided Solving</h4>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Progressive hints available if you get stuck
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-dark-text-primary mb-1">3. Learn From Mistakes</h4>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              See common mistakes and why they happen
            </p>
          </div>
        </div>
      </div>

      {/* Problem Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Choose a Problem</h3>
        <div className="grid gap-4">
          {problems.map((problem) => {
            const colors = examColors[problem.exam]
            return (
              <button
                key={problem.id}
                onClick={() => onSelect(problem)}
                className="w-full text-left bg-white dark:bg-dark-card rounded-xl shadow-md dark:shadow-dark-lg p-6 border border-gray-200 dark:border-dark-border hover:shadow-lg dark:hover:shadow-dark-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 ${colors.bg} ${colors.text} text-xs font-medium rounded`}
                      >
                        {problem.exam}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary text-xs font-medium rounded">
                        {problem.topic}
                      </span>
                    </div>
                    <p className="text-gray-800 dark:text-dark-text-primary leading-relaxed line-clamp-2">
                      {problem.statement}
                    </p>
                    <p className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 font-medium group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                      {problem.thinkingGate.length} thinking questions
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/40 transition-colors">
                      <svg
                        className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-sm text-gray-500 dark:text-dark-text-muted mt-8">
        <p>
          This demo is completely isolated from the main app.
          <br />
          No login required. No data saved to any account.
        </p>
      </div>
    </div>
  )
}
