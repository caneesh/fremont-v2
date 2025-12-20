'use client'

import { useState, useRef, useEffect } from 'react'
import type { FeynmanScript } from '@/types/feynman'

interface FeynmanDialoguePlayerProps {
  script: FeynmanScript
  onClose: () => void
}

export default function FeynmanDialoguePlayer({ script, onClose }: FeynmanDialoguePlayerProps) {
  const [currentLine, setCurrentLine] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [ttsSupported, setTtsSupported] = useState(false)
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  // Check if TTS is supported and load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setTtsSupported(true)
      synthRef.current = window.speechSynthesis

      // Load voices
      const loadVoices = () => {
        const voices = synthRef.current?.getVoices() || []
        console.log('Attempting to load voices, found:', voices.length)
        if (voices.length > 0) {
          voicesRef.current = voices
          setVoicesLoaded(true)
          console.log('✅ Voices loaded successfully:', voices.length)
          console.log('Available voice names:', voices.map(v => v.name).join(', '))
        } else {
          console.log('⚠️ No voices found yet, will retry...')
        }
      }

      // Try to load voices immediately
      loadVoices()

      // Also listen for voiceschanged event (Chrome/Edge needs this)
      if (synthRef.current) {
        synthRef.current.onvoiceschanged = () => {
          console.log('voiceschanged event fired')
          loadVoices()
        }
      }

      // Fallback: Keep trying to load voices for 3 seconds
      const retryInterval = setInterval(() => {
        if (!voicesRef.current.length) {
          loadVoices()
        } else {
          clearInterval(retryInterval)
        }
      }, 200)

      // Give up after 3 seconds and mark as "loaded" anyway
      const timeout = setTimeout(() => {
        clearInterval(retryInterval)
        if (!voicesRef.current.length) {
          console.log('⚠️ Timeout waiting for voices, will use default voice')
        }
        setVoicesLoaded(true)
      }, 3000)

      return () => {
        clearInterval(retryInterval)
        clearTimeout(timeout)
      }
    }
  }, [])

  // Stop any currently playing speech
  const stopSpeech = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech()
    }
  }, [])

  // Stop speech when playback speed changes during playback
  useEffect(() => {
    if (isPlaying) {
      stopSpeech()
      setIsPlaying(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackSpeed])

  const handleNext = () => {
    stopSpeech()
    if (currentLine < script.dialogue.length - 1) {
      setCurrentLine(currentLine + 1)
    }
  }

  const handlePrevious = () => {
    stopSpeech()
    if (currentLine > 0) {
      setCurrentLine(currentLine - 1)
    }
  }

  // Speak a single line
  const speakLine = (lineIndex: number, onEnd?: () => void) => {
    if (!synthRef.current || !ttsSupported) {
      console.log('❌ TTS not supported, using fallback')
      setTimeout(() => onEnd?.(), 3000 / playbackSpeed)
      return
    }

    const line = script.dialogue[lineIndex]
    console.log('🎤 Speaking line:', lineIndex, '-', line.text.substring(0, 50) + '...')

    const utterance = new SpeechSynthesisUtterance(line.text)

    // Choose voice based on speaker
    const voices = voicesRef.current
    console.log('📢 Available voices:', voices.length)

    if (voices.length > 0) {
      if (line.speaker === 'Alex') {
        // Try to find a younger/female voice for student
        const studentVoice = voices.find(v =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('zira')
        )
        if (studentVoice) {
          utterance.voice = studentVoice
          console.log('✅ Using Alex voice:', studentVoice.name)
        } else {
          console.log('⚠️ Using default voice for Alex (no female voice found)')
        }
      } else {
        // Try to find a male/authoritative voice for professor
        const profVoice = voices.find(v =>
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('daniel') ||
          v.name.toLowerCase().includes('david')
        )
        if (profVoice) {
          utterance.voice = profVoice
          console.log('✅ Using Prof voice:', profVoice.name)
        } else {
          console.log('⚠️ Using default voice for Prof (no male voice found)')
        }
      }
    } else {
      console.log('⚠️ No voices loaded, using system default voice')
    }

    utterance.rate = playbackSpeed
    utterance.pitch = line.speaker === 'Alex' ? 1.1 : 0.9
    utterance.volume = 1.0 // Ensure volume is at maximum
    utterance.lang = 'en-US' // Explicitly set language

    utterance.onstart = () => {
      console.log('✅ Speech started successfully!')
    }

    utterance.onend = () => {
      console.log('✅ Speech ended')
      onEnd?.()
    }

    utterance.onerror = (event) => {
      console.error('❌ TTS error:', event.error)
      console.error('Error details:', event)
      setTimeout(() => onEnd?.(), 3000 / playbackSpeed)
    }

    utteranceRef.current = utterance

    // Make sure synthesis is not paused
    if (synthRef.current.paused) {
      console.log('⚠️ Synthesis was paused, resuming...')
      synthRef.current.resume()
    }

    // Cancel any ongoing speech first
    synthRef.current.cancel()

    console.log('🚀 Calling speechSynthesis.speak()...')
    try {
      synthRef.current.speak(utterance)
      console.log('✅ speak() called successfully')
    } catch (error) {
      console.error('❌ Exception calling speak():', error)
    }
  }

  const handlePlayAll = () => {
    stopSpeech()
    setIsPlaying(true)
    setCurrentLine(0)

    // Play lines sequentially
    let lineIndex = 0

    const playNext = () => {
      if (lineIndex >= script.dialogue.length) {
        setIsPlaying(false)
        return
      }

      setCurrentLine(lineIndex)
      speakLine(lineIndex, () => {
        lineIndex++
        playNext()
      })
    }

    playNext()
  }

  const handleStop = () => {
    stopSpeech()
    setIsPlaying(false)
  }

  const handlePlaySingle = () => {
    stopSpeech()
    speakLine(currentLine)
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

          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handlePrevious}
              disabled={currentLine === 0 || isPlaying}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <button
              onClick={handlePlaySingle}
              disabled={isPlaying}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 flex items-center gap-2"
              title="Play current line"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              Play Line
            </button>

            {isPlaying ? (
              <button
                onClick={handleStop}
                className="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Stop
              </button>
            ) : (
              <button
                onClick={handlePlayAll}
                className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play All
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={currentLine === script.dialogue.length - 1 || isPlaying}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {!ttsSupported && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ Text-to-speech not supported in your browser. Audio playback unavailable.
            </div>
          )}

          {ttsSupported && !voicesLoaded && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              ⏳ Loading voices... If this persists, try clicking &quot;Play Line&quot; anyway.
            </div>
          )}

          {ttsSupported && voicesLoaded && (
            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
              ✅ Audio ready! {voicesRef.current.length} voices available. Click &quot;Play Line&quot; or &quot;Play All&quot;.
            </div>
          )}

          <p className="text-xs text-gray-500 text-center">
            💡 TIP: {ttsSupported
              ? 'Click "Play Line" to hear the current dialogue, or "Play All" to hear the full conversation!'
              : 'Read through the dialogue to understand the concept intuitively, then return to solve the step!'}
          </p>
        </div>
      </div>
    </div>
  )
}
