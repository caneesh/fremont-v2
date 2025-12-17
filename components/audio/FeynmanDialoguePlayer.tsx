'use client'

import { useState } from 'react'
import type { FeynmanScript } from '@/types/feynman'

interface FeynmanDialoguePlayerProps {
  script: FeynmanScript
  onClose: () => void
}

export default function FeynmanDialoguePlayer({ script, onClose }: FeynmanDialoguePlayerProps) {
  const [currentLine, setCurrentLine] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)

  const handleNext = () => {
    if (currentLine < script.dialogue.length - 1) {
      setCurrentLine(currentLine + 1)
    }
  }

  const handlePrevious = () => {
    if (currentLine > 0) {
      setCurrentLine(currentLine - 1)
    }
  }

  const handlePlayAll = () => {
    setIsPlaying(true)
    setCurrentLine(0)
    // In production, this would trigger TTS playback
    // For now, we'll auto-advance through dialogue
    let lineIndex = 0
    const interval = setInterval(() => {
      lineIndex++
      if (lineIndex >= script.dialogue.length) {
        clearInterval(interval)
        setIsPlaying(false)
      } else {
        setCurrentLine(lineIndex)
      }
    }, 3000 / playbackSpeed) // 3 seconds per line, adjusted by speed
  }

  const getSpeakerIcon = (speaker: 'Alex' | 'Prof') => {
    if (speaker === 'Alex') {
      return '🎓' // Student icon
    }
    return '👨‍🏫' // Professor icon
  }

  const getSpeakerStyle = (speaker: 'Alex' | 'Prof') => {
    if (speaker === 'Alex') {
      return 'bg-blue-50 border-blue-300'
    }
    return 'bg-green-50 border-green-300'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              🎭 {script.title}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-indigo-100 text-sm">
            💡 <strong>Concept:</strong> {script.concept}
          </p>
          {script.analogy && (
            <p className="text-indigo-100 text-sm mt-1">
              🎨 <strong>Analogy:</strong> {script.analogy}
            </p>
          )}
        </div>

        {/* Dialogue Display */}
        <div className="p-6 overflow-y-auto max-h-96">
          {script.dialogue.map((line, index) => (
            <div
              key={index}
              className={`mb-4 transition-all duration-300 ${
                index === currentLine
                  ? 'scale-105 opacity-100'
                  : index < currentLine
                  ? 'opacity-60'
                  : 'opacity-30'
              }`}
            >
              <div className={`border-2 rounded-lg p-4 ${getSpeakerStyle(line.speaker)}`}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{getSpeakerIcon(line.speaker)}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-700 mb-1">
                      {line.speaker === 'Alex' ? 'Alex (Student)' : 'Prof (Mentor)'}
                    </p>
                    <p className="text-gray-900 leading-relaxed">{line.text}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              Line {currentLine + 1} of {script.dialogue.length}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Speed:</label>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="0.75">0.75x</option>
                <option value="1.0">1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentLine === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <button
              onClick={handlePlayAll}
              disabled={isPlaying}
              className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center gap-2 font-medium"
            >
              {isPlaying ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Playing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play All
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentLine === script.dialogue.length - 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            💡 TIP: Listen to understand the concept intuitively, then return to solve the step!
          </p>
        </div>
      </div>
    </div>
  )
}
