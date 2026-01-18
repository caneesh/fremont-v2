'use client'

/**
 * DemoFlow - Main component for the demo experience
 *
 * Orchestrates the demo flow:
 * 1. Problem selection
 * 2. Thinking Gate (mandatory conceptual questions)
 * 3. Solve Phase (hints + answer input)
 * 4. Result display with explanation
 */

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { DEMO_PROBLEMS, type DemoProblem } from '@/lib/demo/demoProblems'
import DemoThinkingGate from './DemoThinkingGate'
import DemoSolvePhase from './DemoSolvePhase'
import DemoProblemSelector from './DemoProblemSelector'
import DemoResult from './DemoResult'

type DemoPhase = 'select' | 'thinking' | 'solve' | 'result'

const DEMO_STORAGE_KEY = 'physiscaffold_demo_progress'

interface DemoProgress {
  problemId: string
  thinkingComplete: boolean
  selectedAnswers: number[]
}

function loadDemoProgress(): DemoProgress | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(DEMO_STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function saveDemoProgress(progress: DemoProgress): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Ignore storage errors
  }
}

function clearDemoProgress(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(DEMO_STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}

export default function DemoFlow() {
  const [phase, setPhase] = useState<DemoPhase>('select')
  const [selectedProblem, setSelectedProblem] = useState<DemoProblem | null>(null)
  const [thinkingAnswers, setThinkingAnswers] = useState<number[]>([])
  const [userAnswer, setUserAnswer] = useState<string>('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  // Load saved progress on mount
  useEffect(() => {
    const saved = loadDemoProgress()
    if (saved) {
      const problem = DEMO_PROBLEMS.find((p) => p.id === saved.problemId)
      if (problem) {
        setSelectedProblem(problem)
        setThinkingAnswers(saved.selectedAnswers)
        if (saved.thinkingComplete) {
          setPhase('solve')
        } else {
          setPhase('thinking')
        }
      }
    }
  }, [])

  // Handle problem selection
  const handleSelectProblem = useCallback((problem: DemoProblem) => {
    setSelectedProblem(problem)
    setThinkingAnswers([])
    setUserAnswer('')
    setIsCorrect(null)
    setPhase('thinking')

    saveDemoProgress({
      problemId: problem.id,
      thinkingComplete: false,
      selectedAnswers: [],
    })
  }, [])

  // Handle thinking gate completion
  const handleThinkingComplete = useCallback((answers: number[]) => {
    setThinkingAnswers(answers)
    setPhase('solve')

    if (selectedProblem) {
      saveDemoProgress({
        problemId: selectedProblem.id,
        thinkingComplete: true,
        selectedAnswers: answers,
      })
    }
  }, [selectedProblem])

  // Handle answer submission
  const handleAnswerSubmit = useCallback(
    (answer: string, correct: boolean) => {
      setUserAnswer(answer)
      setIsCorrect(correct)
      setPhase('result')
      clearDemoProgress()
    },
    []
  )

  // Handle starting over
  const handleStartOver = useCallback(() => {
    setPhase('select')
    setSelectedProblem(null)
    setThinkingAnswers([])
    setUserAnswer('')
    setIsCorrect(null)
    clearDemoProgress()
  }, [])

  // Handle trying another problem
  const handleTryAnother = useCallback(() => {
    // Find a different problem
    if (selectedProblem) {
      const otherProblems = DEMO_PROBLEMS.filter((p) => p.id !== selectedProblem.id)
      if (otherProblems.length > 0) {
        const randomProblem = otherProblems[Math.floor(Math.random() * otherProblems.length)]
        handleSelectProblem(randomProblem)
      } else {
        handleStartOver()
      }
    } else {
      handleStartOver()
    }
  }, [selectedProblem, handleSelectProblem, handleStartOver])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PhysiScaffold Demo</h1>
              <p className="text-sm text-gray-600 mt-1">
                Experience structured physics problem-solving
              </p>
            </div>
            {phase !== 'select' && (
              <button
                onClick={handleStartOver}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Start Over
              </button>
            )}
          </div>

          {/* Progress Indicator */}
          {phase !== 'select' && (
            <div className="mt-4 flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  phase === 'thinking'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                  1
                </span>
                Think First
              </div>
              <div className="w-8 h-0.5 bg-gray-300" />
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  phase === 'solve'
                    ? 'bg-blue-100 text-blue-700'
                    : phase === 'result'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                  2
                </span>
                Solve
              </div>
              <div className="w-8 h-0.5 bg-gray-300" />
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  phase === 'result'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                  3
                </span>
                Review
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {phase === 'select' && (
          <DemoProblemSelector
            problems={DEMO_PROBLEMS}
            onSelect={handleSelectProblem}
          />
        )}

        {phase === 'thinking' && selectedProblem && (
          <DemoThinkingGate
            problem={selectedProblem}
            initialAnswers={thinkingAnswers}
            onComplete={handleThinkingComplete}
          />
        )}

        {phase === 'solve' && selectedProblem && (
          <DemoSolvePhase
            problem={selectedProblem}
            onSubmit={handleAnswerSubmit}
          />
        )}

        {phase === 'result' && selectedProblem && (
          <DemoResult
            problem={selectedProblem}
            userAnswer={userAnswer}
            isCorrect={isCorrect ?? false}
            thinkingAnswers={thinkingAnswers}
            onTryAnother={handleTryAnother}
            onStartOver={handleStartOver}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          <p>Demo Mode - No data is saved to your account</p>
          <p className="mt-1">
            <Link href="/" className="text-blue-600 hover:underline">
              Return to Main App
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
