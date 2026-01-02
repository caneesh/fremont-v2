'use client'

/**
 * Question Scaffolding Engine v1 - React UI Component
 *
 * Minimal React component for resolving questions.
 * - Accepts statement, choices, topic/subtopic
 * - Shows multi-stage progress during generation
 * - Renders steps from the returned QuestionDoc
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  ResolveResponse,
  QuestionDoc,
  Step,
  StatusUpdate,
} from '@/lib/question-engine/schemas'

// =============================================================================
// Types
// =============================================================================

interface QuestionResolverProps {
  initialStatement?: string
  initialChoices?: string[]
  initialTopic?: string
  initialSubtopic?: string
  userId?: string
  onResolved?: (question: QuestionDoc) => void
  onError?: (error: string) => void
}

interface GenerationStatus {
  stage: string
  message: string
  progress: number
}

// =============================================================================
// Status Stage Descriptions
// =============================================================================

const STAGE_DESCRIPTIONS: Record<string, string> = {
  analyzing: 'Analyzing your problem...',
  selecting_template: 'Finding the best solution template...',
  checking_cache: 'Checking for similar problems...',
  adapting: 'Adapting a similar solution...',
  generating: 'Generating new scaffold...',
  validating: 'Validating the solution...',
  saving: 'Saving to cache...',
  completed: 'Done!',
  error: 'An error occurred',
}

// =============================================================================
// Component
// =============================================================================

export default function QuestionResolver({
  initialStatement = '',
  initialChoices = [],
  initialTopic = '',
  initialSubtopic = '',
  userId,
  onResolved,
  onError,
}: QuestionResolverProps) {
  // Form state
  const [statement, setStatement] = useState(initialStatement)
  const [choices, setChoices] = useState<string[]>(initialChoices)
  const [topic, setTopic] = useState(initialTopic)
  const [subtopic, setSubtopic] = useState(initialSubtopic)

  // Loading/status state
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<GenerationStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Result state
  const [question, setQuestion] = useState<QuestionDoc | null>(null)

  // Status polling ref
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // ==========================================================================
  // Status Streaming
  // ==========================================================================

  const startStatusStream = useCallback((statusId: string) => {
    // Try SSE first
    const eventSource = new EventSource(`/api/question/status/stream?id=${statusId}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StatusUpdate
        setStatus({
          stage: data.status,
          message: STAGE_DESCRIPTIONS[data.status] || data.message,
          progress: data.progress,
        })

        if (data.status === 'completed' || data.status === 'error') {
          eventSource.close()
          eventSourceRef.current = null
        }
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      eventSourceRef.current = null
      // Fallback to polling
      startStatusPolling(statusId)
    }
  }, [])

  const startStatusPolling = useCallback((statusId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/question/status?id=${statusId}`)
        if (response.ok) {
          const data = (await response.json()) as StatusUpdate
          setStatus({
            stage: data.status,
            message: STAGE_DESCRIPTIONS[data.status] || data.message,
            progress: data.progress,
          })

          if (data.status === 'completed' || data.status === 'error') {
            if (statusIntervalRef.current) {
              clearInterval(statusIntervalRef.current)
              statusIntervalRef.current = null
            }
          }
        }
      } catch {
        // Ignore errors, keep polling
      }
    }

    statusIntervalRef.current = setInterval(poll, 500)
    poll() // Initial poll
  }, [])

  // ==========================================================================
  // Form Handlers
  // ==========================================================================

  const handleAddChoice = useCallback(() => {
    setChoices((prev) => [...prev, ''])
  }, [])

  const handleRemoveChoice = useCallback((index: number) => {
    setChoices((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleChoiceChange = useCallback((index: number, value: string) => {
    setChoices((prev) => {
      const newChoices = [...prev]
      newChoices[index] = value
      return newChoices
    })
  }, [])

  // ==========================================================================
  // Submit Handler
  // ==========================================================================

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!statement.trim()) {
      setError('Please enter a problem statement')
      return
    }

    setIsLoading(true)
    setError(null)
    setStatus({ stage: 'analyzing', message: 'Starting...', progress: 0 })
    setQuestion(null)

    try {
      const response = await fetch('/api/question/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statement: statement.trim(),
          choices: choices.filter((c) => c.trim()).length > 0
            ? choices.filter((c) => c.trim())
            : undefined,
          topic: topic.trim() || undefined,
          subtopic: subtopic.trim() || undefined,
          userId,
        }),
      })

      const data = (await response.json()) as ResolveResponse

      if (!data.success) {
        const errorMessage = data.error?.message || 'Unknown error occurred'
        setError(errorMessage)
        onError?.(errorMessage)

        // If there's a statusId, we can still track generation progress
        if (data.meta?.statusId) {
          startStatusStream(data.meta.statusId)
        }
        return
      }

      // Success!
      setQuestion(data.question!)
      setStatus({
        stage: 'completed',
        message: `Resolved (${data.meta?.source || 'unknown'})`,
        progress: 100,
      })
      onResolved?.(data.question!)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [statement, choices, topic, subtopic, userId, onResolved, onError, startStatusStream])

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Problem Statement */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Problem Statement
          </label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Enter your physics problem here..."
            rows={4}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* Multiple Choice Options (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Multiple Choice Options (Optional)
          </label>
          {choices.map((choice, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <span className="flex items-center justify-center w-8 h-10 bg-gray-100 rounded text-sm font-medium">
                {String.fromCharCode(65 + index)}
              </span>
              <input
                type="text"
                value={choice}
                onChange={(e) => handleChoiceChange(index, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => handleRemoveChoice(index)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                disabled={isLoading}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddChoice}
            className="text-sm text-blue-600 hover:underline"
            disabled={isLoading}
          >
            + Add choice
          </button>
        </div>

        {/* Topic/Subtopic (Optional) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Topic (Optional)
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">Auto-detect</option>
              <option value="mechanics">Mechanics</option>
              <option value="thermodynamics">Thermodynamics</option>
              <option value="electromagnetism">Electromagnetism</option>
              <option value="optics">Optics</option>
              <option value="waves">Waves</option>
              <option value="modern">Modern Physics</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Subtopic (Optional)
            </label>
            <input
              type="text"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              placeholder="e.g., inclined_plane"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !statement.trim()}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Resolving...' : 'Resolve Question'}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Progress Display */}
      {isLoading && status && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">
              {status.message}
            </span>
            <span className="text-sm text-blue-600">{status.progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Question Display */}
      {question && (
        <div className="mt-6 space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-semibold">Resolved Question</h3>
              <p className="text-sm text-gray-600">
                Source: {question.source} | Template: {question.templateId}
              </p>
            </div>

            <div className="p-4">
              <p className="mb-4 font-medium">{question.statement}</p>

              {question.choices && question.choices.length > 0 && (
                <div className="mb-4 pl-4">
                  {question.choices.map((choice, i) => (
                    <div key={i} className="text-sm">
                      {String.fromCharCode(65 + i)}) {choice}
                    </div>
                  ))}
                </div>
              )}

              <h4 className="font-semibold mb-2">Steps:</h4>
              <div className="space-y-3">
                {question.steps.map((step, index) => (
                  <StepCard key={step.id} step={step} index={index} />
                ))}
              </div>

              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <span className="font-medium">Final Answer: </span>
                {question.finalAnswer}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Step Card Component
// =============================================================================

function StepCard({ step, index }: { step: Step; index: number }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="border rounded-lg p-3">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded text-sm font-medium">
            {index + 1}
          </span>
          <span className="font-medium">{step.prompt}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-gray-100 rounded">
            {step.type}
          </span>
          <span className="text-gray-400">{showDetails ? '−' : '+'}</span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t space-y-2 text-sm">
          <div>
            <span className="font-medium text-amber-600">Hint: </span>
            {step.hint}
          </div>
          <div>
            <span className="font-medium text-red-600">Common Trap: </span>
            {step.trap}
          </div>
          <div>
            <span className="font-medium text-green-600">Solution: </span>
            {step.solution}
          </div>
        </div>
      )}
    </div>
  )
}
