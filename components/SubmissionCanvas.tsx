'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type {
  SubmissionTab,
  ScanState,
  GradeSolutionRequest,
  GradeSolutionResponse,
  AutocompleteSuggestion,
  PHYSICS_AUTOCOMPLETE
} from '@/types/gradeSolution'
import { PHYSICS_AUTOCOMPLETE as AUTOCOMPLETE_DATA } from '@/types/gradeSolution'
import { mockTranscribeImage, validateImageFile } from '@/lib/mockTranscribe'
import { authenticatedFetch, handleQuotaExceeded } from '@/lib/api/apiClient'
import MathRenderer from './MathRenderer'

interface SubmissionCanvasProps {
  problemText: string
  domain: string
  subdomain: string
  concepts?: Array<{ id: string; name: string }>
  expectedApproach?: string
  keyEquations?: string[]
  onGradeComplete?: (result: GradeSolutionResponse) => void
}

export default function SubmissionCanvas({
  problemText,
  domain,
  subdomain,
  concepts,
  expectedApproach,
  keyEquations,
  onGradeComplete
}: SubmissionCanvasProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<SubmissionTab>('text')

  // Text solution state
  const [solutionText, setSolutionText] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [autocompleteVisible, setAutocompleteVisible] = useState(false)
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 })
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scan/upload state
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [transcribedText, setTranscribedText] = useState('')
  const [scanProgress, setScanProgress] = useState(0)
  const [scanPhase, setScanPhase] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Grading state
  const [isGrading, setIsGrading] = useState(false)
  const [gradeResult, setGradeResult] = useState<GradeSolutionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Handle text input with autocomplete detection
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setSolutionText(value)

    // Check for autocomplete triggers
    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPosition)
    const lastWord = textBeforeCursor.split(/\s/).pop() || ''

    if (lastWord.length >= 2) {
      const matches = AUTOCOMPLETE_DATA.filter(
        item => item.trigger.toLowerCase().startsWith(lastWord.toLowerCase())
      ).slice(0, 5)

      if (matches.length > 0) {
        setAutocompleteSuggestions(matches)
        setSelectedSuggestionIndex(0)

        // Calculate position for autocomplete popup
        const textarea = textareaRef.current
        if (textarea) {
          const lines = textBeforeCursor.split('\n')
          const lineHeight = 24
          const charWidth = 9
          const top = Math.min(lines.length * lineHeight, 200)
          const left = Math.min((lines[lines.length - 1]?.length || 0) * charWidth, 400)
          setAutocompletePosition({ top, left })
        }

        setAutocompleteVisible(true)
      } else {
        setAutocompleteVisible(false)
      }
    } else {
      setAutocompleteVisible(false)
    }
  }

  // Handle autocomplete selection
  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = solutionText.slice(0, cursorPosition)
    const textAfterCursor = solutionText.slice(cursorPosition)
    const lastWord = textBeforeCursor.split(/\s/).pop() || ''

    const newTextBefore = textBeforeCursor.slice(0, -lastWord.length)
    setSolutionText(newTextBefore + suggestion.suggestion + ' ' + textAfterCursor)
    setAutocompleteVisible(false)

    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  // Handle keyboard navigation for autocomplete
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!autocompleteVisible) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev =>
        prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : prev)
    } else if (e.key === 'Enter' && autocompleteSuggestions[selectedSuggestionIndex]) {
      e.preventDefault()
      handleSelectSuggestion(autocompleteSuggestions[selectedSuggestionIndex])
    } else if (e.key === 'Escape') {
      setAutocompleteVisible(false)
    }
  }

  // Handle file upload
  const handleFileSelect = async (file: File) => {
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    setError(null)
    setUploadedFile(file)
    setScanState('uploading')

    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setUploadPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Start scanning animation
    setScanState('scanning')
    setScanProgress(0)

    // Simulate scanning progress
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + Math.random() * 15
      })
    }, 300)

    const phases = [
      'Detecting handwriting...',
      'Enhancing image quality...',
      'Recognizing mathematical symbols...',
      'Parsing equations...',
      'Finalizing transcription...'
    ]

    let phaseIndex = 0
    const phaseInterval = setInterval(() => {
      if (phaseIndex < phases.length) {
        setScanPhase(phases[phaseIndex])
        phaseIndex++
      } else {
        clearInterval(phaseInterval)
      }
    }, 500)

    try {
      const result = await mockTranscribeImage(file)
      clearInterval(progressInterval)
      clearInterval(phaseInterval)

      setScanProgress(100)
      setScanPhase('Complete!')
      setTranscribedText(result.text)

      // Small delay before showing transcribed state
      await new Promise(resolve => setTimeout(resolve, 500))
      setScanState('transcribed')
    } catch (err) {
      clearInterval(progressInterval)
      clearInterval(phaseInterval)
      setError('Failed to transcribe image. Please try again.')
      setScanState('idle')
    }
  }

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Submit solution for grading
  const handleSubmitSolution = async () => {
    const solutionToGrade = activeTab === 'text' ? solutionText : transcribedText

    if (!solutionToGrade.trim()) {
      setError('Please enter or upload a solution to grade.')
      return
    }

    setIsGrading(true)
    setError(null)
    setGradeResult(null)

    if (activeTab === 'scan') {
      setScanState('grading')
    }

    try {
      const request: GradeSolutionRequest = {
        solution: solutionToGrade,
        problemContext: {
          problemText,
          domain,
          subdomain,
          expectedApproach,
          keyEquations,
          concepts
        },
        submissionType: activeTab === 'text' ? 'text' : 'handwriting'
      }

      const response = await authenticatedFetch('/api/grade-solution', {
        method: 'POST',
        body: JSON.stringify(request)
      })

      if (await handleQuotaExceeded(response)) {
        setIsGrading(false)
        setScanState(activeTab === 'scan' ? 'transcribed' : 'idle')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to grade solution')
      }

      const result: GradeSolutionResponse = await response.json()
      setGradeResult(result)
      setScanState('complete')
      onGradeComplete?.(result)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setScanState(activeTab === 'scan' ? 'transcribed' : 'idle')
    } finally {
      setIsGrading(false)
    }
  }

  // Reset scan state
  const handleResetScan = () => {
    setScanState('idle')
    setUploadedFile(null)
    setUploadPreview(null)
    setTranscribedText('')
    setScanProgress(0)
    setScanPhase('')
    setGradeResult(null)
  }

  // Get status color and icon
  const getStatusDisplay = (status: GradeSolutionResponse['status']) => {
    switch (status) {
      case 'SUCCESS':
        return {
          color: 'bg-green-500/20 border-green-500 text-green-400',
          icon: '✓',
          label: 'Correct Solution'
        }
      case 'MINOR_SLIP':
        return {
          color: 'bg-amber-500/20 border-amber-500 text-amber-400',
          icon: '~',
          label: 'Minor Error'
        }
      case 'CONCEPTUAL_GAP':
        return {
          color: 'bg-red-500/20 border-red-500 text-red-400',
          icon: '✗',
          label: 'Conceptual Issue'
        }
    }
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'text'
              ? 'bg-slate-800 text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Type Solution
        </button>
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'scan'
              ? 'bg-slate-800 text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Scan Handwriting
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Text Solution Tab */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            {/* Editor */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Solution (Markdown + LaTeX supported)
              </label>
              <textarea
                ref={textareaRef}
                value={solutionText}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Enter your solution here...&#10;&#10;Use LaTeX for equations: $F = ma$&#10;Use $$ for display math:&#10;$$E = mc^2$$"
                className="w-full h-64 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder:text-slate-500 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                disabled={isGrading}
              />

              {/* Autocomplete Popup */}
              {autocompleteVisible && autocompleteSuggestions.length > 0 && (
                <div
                  className="absolute z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden"
                  style={{ top: autocompletePosition.top + 40, left: autocompletePosition.left }}
                >
                  {autocompleteSuggestions.map((suggestion, idx) => (
                    <button
                      key={suggestion.trigger}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                        idx === selectedSuggestionIndex
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <code className="text-xs bg-slate-900/50 px-2 py-0.5 rounded">
                        {suggestion.trigger}
                      </code>
                      <span className="text-sm">{suggestion.description}</span>
                    </button>
                  ))}
                  <div className="px-4 py-2 bg-slate-900/50 text-xs text-slate-500">
                    ↑↓ to navigate, Enter to select, Esc to close
                  </div>
                </div>
              )}
            </div>

            {/* Preview Toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-2"
              >
                <svg className={`w-4 h-4 transition-transform ${showPreview ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>

              <div className="text-xs text-slate-500">
                Tip: Type <code className="bg-slate-800 px-1 rounded">\sum</code> for autocomplete suggestions
              </div>
            </div>

            {/* Preview Panel */}
            {showPreview && solutionText && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="text-xs text-slate-500 mb-2">Preview:</div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <MathRenderer text={solutionText} className="text-slate-200" />
                </div>
              </div>
            )}

            {/* Submit Button */}
            {!gradeResult && (
              <button
                onClick={handleSubmitSolution}
                disabled={isGrading || !solutionText.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isGrading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing Solution...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Grade My Solution
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Scan Handwriting Tab */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            {/* Upload Zone - Idle State */}
            {scanState === 'idle' && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center hover:border-indigo-500 hover:bg-slate-800/30 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                <p className="text-slate-300 font-medium mb-2">
                  Drop your handwritten solution here
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  or click to upload / take a photo
                </p>

                <div className="flex justify-center gap-3">
                  <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400">
                    JPG
                  </span>
                  <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400">
                    PNG
                  </span>
                  <span className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400">
                    WebP
                  </span>
                </div>
              </div>
            )}

            {/* Scanning State */}
            {(scanState === 'uploading' || scanState === 'scanning') && (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center">
                {/* Animated scanning effect */}
                <div className="relative w-32 h-32 mx-auto mb-6">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-pulse" />
                  {/* Spinning ring */}
                  <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
                  {/* Inner content */}
                  <div className="absolute inset-4 rounded-full bg-slate-900 flex items-center justify-center">
                    <div className="text-2xl">🔬</div>
                  </div>
                  {/* Floating particles */}
                  <div className="absolute top-0 left-1/2 w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  <div className="absolute top-1/2 left-0 w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                </div>

                <h3 className="text-lg font-semibold text-slate-200 mb-2">
                  Scanning Physics Particles...
                </h3>
                <p className="text-sm text-indigo-400 mb-4">{scanPhase || 'Initializing...'}</p>

                {/* Progress bar */}
                <div className="max-w-xs mx-auto bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${Math.min(scanProgress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">{Math.round(scanProgress)}%</p>
              </div>
            )}

            {/* Transcribed State */}
            {scanState === 'transcribed' && (
              <div className="space-y-4">
                {/* Image preview */}
                {uploadPreview && (
                  <div className="relative">
                    <img
                      src={uploadPreview}
                      alt="Uploaded solution"
                      className="w-full max-h-48 object-contain rounded-lg border border-slate-700"
                    />
                    <button
                      onClick={handleResetScan}
                      className="absolute top-2 right-2 p-1 bg-slate-900/80 rounded-full text-slate-400 hover:text-white"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Transcribed text (editable) */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Transcribed Text (verify & edit if needed)
                  </label>
                  <textarea
                    value={transcribedText}
                    onChange={(e) => setTranscribedText(e.target.value)}
                    className="w-full h-48 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Preview */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="text-xs text-slate-500 mb-2">Preview:</div>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <MathRenderer text={transcribedText} className="text-slate-200" />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleResetScan}
                    className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
                  >
                    Re-upload
                  </button>
                  <button
                    onClick={handleSubmitSolution}
                    disabled={isGrading}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isGrading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Grading...
                      </>
                    ) : (
                      'Verify & Grade'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Grading State */}
            {scanState === 'grading' && (
              <div className="bg-slate-800/50 rounded-xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-600/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-indigo-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">
                  Analyzing Your Solution...
                </h3>
                <p className="text-sm text-slate-400">
                  Checking physics concepts and mathematical accuracy
                </p>
              </div>
            )}
          </div>
        )}

        {/* Grade Result Display */}
        {gradeResult && (
          <div className="mt-6 space-y-4">
            {/* Status Header */}
            <div className={`p-4 rounded-lg border ${getStatusDisplay(gradeResult.status).color}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-current/20 flex items-center justify-center text-xl font-bold">
                  {getStatusDisplay(gradeResult.status).icon}
                </div>
                <div>
                  <h4 className="font-semibold text-lg">
                    {getStatusDisplay(gradeResult.status).label}
                  </h4>
                  <p className="text-sm opacity-80">
                    Confidence: {Math.round((gradeResult.confidence || 0.9) * 100)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <h5 className="text-sm font-medium text-slate-400 mb-2">Feedback</h5>
              <div className="prose prose-invert prose-sm max-w-none">
                <MathRenderer text={gradeResult.feedback_markdown} className="text-slate-200" />
              </div>
            </div>

            {/* Highlighted Location */}
            {gradeResult.highlight_location && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <h5 className="text-sm font-medium text-amber-400 mb-2">Focus Area</h5>
                <code className="text-sm text-amber-200 bg-amber-500/10 px-2 py-1 rounded">
                  {gradeResult.highlight_location}
                </code>
              </div>
            )}

            {/* Next Action Button */}
            <button
              onClick={() => {
                // Handle next action based on type
                console.log('Next action:', gradeResult.next_action)
              }}
              className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                gradeResult.status === 'SUCCESS'
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : gradeResult.status === 'MINOR_SLIP'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {gradeResult.next_action.type === 'OPTIMIZE' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              )}
              {gradeResult.next_action.type === 'FIX_LINE' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )}
              {gradeResult.next_action.type === 'REVIEW_CONCEPT' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              )}
              {gradeResult.next_action.label}
            </button>

            {/* Try Again */}
            <button
              onClick={() => {
                setGradeResult(null)
                if (activeTab === 'scan') {
                  setScanState('transcribed')
                }
              }}
              className="w-full py-2 text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              Modify and resubmit
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
