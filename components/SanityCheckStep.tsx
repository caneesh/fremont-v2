'use client'

import { useState, useRef, useEffect } from 'react'
import type { SanityCheck, Step, Concept } from '@/types/scaffold'
import type { ChatMessage, DebugConceptRequest, DebugConceptResponse, DebuggerStatus, ProblemContext } from '@/types/debugConcept'
import MathRenderer from './MathRenderer'
import { authenticatedFetch, handleQuotaExceeded } from '@/lib/api/apiClient'

interface SanityCheckStepProps {
  sanityCheck: SanityCheck
  userAnswer: string
  onAnswerChange: (answer: string) => void
  // New props for Socratic Debugger
  problemText: string
  domain: string
  subdomain: string
  steps: Step[]
  concepts: Concept[]
  onTargetStep?: (stepId: number) => void // Callback to highlight a step
  onSolved?: () => void // Callback when user successfully completes the check
}

export default function SanityCheckStep({
  sanityCheck,
  userAnswer,
  onAnswerChange,
  problemText,
  domain,
  subdomain,
  steps,
  concepts,
  onTargetStep,
  onSolved
}: SanityCheckStepProps) {
  const [status, setStatus] = useState<DebuggerStatus>('idle')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatHistory])

  // Focus input when entering chat mode
  useEffect(() => {
    if (status === 'chatting' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [status])

  const getCheckTypeEmoji = (type: string) => {
    switch (type) {
      case 'limit':
        return '🎯'
      case 'dimension':
        return '📏'
      case 'symmetry':
        return '⚖️'
      default:
        return '✅'
    }
  }

  const buildProblemContext = (): ProblemContext => ({
    problemText,
    domain,
    subdomain,
    sanityCheckQuestion: sanityCheck.question,
    expectedBehavior: sanityCheck.expectedBehavior,
    checkType: sanityCheck.type,
    steps: steps.map(s => ({ id: s.id, title: s.title })),
    concepts: concepts.map(c => ({ id: c.id, name: c.name }))
  })

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) return

    setStatus('analyzing')
    setError(null)

    // Check if user's answer is approximately correct (simple heuristic)
    const normalizedAnswer = userAnswer.toLowerCase().trim()
    const normalizedExpected = sanityCheck.expectedBehavior.toLowerCase()

    // Simple matching - check for key phrases
    const keyPhrases = normalizedExpected.split(/[.,;]/).filter(p => p.trim().length > 10)
    const matchCount = keyPhrases.filter(phrase =>
      normalizedAnswer.includes(phrase.trim().slice(0, 20))
    ).length

    // If answer seems correct (matches enough key phrases), mark as solved
    if (matchCount >= keyPhrases.length * 0.5 || normalizedAnswer.length > 100 && matchCount > 0) {
      setStatus('solved')
      onSolved?.()
      return
    }

    // Answer appears incorrect - start Socratic debugging
    try {
      const request: DebugConceptRequest = {
        userInput: userAnswer,
        problemContext: buildProblemContext(),
        chatHistory: [],
        isInitialSubmission: true
      }

      const response = await authenticatedFetch('/api/debug-concept', {
        method: 'POST',
        body: JSON.stringify(request)
      })

      if (await handleQuotaExceeded(response)) {
        setStatus('idle')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to start debug session')
      }

      const data: DebugConceptResponse = await response.json()

      // Add user's answer and AI response to chat history
      const newHistory: ChatMessage[] = [
        {
          role: 'user',
          content: userAnswer,
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: data.message,
          timestamp: Date.now()
        }
      ]

      setChatHistory(newHistory)
      setStatus('chatting')

      // Handle targeted rewind if AI identified a specific step
      if (data.targetStepId && onTargetStep) {
        onTargetStep(data.targetStepId)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setStatus('idle')
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || status !== 'chatting') return

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: Date.now()
    }

    setChatHistory(prev => [...prev, userMessage])
    setChatInput('')
    setStatus('submitting')
    setError(null)

    try {
      const request: DebugConceptRequest = {
        userInput: chatInput,
        problemContext: buildProblemContext(),
        chatHistory: [...chatHistory, userMessage],
        isInitialSubmission: false
      }

      const response = await authenticatedFetch('/api/debug-concept', {
        method: 'POST',
        body: JSON.stringify(request)
      })

      if (await handleQuotaExceeded(response)) {
        setStatus('chatting')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data: DebugConceptResponse = await response.json()

      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: Date.now()
      }

      setChatHistory(prev => [...prev, aiMessage])

      // Check if user finally got it right
      if (data.isCorrect) {
        setStatus('solved')
        onSolved?.()
        // Add encouragement message if provided
        if (data.encouragement) {
          const encouragementMessage: ChatMessage = {
            role: 'assistant',
            content: data.encouragement,
            timestamp: Date.now()
          }
          setChatHistory(prev => [...prev, encouragementMessage])
        }
      } else {
        setStatus('chatting')
        // Handle targeted rewind
        if (data.targetStepId && onTargetStep) {
          onTargetStep(data.targetStepId)
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setStatus('chatting')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Render success state
  if (status === 'solved') {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg shadow-lg dark:shadow-dark-lg p-8 border-2 border-green-400 dark:border-green-600">
        <div className="flex items-center space-x-3 mb-6">
          <span className="text-4xl">🎉</span>
          <div>
            <h3 className="text-2xl font-bold text-green-800 dark:text-green-200">
              Reality Check Passed!
            </h3>
            <p className="text-sm text-green-700 dark:text-green-400">
              Your physical intuition is on point!
            </p>
          </div>
        </div>

        {/* Show chat history in solved state if there was debugging */}
        {chatHistory.length > 0 && (
          <div className="mb-6 bg-white/50 dark:bg-dark-card/50 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3">
              Your Learning Journey:
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {chatHistory.slice(-4).map((msg, idx) => (
                <div
                  key={idx}
                  className={`text-sm ${msg.role === 'user'
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-green-900 dark:text-green-200 italic'
                    }`}
                >
                  <span className="font-medium">
                    {msg.role === 'user' ? 'You: ' : 'Prof: '}
                  </span>
                  {msg.content}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-green-100 dark:bg-green-900/40 rounded-lg p-6 border border-green-300 dark:border-green-700">
          <h4 className="font-semibold text-green-900 dark:text-green-200 mb-3 flex items-center">
            <span className="mr-2">✅</span>
            Expected Physical Behavior:
          </h4>
          <MathRenderer text={sanityCheck.expectedBehavior} className="text-green-800 dark:text-green-200" />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-green-700 dark:text-green-400 mb-4">
            Click &quot;Mark as Solved&quot; above to complete this problem and reflect on your learning.
          </p>
        </div>
      </div>
    )
  }

  // Render chat interface (debugging mode)
  if (status === 'chatting' || status === 'submitting') {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg shadow-lg dark:shadow-dark-lg p-6 border-2 border-amber-400 dark:border-amber-600">
        <div className="flex items-center space-x-3 mb-4">
          <span className="text-3xl">🧑‍🏫</span>
          <div>
            <h3 className="text-xl font-bold text-amber-900 dark:text-amber-200">
              Socratic Debugger
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Let&apos;s work through this together
            </p>
          </div>
        </div>

        {/* Original question reminder */}
        <div className="bg-white/60 dark:bg-dark-card/60 rounded-lg p-3 mb-4 border border-amber-200 dark:border-amber-700">
          <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mb-1">
            Sanity Check Question:
          </p>
          <MathRenderer text={sanityCheck.question} className="text-sm text-amber-900 dark:text-amber-200" />
        </div>

        {/* Chat messages */}
        <div className="bg-white dark:bg-dark-card rounded-lg border border-amber-200 dark:border-amber-700 mb-4 max-h-80 overflow-y-auto">
          <div className="p-4 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${msg.role === 'user'
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100'
                    : 'bg-gray-100 dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">
                      {msg.role === 'user' ? 'You' : '🧑‍🏫 Professor'}
                    </span>
                  </div>
                  <MathRenderer text={msg.content} className="text-sm" />
                </div>
              </div>
            ))}
            {status === 'submitting' && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-dark-card-soft rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-dark-text-muted">Professor is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Chat input */}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your response... (Enter to send, Shift+Enter for new line)"
            className="flex-1 px-4 py-3 border border-amber-300 dark:border-amber-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-muted"
            rows={2}
            disabled={status === 'submitting'}
          />
          <button
            onClick={handleSendMessage}
            disabled={status === 'submitting' || !chatInput.trim()}
            className="px-4 py-2 bg-amber-600 dark:bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-700 dark:hover:bg-amber-600 disabled:bg-amber-300 dark:disabled:bg-amber-900/30 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 text-center">
          Answer the professor&apos;s questions to demonstrate your understanding
        </p>
      </div>
    )
  }

  // Render initial state (idle or analyzing)
  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg shadow-lg dark:shadow-dark-lg p-8 border-2 border-indigo-300 dark:border-indigo-700">
      <div className="flex items-center space-x-3 mb-6">
        <span className="text-4xl">{getCheckTypeEmoji(sanityCheck.type)}</span>
        <div>
          <h3 className="text-2xl font-bold text-indigo-900 dark:text-indigo-200">
            Final Reality Check
          </h3>
          <p className="text-sm text-indigo-700 dark:text-indigo-400">
            Does your solution make physical sense?
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-lg p-6 mb-4 border border-indigo-200 dark:border-indigo-700">
        <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-3">
          🔬 Sanity Check Question:
        </h4>
        <MathRenderer text={sanityCheck.question} className="text-lg text-gray-900 dark:text-dark-text-primary" />
      </div>

      <div className="bg-white dark:bg-dark-card rounded-lg p-6 mb-4 border border-indigo-200 dark:border-indigo-700">
        <label className="block font-semibold text-indigo-900 dark:text-indigo-200 mb-3">
          Your Prediction:
        </label>
        <textarea
          placeholder="What do you expect to happen? Why does this make physical sense?"
          className="w-full px-4 py-3 border border-indigo-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-muted"
          rows={4}
          value={userAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
          disabled={status === 'analyzing'}
        />
      </div>

      <button
        onClick={handleSubmitAnswer}
        disabled={status === 'analyzing' || !userAnswer.trim()}
        className="w-full px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:bg-indigo-300 dark:disabled:bg-indigo-900/30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {status === 'analyzing' ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Analyzing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Check My Understanding
          </>
        )}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      )}

      <p className="mt-4 text-xs text-indigo-600 dark:text-indigo-400 text-center">
        We&apos;ll guide you with Socratic questions if your prediction doesn&apos;t match the expected behavior
      </p>
    </div>
  )
}
