'use client'

/**
 * Dev page for testing Progress Overview with sample data
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Storage keys from repository
const STORAGE_KEYS = {
  USER_PATTERN_STATES: 'physiscaffold_v2_pattern_states',
  STEP_ATTEMPTS: 'physiscaffold_v2_step_attempts',
  EVENTS: 'physiscaffold_events',
} as const

// Sample pattern IDs (from patterns.json)
const PATTERN_IDS = [
  'pat-force-decomposition',
  'pat-constraint-analysis',
  'pat-frame-selection',
  'pat-conservation-check',
  'pat-phase-analysis',
  'pat-work-energy-path',
  'pat-kinematics-setup',
  'pat-sanity-check',
  'pat-vector-addition',
  'pat-method-selection',
]

function createPatternState(
  userId: string,
  patternId: string,
  options: {
    mastery?: number
    learnCompleted?: boolean
    guidedPracticeCompleted?: boolean
    totalAttempts?: number
    totalCorrect?: number
    recentFailCount?: number
    daysAgo?: number
  } = {}
) {
  const {
    mastery = 0,
    learnCompleted = false,
    guidedPracticeCompleted = false,
    totalAttempts = 0,
    totalCorrect = 0,
    recentFailCount = 0,
    daysAgo = 0,
  } = options

  const now = new Date()
  const lastSeen = new Date(now)
  lastSeen.setDate(lastSeen.getDate() - daysAgo)

  const reviewDue = new Date(now)
  reviewDue.setDate(reviewDue.getDate() + (mastery > 0.6 ? 7 : 1))

  return {
    id: `state-${patternId}-${userId}`,
    userId,
    patternId,
    mastery,
    learnCompleted,
    learnCompletedAt: learnCompleted ? lastSeen.toISOString() : null,
    guidedPracticeCompleted,
    guidedPracticeCompletedAt: guidedPracticeCompleted ? lastSeen.toISOString() : null,
    drillsAttempted: totalAttempts,
    totalAttempts,
    totalCorrect,
    recentFailCount,
    lastSeenAt: lastSeen.toISOString(),
    reviewDueAt: reviewDue.toISOString(),
    createdAt: lastSeen.toISOString(),
    updatedAt: now.toISOString(),
  }
}

function createStepAttempt(
  userId: string,
  problemId: string,
  stepIndex: number,
  isCorrect: boolean,
  confidence: 'low' | 'medium' | 'high',
  daysAgo: number = 0
) {
  const attemptedAt = new Date()
  attemptedAt.setDate(attemptedAt.getDate() - daysAgo)

  return {
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    userId,
    problemId,
    stepIndex,
    attemptedAt: attemptedAt.toISOString(),
    isCorrect,
    hintCount: isCorrect ? 0 : 1,
    usedReveal: false,
    enteredReadOnlyMode: false,
    timeSpentSeconds: Math.floor(Math.random() * 120) + 30,
    confidenceRating: confidence,
  }
}

function createSanityEvent(
  userId: string,
  type: 'sanity_check_completed' | 'problem_marked_solved',
  daysAgo: number = 0
) {
  const timestamp = new Date()
  timestamp.setDate(timestamp.getDate() - daysAgo)

  return {
    type,
    userId,
    timestamp: timestamp.toISOString(),
  }
}

export default function ProgressTestPage() {
  const router = useRouter()
  const [status, setStatus] = useState<string>('')
  const userId = 'anonymous'

  const injectBeginnerData = () => {
    // Beginner: 2 patterns started, low mastery
    const states: Record<string, unknown[]> = {
      [userId]: [
        createPatternState(userId, PATTERN_IDS[0], {
          mastery: 0.3,
          learnCompleted: true,
          totalAttempts: 5,
          totalCorrect: 2,
          daysAgo: 2,
        }),
        createPatternState(userId, PATTERN_IDS[1], {
          mastery: 0.15,
          learnCompleted: true,
          totalAttempts: 3,
          totalCorrect: 1,
          recentFailCount: 2,
          daysAgo: 1,
        }),
      ],
    }

    // Some step attempts with confidence ratings
    const attempts = [
      createStepAttempt(userId, 'prob-1', 0, true, 'low', 2),
      createStepAttempt(userId, 'prob-1', 1, false, 'low', 2),
      createStepAttempt(userId, 'prob-2', 0, true, 'medium', 1),
      createStepAttempt(userId, 'prob-2', 1, true, 'low', 1),
    ]

    // Some sanity check events
    const events = [
      createSanityEvent(userId, 'problem_marked_solved', 2),
      createSanityEvent(userId, 'sanity_check_completed', 2),
      createSanityEvent(userId, 'problem_marked_solved', 1),
    ]

    localStorage.setItem(STORAGE_KEYS.USER_PATTERN_STATES, JSON.stringify(states))
    localStorage.setItem(STORAGE_KEYS.STEP_ATTEMPTS, JSON.stringify(attempts))
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events))

    setStatus('Beginner data injected!')
  }

  const injectIntermediateData = () => {
    // Intermediate: 5 patterns with varied progress
    const states: Record<string, unknown[]> = {
      [userId]: [
        createPatternState(userId, PATTERN_IDS[0], {
          mastery: 0.75,
          learnCompleted: true,
          guidedPracticeCompleted: true,
          totalAttempts: 15,
          totalCorrect: 12,
          daysAgo: 5,
        }),
        createPatternState(userId, PATTERN_IDS[1], {
          mastery: 0.6,
          learnCompleted: true,
          guidedPracticeCompleted: true,
          totalAttempts: 10,
          totalCorrect: 7,
          daysAgo: 3,
        }),
        createPatternState(userId, PATTERN_IDS[2], {
          mastery: 0.45,
          learnCompleted: true,
          totalAttempts: 8,
          totalCorrect: 4,
          recentFailCount: 1,
          daysAgo: 1,
        }),
        createPatternState(userId, PATTERN_IDS[3], {
          mastery: 0.3,
          learnCompleted: true,
          totalAttempts: 5,
          totalCorrect: 2,
          recentFailCount: 3,
          daysAgo: 0,
        }),
        createPatternState(userId, PATTERN_IDS[4], {
          mastery: 0.1,
          learnCompleted: false,
          totalAttempts: 2,
          totalCorrect: 0,
          daysAgo: 0,
        }),
      ],
    }

    // More step attempts with varied confidence
    const attempts = [
      createStepAttempt(userId, 'prob-1', 0, true, 'high', 5),
      createStepAttempt(userId, 'prob-1', 1, true, 'high', 5),
      createStepAttempt(userId, 'prob-2', 0, true, 'medium', 3),
      createStepAttempt(userId, 'prob-2', 1, true, 'high', 3),
      createStepAttempt(userId, 'prob-3', 0, true, 'medium', 1),
      createStepAttempt(userId, 'prob-3', 1, false, 'low', 1),
      createStepAttempt(userId, 'prob-4', 0, false, 'low', 0),
      createStepAttempt(userId, 'prob-4', 1, true, 'medium', 0),
    ]

    // More sanity check events
    const events = [
      createSanityEvent(userId, 'problem_marked_solved', 5),
      createSanityEvent(userId, 'sanity_check_completed', 5),
      createSanityEvent(userId, 'problem_marked_solved', 3),
      createSanityEvent(userId, 'sanity_check_completed', 3),
      createSanityEvent(userId, 'problem_marked_solved', 1),
      createSanityEvent(userId, 'problem_marked_solved', 0),
      createSanityEvent(userId, 'sanity_check_completed', 0),
    ]

    localStorage.setItem(STORAGE_KEYS.USER_PATTERN_STATES, JSON.stringify(states))
    localStorage.setItem(STORAGE_KEYS.STEP_ATTEMPTS, JSON.stringify(attempts))
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events))

    setStatus('Intermediate data injected!')
  }

  const injectAdvancedData = () => {
    // Advanced: All patterns with high mastery, some needing review
    const states: Record<string, unknown[]> = {
      [userId]: PATTERN_IDS.map((patternId, index) => {
        const isStable = index < 6
        const needsReview = index >= 6 && index < 8

        return createPatternState(userId, patternId, {
          mastery: isStable ? 0.8 + Math.random() * 0.15 : needsReview ? 0.35 : 0.55,
          learnCompleted: true,
          guidedPracticeCompleted: isStable || needsReview,
          totalAttempts: 20 + Math.floor(Math.random() * 10),
          totalCorrect: 15 + Math.floor(Math.random() * 8),
          recentFailCount: needsReview ? 3 : 0,
          daysAgo: isStable ? 10 + index : needsReview ? 0 : 5,
        })
      }),
    }

    // Many step attempts
    const attempts = []
    for (let i = 0; i < 20; i++) {
      const confidence = i < 10 ? 'high' : i < 15 ? 'medium' : 'low'
      attempts.push(createStepAttempt(
        userId,
        `prob-${i}`,
        0,
        Math.random() > 0.2,
        confidence as 'low' | 'medium' | 'high',
        Math.floor(i / 2)
      ))
    }

    // High sanity check completion
    const events = []
    for (let i = 0; i < 15; i++) {
      events.push(createSanityEvent(userId, 'problem_marked_solved', i))
      if (i < 12) {
        events.push(createSanityEvent(userId, 'sanity_check_completed', i))
      }
    }

    localStorage.setItem(STORAGE_KEYS.USER_PATTERN_STATES, JSON.stringify(states))
    localStorage.setItem(STORAGE_KEYS.STEP_ATTEMPTS, JSON.stringify(attempts))
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events))

    setStatus('Advanced data injected!')
  }

  const clearAllData = () => {
    localStorage.removeItem(STORAGE_KEYS.USER_PATTERN_STATES)
    localStorage.removeItem(STORAGE_KEYS.STEP_ATTEMPTS)
    localStorage.removeItem(STORAGE_KEYS.EVENTS)
    setStatus('All progress data cleared!')
  }

  const goToDashboard = () => {
    router.push('/study-path')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
          Progress Test Data
        </h1>
        <p className="text-gray-600 dark:text-dark-text-secondary mb-8">
          Inject sample progress data to test the Progress Overview component.
        </p>

        <div className="space-y-4">
          <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-md">
            <h2 className="font-semibold text-gray-800 dark:text-dark-text-primary mb-4">
              Sample Data Profiles
            </h2>

            <div className="grid gap-3">
              <button
                onClick={injectBeginnerData}
                className="w-full p-4 text-left rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors"
              >
                <div className="font-medium text-gray-800 dark:text-dark-text-primary">
                  Beginner Profile
                </div>
                <div className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">
                  2 patterns started, low mastery, few attempts
                </div>
              </button>

              <button
                onClick={injectIntermediateData}
                className="w-full p-4 text-left rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors"
              >
                <div className="font-medium text-gray-800 dark:text-dark-text-primary">
                  Intermediate Profile
                </div>
                <div className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">
                  5 patterns with varied progress, some needing attention
                </div>
              </button>

              <button
                onClick={injectAdvancedData}
                className="w-full p-4 text-left rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors"
              >
                <div className="font-medium text-gray-800 dark:text-dark-text-primary">
                  Advanced Profile
                </div>
                <div className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">
                  All 10 patterns, high mastery, some needing review
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-md">
            <h2 className="font-semibold text-gray-800 dark:text-dark-text-primary mb-4">
              Actions
            </h2>

            <div className="flex gap-3">
              <button
                onClick={clearAllData}
                className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Clear All Data
              </button>

              <button
                onClick={goToDashboard}
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-strong transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>

          {status && (
            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
