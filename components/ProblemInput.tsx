'use client'

import { useState, useEffect } from 'react'
import VoiceInput from './VoiceInput'

interface ProblemInputProps {
  onSubmit: (problem: string, diagramImage?: string | null) => void
  isLoading: boolean
  error: string | null
  initialProblem?: string
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

export default function ProblemInput({ onSubmit, isLoading, error, initialProblem }: ProblemInputProps) {
  const [problemText, setProblemText] = useState(initialProblem || '')
  const [currentStage, setCurrentStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [diagramImage, setDiagramImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Update problemText when initialProblem changes (e.g., from study path)
  useEffect(() => {
    if (initialProblem) {
      setProblemText(initialProblem)
    }
  }, [initialProblem])

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)')
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setImagePreview(result)
      setDiagramImage(result)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setDiagramImage(null)
    setImagePreview(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (problemText.trim()) {
      onSubmit(problemText.trim(), diagramImage)
    }
  }

  const loadSample = (sampleText: string) => {
    setProblemText(sampleText)
    setDiagramImage(null)
    setImagePreview(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg dark:shadow-dark-lg p-4 sm:p-6 md:p-8 border border-transparent dark:border-dark-border">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-dark-text-primary mb-4 sm:mb-6">
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
                ? 'bg-accent text-white shadow-md dark:shadow-dark-glow'
                : 'bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border border border-transparent dark:border-dark-border'
            } disabled:opacity-40`}
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
                ? 'bg-accent text-white shadow-md dark:shadow-dark-glow'
                : 'bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border border border-transparent dark:border-dark-border'
            } disabled:opacity-40`}
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
            <div className="demo-step-input">
              <label htmlFor="problem" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                Problem Statement
              </label>
              <textarea
              id="problem"
              rows={6}
              className="w-full px-3 py-3 sm:px-4 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft focus:ring-2 focus:ring-accent dark:focus:ring-accent focus:border-accent dark:focus:border-accent resize-none text-gray-900 dark:text-dark-text-primary text-base placeholder:text-gray-400 dark:placeholder:text-dark-text-placeholder transition-all"
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

          {/* Diagram Upload Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
              Problem Diagram (Optional)
            </label>

            {!imagePreview ? (
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-dark-border border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-dark-card-soft hover:bg-gray-100 dark:hover:bg-dark-border hover:border-gray-400 dark:hover:border-dark-border-strong transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-2 text-gray-500 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mb-1 text-sm text-gray-600 dark:text-dark-text-secondary">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted">PNG, JPG, or GIF (max 5MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isLoading}
                  />
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Problem diagram"
                  className="w-full max-h-64 object-contain rounded-lg border-2 border-gray-300 dark:border-dark-border"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={isLoading}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-lg disabled:opacity-40"
                  aria-label="Remove image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="mt-2 text-xs text-gray-600 dark:text-dark-text-muted text-center">
                  Claude will analyze this diagram along with your problem text
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Animated Loading Progress */}
          {isLoading && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-blue-900 dark:text-blue-300">
                      {LOADING_STAGES[currentStage]?.message || 'Processing...'}
                    </span>
                    <span className="text-blue-700 dark:text-blue-400 font-medium">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900/50 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-accent dark:to-purple-500 h-full rounded-full transition-all duration-300 ease-out relative"
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
                            ? 'bg-accent text-white border-accent'
                            : 'bg-white dark:bg-dark-card-soft text-gray-400 dark:text-dark-text-muted border-gray-300 dark:border-dark-border'
                        }`}
                      >
                        {idx < currentStage ? '✓' : idx + 1}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Estimated Time */}
                <div className="text-center pt-2">
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                    Estimated time: ~{Math.max(5, 20 - Math.floor(progress / 5))} seconds remaining
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Primary CTA Button */}
          <button
            type="submit"
            disabled={isLoading || !problemText.trim()}
            className="demo-step-submit w-full bg-accent dark:bg-accent text-white py-4 px-6 rounded-lg font-semibold hover:bg-accent-strong dark:hover:bg-accent-strong disabled:bg-gray-300 dark:disabled:bg-dark-card-soft disabled:text-gray-500 dark:disabled:text-dark-text-muted disabled:cursor-not-allowed transition-all active:scale-98 min-h-[48px] text-base shadow-md hover:shadow-lg dark:shadow-dark-md dark:hover:shadow-dark-glow-strong"
          >
            {isLoading ? 'Generating Scaffold...' : 'Generate Solution Scaffold'}
          </button>
        </form>

        <div className="demo-step-samples mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200 dark:border-dark-border">
          <h3 className="text-base sm:text-lg font-medium text-gray-800 dark:text-dark-text-primary mb-3 sm:mb-4">
            Or try a sample problem:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {SAMPLE_PROBLEMS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => loadSample(sample.text)}
                className="text-left p-4 border-2 border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card hover:border-accent dark:hover:border-accent hover:bg-primary-50 dark:hover:bg-dark-card-soft group active:scale-98 transition-all min-h-[100px] hover:shadow-md dark:hover:shadow-dark-md hover:-translate-y-0.5"
                disabled={isLoading}
              >
                <h4 className="font-medium text-gray-900 dark:text-dark-text-primary mb-2 group-hover:text-accent text-sm sm:text-base">
                  {sample.title}
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-3">
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
