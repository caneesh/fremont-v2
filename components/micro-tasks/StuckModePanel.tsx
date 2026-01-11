'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { StuckModePanelProps, SelfReportConfidence } from '@/types/socraticFirst'
import { useUserProfile } from '@/lib/profile'
import MathRenderer from '../MathRenderer'

const HINT_LEVELS = [
  {
    level: 1,
    title: 'Concept',
    description: 'What principle applies here?',
    icon: '💡',
    color: 'blue',
  },
  {
    level: 2,
    title: 'Visual',
    description: 'Picture the setup',
    icon: '👁️',
    color: 'purple',
  },
  {
    level: 3,
    title: 'Strategy',
    description: 'Plan your approach',
    icon: '🎯',
    color: 'amber',
  },
  {
    level: 4,
    title: 'Equation',
    description: 'Key relationships',
    icon: '📐',
    color: 'emerald',
  },
  {
    level: 5,
    title: 'Solution',
    description: 'Full walkthrough',
    icon: '✅',
    color: 'red',
  },
]

function getLevelStyles(level: number, isUnlocked: boolean, isCurrent: boolean): string {
  const baseStyles = 'flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200'

  if (!isUnlocked) {
    return `${baseStyles} border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card-soft opacity-50 cursor-not-allowed`
  }

  const colorMap: Record<string, string> = {
    blue: isCurrent
      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/30'
      : 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer',
    purple: isCurrent
      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/30'
      : 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/30 cursor-pointer',
    amber: isCurrent
      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-500/30'
      : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer',
    emerald: isCurrent
      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500/30'
      : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 cursor-pointer',
    red: isCurrent
      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500/30'
      : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer',
  }

  return `${baseStyles} ${colorMap[HINT_LEVELS[level - 1].color]}`
}

export default function StuckModePanel({
  hintLevel,
  stepContent,
  problemStatement,
  concepts,
  onHintLevelChange,
  onReturnToExploration,
  onHintVerificationComplete,
  isVerifying,
  verificationQuestion: externalVerificationQuestion,
}: StuckModePanelProps) {
  const { track } = useUserProfile()
  const [hintContent, setHintContent] = useState<Record<number, string>>({})
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null)
  const [showVerification, setShowVerification] = useState(false)
  const [verificationQuestion, setVerificationQuestion] = useState<string | null>(null)
  const [verificationAnswer, setVerificationAnswer] = useState('')
  const [verificationConfidence, setVerificationConfidence] = useState<SelfReportConfidence | null>(null)
  const [isVerifyingAnswer, setIsVerifyingAnswer] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch hint content when level changes
  useEffect(() => {
    if (hintLevel > 0 && !hintContent[hintLevel]) {
      fetchHintContent(hintLevel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintLevel])

  // Use external verification question if provided
  useEffect(() => {
    if (externalVerificationQuestion) {
      setVerificationQuestion(externalVerificationQuestion)
      setShowVerification(true)
    }
  }, [externalVerificationQuestion])

  const fetchHintContent = async (level: number) => {
    setLoadingLevel(level)
    try {
      const params = new URLSearchParams({
        stepContent,
        problemText: problemStatement,
        concepts: concepts.join(', '),
        level: level.toString(),
        track, // Pass user's current track
      })

      const response = await fetch(`/api/scaffold/hint?${params}`)
      if (!response.ok) throw new Error('Failed to fetch hint')

      const data = await response.json()
      setHintContent(prev => ({ ...prev, [level]: data.hint }))

      // After viewing hint, trigger Socratic verification
      setTimeout(() => {
        fetchVerificationQuestion(level)
      }, 1500)
    } catch (error) {
      console.error('Error fetching hint:', error)
      // Fallback hint
      setHintContent(prev => ({
        ...prev,
        [level]: `Consider the ${HINT_LEVELS[level - 1].title.toLowerCase()} aspect of this problem.`,
      }))
    } finally {
      setLoadingLevel(null)
    }
  }

  const fetchVerificationQuestion = async (level: number) => {
    try {
      const response = await fetch('/api/socratic-tutor/hint-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepContent,
          problemText: problemStatement,
          concepts,
          hintLevel: level,
          hintContent: hintContent[level],
          track, // Pass user's current track
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch verification question')

      const data = await response.json()
      setVerificationQuestion(data.question)
      setShowVerification(true)
    } catch (error) {
      console.error('Error fetching verification question:', error)
      // Fallback question
      setVerificationQuestion(`Can you explain in your own words what this hint is telling you?`)
      setShowVerification(true)
    }
  }

  const handleVerificationSubmit = async () => {
    if (!verificationAnswer.trim() || !verificationConfidence || isVerifyingAnswer) return

    setIsVerifyingAnswer(true)

    try {
      const response = await fetch('/api/socratic-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'hint_check',
          problemText: problemStatement,
          stepContent,
          concepts,
          question: verificationQuestion,
          studentAnswer: verificationAnswer,
          selfReportedConfidence: verificationConfidence,
          hintLevelJustViewed: hintLevel,
          track, // Pass user's current track
        }),
      })

      if (!response.ok) throw new Error('Failed to verify')

      const data = await response.json()
      const isUnderstood = data.verification?.answerQuality === 'excellent' || data.verification?.answerQuality === 'good'

      // Reset verification state
      setShowVerification(false)
      setVerificationAnswer('')
      setVerificationConfidence(null)
      setVerificationQuestion(null)

      // Notify parent
      onHintVerificationComplete(isUnderstood)
    } catch (error) {
      console.error('Error verifying answer:', error)
      // Just close verification on error
      setShowVerification(false)
      setVerificationAnswer('')
      setVerificationConfidence(null)
    } finally {
      setIsVerifyingAnswer(false)
    }
  }

  const handleLevelClick = (level: number) => {
    if (level <= hintLevel + 1) {
      onHintLevelChange(level)
    }
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg border-2 border-amber-200 dark:border-amber-700 overflow-hidden">
      {/* Header */}
      <div className="bg-amber-500 dark:bg-amber-600 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-2xl">🆘</span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">No Problem! Let&apos;s Build Up</h3>
          <p className="text-amber-100 text-xs">Choose a hint level to help you understand</p>
        </div>
        <button
          onClick={onReturnToExploration}
          className="text-sm text-amber-100 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          Return to exploring
        </button>
      </div>

      {/* Hint Ladder */}
      <div className="p-4 space-y-2">
        {HINT_LEVELS.map((hint) => {
          const isUnlocked = hint.level <= hintLevel + 1
          const isCurrent = hint.level === hintLevel
          const hasContent = !!hintContent[hint.level]

          return (
            <div key={hint.level}>
              <button
                onClick={() => handleLevelClick(hint.level)}
                disabled={!isUnlocked}
                className={`w-full ${getLevelStyles(hint.level, isUnlocked, isCurrent)}`}
              >
                <span className="text-2xl">{hint.icon}</span>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 dark:text-dark-text-primary">
                      Level {hint.level}: {hint.title}
                    </span>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20">
                        Current
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                    {hint.description}
                  </span>
                </div>
                {!isUnlocked && (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                {loadingLevel === hint.level && (
                  <svg className="w-5 h-5 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
              </button>

              {/* Hint content (expanded when current) */}
              {isCurrent && hasContent && (
                <div className="mt-2 ml-12 p-4 rounded-lg bg-gray-50 dark:bg-dark-card-soft border border-gray-200 dark:border-dark-border animate-fadeIn">
                  <div className="text-sm text-gray-700 dark:text-dark-text-primary">
                    <MathRenderer text={hintContent[hint.level]} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Socratic Verification after viewing hint */}
      {showVerification && verificationQuestion && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-dark-border pt-4 bg-indigo-50 dark:bg-indigo-900/10">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🤔</span>
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">
                Quick check - let&apos;s make sure this hint clicked!
              </p>
              <p className="text-sm text-gray-700 dark:text-dark-text-primary">
                {verificationQuestion}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              ref={inputRef}
              value={verificationAnswer}
              onChange={(e) => setVerificationAnswer(e.target.value)}
              placeholder="Explain in your own words..."
              className="w-full px-4 py-2 border-2 border-indigo-200 dark:border-indigo-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400"
              rows={2}
              disabled={isVerifyingAnswer}
            />

            {verificationAnswer.trim() && (
              <div className="animate-fadeIn">
                <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-2">
                  How confident are you?
                </p>
                <div className="flex gap-2">
                  {[
                    { value: 'guess' as const, emoji: '🎲', label: 'Guessing' },
                    { value: 'okay' as const, emoji: '🤔', label: 'Okay' },
                    { value: 'solid' as const, emoji: '💪', label: 'Solid' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setVerificationConfidence(option.value)}
                      className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${
                        verificationConfidence === option.value
                          ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/30'
                          : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-indigo-300'
                      }`}
                    >
                      <span className="text-lg">{option.emoji}</span>
                      <span className="text-xs block">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {verificationConfidence && (
              <button
                onClick={handleVerificationSubmit}
                disabled={!verificationAnswer.trim() || isVerifyingAnswer}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors flex items-center justify-center gap-2"
              >
                {isVerifyingAnswer ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Checking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Encouragement footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-dark-card-soft border-t border-gray-200 dark:border-dark-border">
        <p className="text-xs text-center text-gray-500 dark:text-dark-text-muted">
          It&apos;s okay to need hints! Understanding takes time.
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
