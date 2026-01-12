'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type {
  ChatMessage,
  ComprehensionQuestion,
  SocraticAnalyzeResponse,
} from '@/types/socraticTutor'
import { useUserProfile } from '@/lib/profile'

interface SocraticTutorChatProps {
  problemText: string
  stepTitle: string
  stepContent: string
  requiredConcepts: string[]
  onResolved: () => void
  onSkip?: () => void
}

export default function SocraticTutorChat({
  problemText,
  stepTitle,
  stepContent,
  requiredConcepts,
  onResolved,
  onSkip,
}: SocraticTutorChatProps) {
  const { track } = useUserProfile()
  const [phase, setPhase] = useState<'loading' | 'questions' | 'chat' | 'resolved'>('loading')
  const [questions, setQuestions] = useState<ComprehensionQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isProfessorTyping, setIsProfessorTyping] = useState(false)
  const [celebrationMessage, setCelebrationMessage] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory, isProfessorTyping, scrollToBottom])

  // Generate initial questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const params = new URLSearchParams({
          problemText,
          stepTitle,
          stepContent,
          concepts: requiredConcepts.join(', '),
          track, // Pass user's current track
        })

        const response = await fetch(`/api/socratic-tutor?${params}`)
        if (!response.ok) throw new Error('Failed to fetch questions')

        const data = await response.json()
        setQuestions(data.questions || [])
        setPhase('questions')

        // Add professor's first message
        if (data.questions?.length > 0) {
          setChatHistory([{
            id: 'intro',
            role: 'professor',
            content: `Great work on "${stepTitle}"! Let me ask you a quick question to make sure we're on the same page.`,
            timestamp: Date.now(),
          }, {
            id: 'q0',
            role: 'professor',
            content: data.questions[0].question,
            timestamp: Date.now() + 100,
          }])
        }
      } catch (error) {
        console.error('Error fetching questions:', error)
        // Fall back to a generic question
        setQuestions([{
          id: 'fallback',
          question: `Can you explain in your own words why this step works?`,
        }])
        setPhase('questions')
      }
    }

    fetchQuestions()
  }, [problemText, stepTitle, stepContent, requiredConcepts, track])

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || isAnalyzing) return

    const currentQuestionObj = questions[currentQuestionIndex]
    const lastProfMessage = chatHistory.filter(m => m.role === 'professor').pop()
    const questionText = currentQuestionObj?.question || lastProfMessage?.content || ''

    // Add student's answer to chat
    const studentMessage: ChatMessage = {
      id: `student-${Date.now()}`,
      role: 'student',
      content: answer,
      timestamp: Date.now(),
    }
    setChatHistory(prev => [...prev, studentMessage])
    setAnswer('')
    setIsAnalyzing(true)
    setIsProfessorTyping(true)

    try {
      const response = await fetch('/api/socratic-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText,
          stepTitle,
          stepContent,
          requiredConcepts,
          question: questionText,
          studentAnswer: answer,
          chatHistory: chatHistory.filter(m => m.id !== 'intro'),
          track, // Pass user's current track
        }),
      })

      if (!response.ok) throw new Error('Failed to analyze')

      const data: SocraticAnalyzeResponse = await response.json()

      // Simulate typing delay for natural feel
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700))

      setIsProfessorTyping(false)

      // Add professor's response
      const profMessage: ChatMessage = {
        id: `prof-${Date.now()}`,
        role: 'professor',
        content: data.analysis.feedback,
        timestamp: Date.now(),
      }
      setChatHistory(prev => [...prev, profMessage])

      if (data.isResolved) {
        setCelebrationMessage(data.encouragement || "You've demonstrated understanding.")
        setPhase('resolved')

        // Auto-resolve after celebration
        setTimeout(() => {
          onResolved()
        }, 4000)
      } else if (data.analysis.followUpQuestion) {
        // Continue the conversation
        setPhase('chat')

        // Add follow-up question after a brief pause
        setTimeout(() => {
          const followUpMessage: ChatMessage = {
            id: `prof-followup-${Date.now()}`,
            role: 'professor',
            content: data.analysis.followUpQuestion!,
            timestamp: Date.now(),
          }
          setChatHistory(prev => [...prev, followUpMessage])
        }, 1200)
      } else if (currentQuestionIndex < questions.length - 1) {
        // Move to next question
        setCurrentQuestionIndex(prev => prev + 1)
        const nextQ = questions[currentQuestionIndex + 1]

        setTimeout(() => {
          const nextQMessage: ChatMessage = {
            id: `q${currentQuestionIndex + 1}`,
            role: 'professor',
            content: nextQ.question,
            timestamp: Date.now(),
          }
          setChatHistory(prev => [...prev, nextQMessage])
        }, 1000)
      }
    } catch (error) {
      console.error('Error analyzing answer:', error)
      setIsProfessorTyping(false)

      // Graceful fallback
      const errorMessage: ChatMessage = {
        id: `prof-error-${Date.now()}`,
        role: 'professor',
        content: "That's a good effort! Can you tell me more about your reasoning?",
        timestamp: Date.now(),
      }
      setChatHistory(prev => [...prev, errorMessage])
      setPhase('chat')
    } finally {
      setIsAnalyzing(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitAnswer()
    }
  }

  if (phase === 'loading') {
    return (
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 border-2 border-indigo-200 dark:border-indigo-700">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center animate-pulse">
            <span className="text-xl">👨‍🏫</span>
          </div>
          <p className="text-indigo-700 dark:text-indigo-300 font-medium">
            Professor is preparing a question...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl border-2 border-indigo-300 dark:border-indigo-600 overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 dark:bg-indigo-500 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-2xl">👨‍🏫</span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-white">Professor Check-In</h3>
          <p className="text-indigo-100 text-xs">
            {phase === 'resolved' ? 'Understanding verified!' : 'Quick comprehension check'}
          </p>
        </div>
        {phase !== 'resolved' && onSkip && (
          <button
            onClick={onSkip}
            className="text-xs text-indigo-200 hover:text-white px-2 py-1 rounded transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-dark-card-soft">
        {chatHistory.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'student' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.role === 'student'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-800 dark:text-dark-text-primary rounded-bl-md shadow-sm'
              }`}
            >
              {message.role === 'professor' && (
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">👨‍🏫</span>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Professor</span>
                </div>
              )}
              <p className="text-sm leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}

        {/* Professor typing indicator */}
        {isProfessorTyping && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">👨‍🏫</span>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Professor</span>
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Success Overlay */}
      {phase === 'resolved' && (
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center p-6 animate-fade-in z-10">
          <div className="w-12 h-12 mb-4 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">Well done</h2>
          <p className="text-slate-600 dark:text-slate-400 text-center text-sm mb-4 max-w-md">
            {celebrationMessage}
          </p>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs">Marking as resolved...</span>
          </div>
        </div>
      )}

      {/* Input Area */}
      {phase !== 'resolved' && (
        <div className="p-4 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-muted"
              rows={2}
              disabled={isAnalyzing}
            />
            <button
              onClick={handleSubmitAnswer}
              disabled={!answer.trim() || isAnalyzing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-400 transition-colors flex items-center justify-center"
            >
              {isAnalyzing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-2 text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      )}

    </div>
  )
}
