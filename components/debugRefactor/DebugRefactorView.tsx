'use client'

/**
 * DebugRefactorView Component
 *
 * Main UI for debug and refactor problem modes.
 * Provides step-by-step guidance through the debugging/refactoring process.
 */

import { useState, useCallback } from 'react'
import { useDebugRefactor } from '@/hooks/useDebugRefactor'
import type {
  DebugProblem,
  RefactorProblem,
} from '@/types/debugRefactorMode'

// Only debug and refactor modes are supported
type DebugRefactorMode = 'debug' | 'refactor'
import type { TestResult } from '@/lib/debugRefactor'
import { StepProgress } from './StepProgress'
import { CodeEditor } from './CodeEditor'
import { TestRunner } from './TestRunner'
import { ResultsModal } from './ResultsModal'

interface DebugRefactorViewProps {
  sessionId: string
  mode: DebugRefactorMode
  problem: DebugProblem | RefactorProblem
  onComplete?: () => void
  onExit?: () => void
}

export function DebugRefactorView({
  sessionId,
  mode,
  problem,
  onComplete,
  onExit,
}: DebugRefactorViewProps) {
  const {
    isEnabled,
    isInitialized,
    currentStep,
    progress,
    isComplete,
    remainingAttempts,
    result,
    steps,
    canAdvance,
    advanceReason,
    availableHints,
    advance,
    submitCode,
    useHint,
    evaluate,
    reset,
  } = useDebugRefactor({
    sessionId,
    mode,
    problem,
  })

  // Local state
  const [code, setCode] = useState(
    mode === 'debug'
      ? (problem as DebugProblem).buggyCode
      : (problem as RefactorProblem).messyCode
  )
  const [hypothesis, setHypothesis] = useState('')
  const [reflection, setReflection] = useState('')
  const [selectedSmells, setSelectedSmells] = useState<string[]>([])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isRunningTests, setIsRunningTests] = useState(false)

  // Run tests against user code
  const runTests = useCallback(async () => {
    setIsRunningTests(true)

    // Simulate test execution (in real implementation, this would run actual tests)
    const testCases = problem.testCases
    const results: TestResult[] = testCases.map((test) => ({
      testId: test.id,
      passed: Math.random() > 0.3, // Simulated - would be real test execution
      actualOutput: 'Simulated output',
    }))

    setTestResults(results)
    setIsRunningTests(false)

    // Submit the results
    if (mode === 'debug') {
      submitCode(code, results, { bugTags: [] })
    } else {
      submitCode(code, results, { styleGoals: selectedSmells })
    }
  }, [code, mode, problem.testCases, submitCode, selectedSmells])

  // Handle step advancement
  const handleAdvance = useCallback(() => {
    if (mode === 'debug') {
      advance({ hypothesis, reflection })
    } else {
      advance({ smells: selectedSmells, reflection })
    }
  }, [mode, advance, hypothesis, reflection, selectedSmells])

  // Handle completion
  const handleComplete = useCallback(() => {
    const evalResult = evaluate()
    if (evalResult) {
      setShowResults(true)
      if (evalResult.passed && onComplete) {
        onComplete()
      }
    }
  }, [evaluate, onComplete])

  if (!isEnabled) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/30">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Debug/Refactor mode is currently disabled.
        </p>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {mode === 'debug' ? 'Debug Mode' : 'Refactor Mode'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {mode === 'debug'
              ? 'Find and fix the bug in this code'
              : 'Improve the code quality without breaking functionality'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {remainingAttempts} attempts remaining
          </span>
          {onExit && (
            <button
              onClick={onExit}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <StepProgress steps={steps} progress={progress} />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Code Editor */}
        <div className="space-y-4">
          <CodeEditor
            code={code}
            onChange={setCode}
            language={problem.language ?? 'javascript'}
            readOnly={currentStep === 'understand' || currentStep === 'read'}
          />

          {/* Test Runner */}
          <TestRunner
            testCases={problem.testCases}
            results={testResults}
            isRunning={isRunningTests}
            onRun={runTests}
            disabled={
              currentStep !== 'fix' &&
              currentStep !== 'refactor' &&
              currentStep !== 'test'
            }
          />
        </div>

        {/* Right: Step Content */}
        <div className="space-y-4">
          {/* Step-specific content */}
          {(currentStep === 'understand' || currentStep === 'read') && (
            <UnderstandStep
              problem={problem}
              mode={mode}
              onContinue={handleAdvance}
            />
          )}

          {currentStep === 'hypothesis' && (
            <HypothesisStep
              hypothesis={hypothesis}
              onChange={setHypothesis}
              hints={availableHints}
              onUseHint={useHint}
              canAdvance={canAdvance}
              advanceReason={advanceReason}
              onContinue={handleAdvance}
            />
          )}

          {currentStep === 'identify' && (
            <IdentifyStep
              problem={problem as RefactorProblem}
              selectedSmells={selectedSmells}
              onToggleSmell={(id) => {
                setSelectedSmells((prev) =>
                  prev.includes(id)
                    ? prev.filter((s) => s !== id)
                    : [...prev, id]
                )
              }}
              canAdvance={selectedSmells.length > 0}
              onContinue={handleAdvance}
            />
          )}

          {(currentStep === 'fix' || currentStep === 'refactor') && (
            <FixStep
              mode={mode}
              testResults={testResults}
              remainingAttempts={remainingAttempts}
              canAdvance={testResults.some((t) => t.passed)}
              onContinue={handleAdvance}
            />
          )}

          {currentStep === 'test' && (
            <TestStep
              testResults={testResults}
              canAdvance={
                testResults.length > 0 &&
                testResults.filter((t) => t.passed).length >=
                  testResults.length * 0.7
              }
              onContinue={handleAdvance}
            />
          )}

          {currentStep === 'reflection' && (
            <ReflectionStep
              reflection={reflection}
              onChange={setReflection}
              canAdvance={canAdvance}
              advanceReason={advanceReason}
              onComplete={handleComplete}
            />
          )}
        </div>
      </div>

      {/* Results Modal */}
      {showResults && result && (
        <ResultsModal
          result={result}
          mode={mode}
          onClose={() => setShowResults(false)}
          onRetry={reset}
        />
      )}
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function UnderstandStep({
  problem,
  mode,
  onContinue,
}: {
  problem: DebugProblem | RefactorProblem
  mode: DebugRefactorMode
  onContinue: () => void
}) {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="font-medium text-gray-900 dark:text-white">
        {mode === 'debug' ? 'Step 1: Understand the Code' : 'Step 1: Read the Code'}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {mode === 'debug'
          ? 'Read through the code carefully. Try to understand what it should do and look for potential issues.'
          : 'Read through the code carefully. Understand its purpose and structure before identifying improvements.'}
      </p>

      {/* Problem description */}
      <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Goal:</strong> {problem.description}
        </p>
      </div>

      {/* Test cases preview */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Test Cases:
        </h4>
        <div className="max-h-40 space-y-2 overflow-y-auto">
          {problem.testCases.slice(0, 3).map((test) => (
            <div
              key={test.id}
              className="rounded bg-gray-50 p-2 text-xs dark:bg-gray-700"
            >
              <div className="font-mono text-gray-600 dark:text-gray-400">
                Input: {test.input}
              </div>
              <div className="font-mono text-gray-600 dark:text-gray-400">
                Expected: {test.expectedOutput}
              </div>
            </div>
          ))}
          {problem.testCases.length > 3 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              +{problem.testCases.length - 3} more test cases
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
      >
        I understand, continue
      </button>
    </div>
  )
}

function HypothesisStep({
  hypothesis,
  onChange,
  hints,
  onUseHint,
  canAdvance,
  advanceReason,
  onContinue,
}: {
  hypothesis: string
  onChange: (value: string) => void
  hints: readonly { level: number; text: string }[]
  onUseHint: () => void
  canAdvance: boolean
  advanceReason: string | null
  onContinue: () => void
}) {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="font-medium text-gray-900 dark:text-white">
        Step 2: Form a Hypothesis
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        What do you think the bug is? Describe your hypothesis before making
        changes.
      </p>

      <textarea
        value={hypothesis}
        onChange={(e) => onChange(e.target.value)}
        placeholder="I think the bug is..."
        className="h-32 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />

      {/* Hints */}
      {hints.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Hints
            </h4>
            <button
              onClick={onUseHint}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              Request hint
            </button>
          </div>
          <div className="space-y-2">
            {hints.map((hint) => (
              <div
                key={hint.level}
                className="rounded bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
              >
                {hint.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {advanceReason && (
        <p className="text-xs text-red-500">{advanceReason}</p>
      )}

      <button
        onClick={onContinue}
        disabled={!canAdvance}
        className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
      >
        Continue to fix
      </button>
    </div>
  )
}

function IdentifyStep({
  problem,
  selectedSmells,
  onToggleSmell,
  canAdvance,
  onContinue,
}: {
  problem: RefactorProblem
  selectedSmells: string[]
  onToggleSmell: (id: string) => void
  canAdvance: boolean
  onContinue: () => void
}) {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="font-medium text-gray-900 dark:text-white">
        Step 2: Identify Code Smells
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Select the code smells you&apos;ve identified in the code.
      </p>

      <div className="space-y-2">
        {problem.codeSmells.map((smell) => (
          <label
            key={smell.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
          >
            <input
              type="checkbox"
              checked={selectedSmells.includes(smell.id)}
              onChange={() => onToggleSmell(smell.id)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-500"
            />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {smell.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {smell.description}
              </div>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={onContinue}
        disabled={!canAdvance}
        className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
      >
        Continue to refactor
      </button>
    </div>
  )
}

function FixStep({
  mode,
  testResults,
  remainingAttempts,
  canAdvance,
  onContinue,
}: {
  mode: DebugRefactorMode
  testResults: TestResult[]
  remainingAttempts: number
  canAdvance: boolean
  onContinue: () => void
}) {
  const passedCount = testResults.filter((t) => t.passed).length

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="font-medium text-gray-900 dark:text-white">
        {mode === 'debug' ? 'Step 3: Fix the Bug' : 'Step 3: Refactor the Code'}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {mode === 'debug'
          ? 'Edit the code to fix the bug you identified. Run tests to verify.'
          : 'Improve the code quality. Run tests to ensure functionality is preserved.'}
      </p>

      {testResults.length > 0 && (
        <div
          className={`rounded-lg p-3 ${
            passedCount === testResults.length
              ? 'bg-green-50 dark:bg-green-900/30'
              : 'bg-amber-50 dark:bg-amber-900/30'
          }`}
        >
          <p
            className={`text-sm ${
              passedCount === testResults.length
                ? 'text-green-800 dark:text-green-200'
                : 'text-amber-800 dark:text-amber-200'
            }`}
          >
            {passedCount}/{testResults.length} tests passing
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {remainingAttempts} attempts remaining
      </p>

      <button
        onClick={onContinue}
        disabled={!canAdvance}
        className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
      >
        Continue to test
      </button>
    </div>
  )
}

function TestStep({
  testResults,
  canAdvance,
  onContinue,
}: {
  testResults: TestResult[]
  canAdvance: boolean
  onContinue: () => void
}) {
  const passedCount = testResults.filter((t) => t.passed).length
  const passRate = testResults.length > 0 ? (passedCount / testResults.length) * 100 : 0

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="font-medium text-gray-900 dark:text-white">
        Step 4: Verify Your Solution
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Review your test results. You need at least 70% of tests passing to continue.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Pass Rate
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {Math.round(passRate)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full transition-all ${
              passRate >= 70 ? 'bg-green-500' : 'bg-amber-500'
            }`}
            style={{ width: `${passRate}%` }}
          />
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={!canAdvance}
        className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
      >
        Continue to reflection
      </button>
    </div>
  )
}

function ReflectionStep({
  reflection,
  onChange,
  canAdvance,
  advanceReason,
  onComplete,
}: {
  reflection: string
  onChange: (value: string) => void
  canAdvance: boolean
  advanceReason: string | null
  onComplete: () => void
}) {
  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="font-medium text-gray-900 dark:text-white">
        Step 5: Reflect
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        What did you learn? How would you approach similar problems in the future?
      </p>

      <textarea
        value={reflection}
        onChange={(e) => onChange(e.target.value)}
        placeholder="I learned that..."
        className="h-32 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />

      {advanceReason && (
        <p className="text-xs text-red-500">{advanceReason}</p>
      )}

      <button
        onClick={onComplete}
        disabled={!canAdvance}
        className="w-full rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
      >
        Complete
      </button>
    </div>
  )
}
