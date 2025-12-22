'use client'

import { useState, useEffect } from 'react'
import VoiceInput from './VoiceInput'

interface ProblemInputProps {
  onSubmit: (problem: string) => void
  isLoading: boolean
  error: string | null
}

type InputMode = 'text' | 'voice'

const LOADING_STAGES = [
  { message: "Analyzing problem structure...", progress: 20, duration: 3000 },
  { message: "Identifying physics concepts...", progress: 40, duration: 5000 },
  { message: "Building solution roadmap...", progress: 60, duration: 8000 },
  { message: "Generating progressive hints...", progress: 80, duration: 12000 },
  { message: "Finalizing scaffold...", progress: 95, duration: 15000 },
]

const SAMPLE_PROBLEMS = [
  {
    title: "Bead on a Rotating Hoop",
    text: "A bead of mass m is threaded on a frictionless circular hoop of radius R. The hoop rotates with constant angular velocity ω about a vertical diameter. Find the angle θ at which the bead can remain in stable equilibrium relative to the hoop."
  },
  {
    title: "Block on Accelerating Wedge",
    text: "A wedge of mass M and angle α rests on a frictionless horizontal surface. A block of mass m is placed on the wedge. What horizontal acceleration must be given to the wedge so that the block does not slide down the wedge? (Assume the block-wedge interface is frictionless)."
  },
  {
    title: "Rotating Rod with Bead",
    text: "A uniform rod of length L rotates in a horizontal plane with constant angular velocity ω about a vertical axis passing through one of its ends. A bead of mass m can slide without friction along the rod. At what distance r from the axis will the bead be in equilibrium?"
  }
]

export default function ProblemInput({ onSubmit, isLoading, error }: ProblemInputProps) {
  const [problemText, setProblemText] = useState('')
  const [currentStage, setCurrentStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [inputMode, setInputMode] = useState<InputMode>('text')

  useEffect(() => {
    if (!isLoading) {
      setCurrentStage(0)
      setProgress(0)
      return
    }

    // Advance through stages based on time
    const startTime = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime

      // Find current stage based on elapsed time
      let newStage = 0
      for (let i = 0; i < LOADING_STAGES.length; i++) {
        if (elapsed >= LOADING_STAGES[i].duration) {
          newStage = i
        }
      }

      setCurrentStage(Math.min(newStage, LOADING_STAGES.length - 1))

      // Smooth progress animation
      const targetProgress = LOADING_STAGES[newStage]?.progress || 95
      setProgress(prev => {
        const diff = targetProgress - prev
        return prev + diff * 0.1 // Smooth easing
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (problemText.trim()) {
      onSubmit(problemText.trim())
    }
  }

  const loadSample = (sampleText: string) => {
    setProblemText(sampleText)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">
          Enter Your Physics Problem
        </h2>

        {/* Input Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setInputMode('text')}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              inputMode === 'text'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Type
            </div>
          </button>
          <button
            type="button"
            onClick={() => setInputMode('voice')}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              inputMode === 'voice'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              Speak
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Text Input Mode */}
          {inputMode === 'text' && (
            <div>
              <label htmlFor="problem" className="block text-sm font-medium text-gray-700 mb-2">
                Problem Statement
              </label>
              <textarea
              id="problem"
              rows={6}
              className="w-full px-3 py-3 sm:px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-gray-900 text-base"
              placeholder="Paste your physics problem here..."
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              disabled={isLoading}
            />
            </div>
          )}

          {/* Voice Input Mode */}
          {inputMode === 'voice' && (
            <VoiceInput
              onTranscriptChange={(transcript) => setProblemText(transcript)}
              language="en-US"
              className="mb-4"
            />
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Animated Loading Progress */}
          {isLoading && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-blue-900">
                      {LOADING_STAGES[currentStage]?.message || 'Processing...'}
                    </span>
                    <span className="text-blue-700 font-medium">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-full rounded-full transition-all duration-300 ease-out relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Stage Indicators */}
                <div className="flex justify-between items-center pt-2">
                  {LOADING_STAGES.map((stage, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col items-center space-y-1 ${
                        idx === currentStage ? 'scale-110' : ''
                      } transition-transform duration-300`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors duration-300 ${
                          idx <= currentStage
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-400 border-gray-300'
                        }`}
                      >
                        {idx < currentStage ? '✓' : idx + 1}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Estimated Time */}
                <div className="text-center pt-2">
                  <p className="text-xs text-blue-700 font-medium">
                    Estimated time: ~{Math.max(5, 20 - Math.floor(progress / 5))} seconds remaining
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !problemText.trim()}
            className="w-full bg-primary-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors active:scale-98 min-h-[48px] text-base"
          >
            {isLoading ? 'Generating Scaffold...' : 'Generate Solution Scaffold'}
          </button>
        </form>

        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-3 sm:mb-4">
            Or try a sample problem:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {SAMPLE_PROBLEMS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => loadSample(sample.text)}
                className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 group active:scale-98 transition-all min-h-[100px]"
                disabled={isLoading}
              >
                <h4 className="font-medium text-gray-900 mb-2 group-hover:text-primary-700 text-sm sm:text-base">
                  {sample.title}
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-3">
                  {sample.text}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
