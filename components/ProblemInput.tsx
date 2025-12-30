'use client'

import { useState, useEffect, useCallback } from 'react'
import VoiceInput from './VoiceInput'
import ScaffoldDensityControl from './ScaffoldDensityControl'
import { localStorageProvider } from '@/lib/storage'
import { getAdaptiveDensity } from '@/lib/adaptiveDensity'
import { authService } from '@/lib/auth/authService'
import type { ScaffoldDensity } from '@/types/scaffold'

interface AdaptiveHint {
  show: boolean
  reason: string
  confidence: 'low' | 'medium' | 'high'
}

interface ProblemInputProps {
  onSubmit: (
    problem: string,
    diagramImage?: string | null,
    density?: ScaffoldDensity,
    includeFinalAnswer?: boolean
  ) => void
  isLoading: boolean
  error: string | null
  initialProblem?: string
  initialDensity?: ScaffoldDensity
}

type InputMode = 'text' | 'voice' | 'scan'

type ScanState = 'idle' | 'uploading' | 'extracting' | 'extracted' | 'error'

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

export default function ProblemInput({ onSubmit, isLoading, error, initialProblem, initialDensity }: ProblemInputProps) {
  const [problemText, setProblemText] = useState(initialProblem || '')
  const [currentStage, setCurrentStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [scaffoldDensity, setScaffoldDensity] = useState<ScaffoldDensity>(initialDensity || 3)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [adaptiveHint, setAdaptiveHint] = useState<AdaptiveHint>({ show: false, reason: '', confidence: 'low' })
  const [includeFinalAnswer, setIncludeFinalAnswer] = useState(false)

  // Scan mode state
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanImage, setScanImage] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  // Load saved density preference or calculate adaptive density on mount
  useEffect(() => {
    if (!initialDensity) {
      const prefs = localStorageProvider.getPreferences()
      if (prefs.success && prefs.data?.scaffoldDensity) {
        // User has explicitly set a preference, use it
        setScaffoldDensity(prefs.data.scaffoldDensity)
        setAdaptiveHint({ show: false, reason: '', confidence: 'low' })
      } else {
        // No explicit preference - use adaptive density
        const recommendation = getAdaptiveDensity()
        setScaffoldDensity(recommendation.recommended)

        // Show hint if we have enough data for a personalized recommendation
        if (recommendation.metrics.totalProblems >= 3 && recommendation.confidence !== 'low') {
          setAdaptiveHint({
            show: true,
            reason: recommendation.reason,
            confidence: recommendation.confidence
          })
        }
      }
    }
  }, [initialDensity])

  // Save density preference when changed (clears adaptive hint since user is now setting explicit preference)
  const handleDensityChange = (density: ScaffoldDensity) => {
    setScaffoldDensity(density)
    setAdaptiveHint({ show: false, reason: '', confidence: 'low' })
    localStorageProvider.updatePreferences({ scaffoldDensity: density })
  }

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

  // Handle scan image upload and extraction
  const handleScanUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      setScanError('Please upload an image file (PNG, JPG, etc.)')
      return
    }

    // Check file size (max 10MB for scan)
    if (file.size > 10 * 1024 * 1024) {
      setScanError('Image size must be less than 10MB')
      return
    }

    setScanError(null)
    setScanState('uploading')

    // Read file as base64
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64Image = event.target?.result as string
      setScanImage(base64Image)
      setScanState('extracting')

      try {
        // Call extract API
        const userCode = authService.getUserCode()
        const response = await fetch('/api/extract-problem', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userCode}`,
          },
          body: JSON.stringify({ image: base64Image }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to extract problem')
        }

        const data = await response.json()
        setProblemText(data.extractedText)
        setScanState('extracted')
      } catch (err) {
        console.error('Scan extraction error:', err)
        setScanError(err instanceof Error ? err.message : 'Failed to extract problem from image')
        setScanState('error')
      }
    }
    reader.onerror = () => {
      setScanError('Failed to read image file')
      setScanState('error')
    }
    reader.readAsDataURL(file)
  }, [])

  // Reset scan state
  const resetScan = useCallback(() => {
    setScanState('idle')
    setScanImage(null)
    setScanError(null)
  }, [])

  // Switch to text mode to edit extracted text
  const editExtractedText = useCallback(() => {
    setInputMode('text')
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (problemText.trim()) {
      onSubmit(problemText.trim(), null, scaffoldDensity, includeFinalAnswer)
    }
  }

  const loadSample = (sampleText: string) => {
    setProblemText(sampleText)
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
            onClick={() => { setInputMode('scan'); resetScan(); }}
            disabled={isLoading}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
              inputMode === 'scan'
                ? 'bg-accent text-white shadow-md dark:shadow-dark-glow'
                : 'bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border border border-transparent dark:border-dark-border'
            } disabled:opacity-40`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Scan
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

          {/* Scan Mode - Upload image of problem */}
          {inputMode === 'scan' && (
            <div className="demo-step-input">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                Upload Problem Image
              </label>

              {/* Idle State - Show upload area */}
              {scanState === 'idle' && (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 dark:border-dark-border border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-dark-card-soft hover:bg-gray-100 dark:hover:bg-dark-border hover:border-accent dark:hover:border-accent transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-12 h-12 mb-3 text-gray-400 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="mb-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                        Take a photo of your physics problem (PNG, JPG - max 10MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={handleScanUpload}
                      disabled={isLoading}
                    />
                  </label>
                </div>
              )}

              {/* Uploading/Extracting State */}
              {(scanState === 'uploading' || scanState === 'extracting') && (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-dark-card-soft rounded-lg border-2 border-gray-200 dark:border-dark-border">
                  {scanImage && (
                    <div className="w-32 h-32 mb-4 rounded-lg overflow-hidden shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={scanImage} alt="Uploaded problem" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent mb-4"></div>
                  <p className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
                    {scanState === 'uploading' ? 'Uploading image...' : 'Extracting problem text...'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">
                    This may take a few seconds
                  </p>
                </div>
              )}

              {/* Extracted State - Show preview and extracted text */}
              {scanState === 'extracted' && (
                <div className="space-y-4">
                  {/* Success banner */}
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        Problem extracted successfully!
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                        Review the text below and click &quot;Generate Scaffold&quot; to continue
                      </p>
                    </div>
                  </div>

                  {/* Image preview (small) */}
                  {scanImage && (
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-dark-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={scanImage} alt="Scanned problem" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-2">
                          Extracted text:
                        </p>
                        <div className="p-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg max-h-40 overflow-y-auto">
                          <p className="text-sm text-gray-800 dark:text-dark-text-primary whitespace-pre-wrap">
                            {problemText}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={editExtractedText}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-card-soft border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Text
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={resetScan}
                      className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-dark-text-muted hover:text-gray-800 dark:hover:text-dark-text-secondary transition-colors"
                    >
                      Scan Again
                    </button>
                  </div>
                </div>
              )}

              {/* Error State */}
              {scanState === 'error' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">
                        Failed to extract problem
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                        {scanError || 'Please try again with a clearer image'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetScan}
                    className="w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-card-soft border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {scanError && scanState === 'idle' && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{scanError}</p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Advanced Options (Scaffold Density) */}
          <div className="border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              disabled={isLoading}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-dark-card-soft hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                Advanced Options
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-dark-text-muted">
                  Density: {scaffoldDensity}/5
                </span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {showAdvancedOptions && (
              <div className="p-4 border-t border-gray-200 dark:border-dark-border space-y-4">
                {/* Adaptive Density Hint */}
                {adaptiveHint.show && (
                  <div className={`flex items-start gap-3 p-3 rounded-lg ${
                    adaptiveHint.confidence === 'high'
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  }`}>
                    <div className={`flex-shrink-0 w-5 h-5 mt-0.5 ${
                      adaptiveHint.confidence === 'high'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        adaptiveHint.confidence === 'high'
                          ? 'text-green-800 dark:text-green-300'
                          : 'text-blue-800 dark:text-blue-300'
                      }`}>
                        Personalized for you
                      </p>
                      <p className={`text-xs mt-0.5 ${
                        adaptiveHint.confidence === 'high'
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-blue-700 dark:text-blue-400'
                      }`}>
                        {adaptiveHint.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdaptiveHint(prev => ({ ...prev, show: false }))}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary"
                      aria-label="Dismiss"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                <ScaffoldDensityControl
                  value={scaffoldDensity}
                  onChange={handleDensityChange}
                  disabled={isLoading}
                />

                <div className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card-soft p-3">
                  <input
                    id="reverse-solve"
                    type="checkbox"
                    checked={includeFinalAnswer}
                    onChange={(e) => setIncludeFinalAnswer(e.target.checked)}
                    disabled={isLoading}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent/40"
                  />
                  <label htmlFor="reverse-solve" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium text-gray-800 dark:text-dark-text-primary">
                      Reverse-Solve (show final answer)
                    </div>
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-1">
                      Reveal the final numerical answer up front and reconstruct the reasoning steps.
                    </p>
                  </label>
                </div>
              </div>
            )}
          </div>

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
