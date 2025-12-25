'use client'

import { useState } from 'react'
import type { ExtractionResult } from '@/types/paperSolution'

interface ExtractedTextEditorProps {
  extractionResult: ExtractionResult
  editedText: string
  onTextChange: (text: string) => void
  analyzeMode: boolean
  onToggleAnalyzeMode: () => void
  onAnalyze: () => void
  onBack: () => void
  isProcessing: boolean
}

export default function ExtractedTextEditor({
  extractionResult,
  editedText,
  onTextChange,
  analyzeMode,
  onToggleAnalyzeMode,
  onAnalyze,
  onBack,
  isProcessing,
}: ExtractedTextEditorProps) {
  const [showDiff, setShowDiff] = useState(false)

  const confidencePercent = Math.round(extractionResult.overallConfidence * 100)
  const confidenceColor =
    confidencePercent >= 80
      ? 'text-green-600 dark:text-green-400'
      : confidencePercent >= 60
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400'

  const confidenceBarColor =
    confidencePercent >= 80
      ? 'bg-green-500'
      : confidencePercent >= 60
      ? 'bg-yellow-500'
      : 'bg-red-500'

  return (
    <div className="space-y-4">
      {/* Header with confidence */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
          Extracted Text
        </h4>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-dark-text-muted">Confidence:</span>
            <div className="w-16 h-2 bg-gray-200 dark:bg-dark-card-soft rounded-full overflow-hidden">
              <div
                className={`h-full ${confidenceBarColor} transition-all`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${confidenceColor}`}>
              {confidencePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Low confidence warning */}
      {confidencePercent < 70 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                Some text may need correction
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">
                Please review the extracted text below and fix any OCR errors before proceeding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Text editor */}
      <div className="relative">
        <textarea
          value={editedText}
          onChange={(e) => onTextChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary font-mono text-sm focus:ring-2 focus:ring-accent focus:border-transparent resize-y transition-colors"
          rows={12}
          placeholder="Extracted text will appear here..."
        />

        {/* Show diff toggle */}
        <button
          onClick={() => setShowDiff(!showDiff)}
          className="absolute top-2 right-2 text-xs text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text-secondary"
        >
          {showDiff ? 'Hide original' : 'Show original'}
        </button>
      </div>

      {/* Original text (diff view) */}
      {showDiff && (
        <div className="p-3 bg-gray-50 dark:bg-dark-app rounded-lg">
          <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-2">
            Original OCR output:
          </p>
          <pre className="text-xs text-gray-600 dark:text-dark-text-muted font-mono whitespace-pre-wrap">
            {extractionResult.rawText}
          </pre>
        </div>
      )}

      {/* Analyze mode toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={analyzeMode}
              onChange={onToggleAnalyzeMode}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 dark:bg-dark-card-soft peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </label>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
              {analyzeMode ? 'Analyze my handwritten work' : 'Just store my work'}
            </p>
            <p className="text-xs text-gray-500 dark:text-dark-text-muted">
              {analyzeMode
                ? 'Get AI feedback on your solution'
                : 'Save without analysis (for privacy or speed)'}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="px-4 py-2 text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Images
        </button>

        <button
          onClick={onAnalyze}
          disabled={isProcessing || !editedText.trim()}
          className={`px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors ${
            analyzeMode
              ? 'bg-accent text-white hover:bg-accent-strong disabled:bg-gray-300 dark:disabled:bg-dark-card-soft'
              : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-dark-card-soft'
          } disabled:cursor-not-allowed`}
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </>
          ) : analyzeMode ? (
            <>
              Analyze Solution
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          ) : (
            <>
              Save Work
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
