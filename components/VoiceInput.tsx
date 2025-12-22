'use client'

import { useEffect } from 'react'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import type { VoiceInputError } from '@/types/voiceInput'

interface VoiceInputProps {
  onTranscriptChange: (transcript: string) => void
  onComplete?: (finalTranscript: string) => void
  language?: string
  className?: string
}

export default function VoiceInput({
  onTranscriptChange,
  onComplete,
  language = 'en-US',
  className = '',
}: VoiceInputProps) {
  const {
    isSupported,
    state,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
  } = useVoiceInput({
    language,
    continuous: true,
    interimResults: true,
    onTranscript: (text, isFinal) => {
      onTranscriptChange(text)
      if (isFinal && onComplete) {
        onComplete(text)
      }
    },
  })

  // Update parent when transcript changes
  useEffect(() => {
    if (transcript) {
      onTranscriptChange(transcript + (interimTranscript ? ' ' + interimTranscript : ''))
    }
  }, [transcript, interimTranscript, onTranscriptChange])

  const handleStart = () => {
    resetTranscript()
    startRecording()
  }

  const handleStop = () => {
    stopRecording()
    if (transcript && onComplete) {
      onComplete(transcript)
    }
  }

  const isRecording = state === 'recording'
  const isProcessing = state === 'requesting' || state === 'processing'
  const hasError = state === 'error'

  if (!isSupported) {
    return (
      <div className={`bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">Voice Input Not Supported</h3>
            <p className="text-sm text-yellow-800">
              Your browser doesn&apos;t support voice input. Please use Chrome, Edge, or Safari.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border-2 border-gray-300 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-2xl">🎤</div>
          <h3 className="font-semibold text-gray-900">Voice Input</h3>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 text-red-600">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Recording...</span>
          </div>
        )}
      </div>

      {/* Transcript Display */}
      {(transcript || interimTranscript) && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-700">
            <span className="font-medium text-gray-900">{transcript}</span>
            {interimTranscript && (
              <span className="text-gray-500 italic"> {interimTranscript}</span>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {hasError && error && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border-2 border-red-300">
          <div className="flex items-start gap-2">
            <div className="text-red-600 text-lg">❌</div>
            <div>
              <p className="text-sm font-semibold text-red-900">{error.message}</p>
              {error.details && (
                <p className="text-xs text-red-700 mt-1">Details: {error.details}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            onClick={handleStart}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Start Speaking
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            Stop Recording
          </button>
        )}

        {transcript && !isRecording && (
          <button
            onClick={resetTranscript}
            className="px-4 py-3 text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            title="Clear transcript"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-600">
        <p className="mb-1">💡 <strong>Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Speak clearly and at a normal pace</li>
          <li>Say &quot;period&quot; or &quot;comma&quot; for punctuation</li>
          <li>You can edit the transcript after recording</li>
        </ul>
      </div>
    </div>
  )
}
