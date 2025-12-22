import { useState, useRef, useCallback, useEffect } from 'react'
import type {
  VoiceRecordingState,
  VoiceInputError,
  VoiceErrorCode,
} from '@/types/voiceInput'
import { isVoiceInputSupported, mapNativeError, getVoiceErrorMessage } from '@/types/voiceInput'

interface UseVoiceInputOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
  onTranscript?: (transcript: string, isFinal: boolean) => void
  onError?: (error: VoiceInputError) => void
}

interface UseVoiceInputReturn {
  isSupported: boolean
  state: VoiceRecordingState
  transcript: string
  interimTranscript: string
  error: VoiceInputError | null
  startRecording: () => void
  stopRecording: () => void
  resetTranscript: () => void
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    language = 'en-US',
    continuous = true,
    interimResults = true,
    maxAlternatives = 1,
    onTranscript,
    onError,
  } = options

  const [isSupported, setIsSupported] = useState(false)
  const [state, setState] = useState<VoiceRecordingState>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<VoiceInputError | null>(null)

  const recognitionRef = useRef<any>(null)

  // Check browser support on mount
  useEffect(() => {
    setIsSupported(isVoiceInputSupported())
  }, [])

  const startRecording = useCallback(() => {
    if (!isVoiceInputSupported()) {
      const notSupportedError: VoiceInputError = {
        code: 'NOT_SUPPORTED',
        message: getVoiceErrorMessage('NOT_SUPPORTED'),
      }
      setError(notSupportedError)
      setState('error')
      onError?.(notSupportedError)
      return
    }

    try {
      setState('requesting')
      setError(null)
      setTranscript('')
      setInterimTranscript('')

      // Create recognition instance
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition

      const recognition = new SpeechRecognition()
      recognition.lang = language
      recognition.continuous = continuous
      recognition.interimResults = interimResults
      recognition.maxAlternatives = maxAlternatives

      // Handle results
      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        let interimText = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcriptPart = result[0].transcript

          if (result.isFinal) {
            finalTranscript += transcriptPart + ' '
          } else {
            interimText += transcriptPart
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => {
            const newTranscript = prev + finalTranscript
            onTranscript?.(newTranscript, true)
            return newTranscript
          })
          setInterimTranscript('')
        }

        if (interimText) {
          setInterimTranscript(interimText)
          onTranscript?.(transcript + interimText, false)
        }
      }

      // Handle start
      recognition.onstart = () => {
        setState('recording')
      }

      // Handle end
      recognition.onend = () => {
        if (state === 'recording') {
          setState('completed')
        }
      }

      // Handle errors
      recognition.onerror = (event: any) => {
        const errorCode = mapNativeError(event.error)
        const voiceError: VoiceInputError = {
          code: errorCode,
          message: getVoiceErrorMessage(errorCode),
          details: event.error,
        }
        setError(voiceError)
        setState('error')
        onError?.(voiceError)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      const unknownError: VoiceInputError = {
        code: 'UNKNOWN',
        message: getVoiceErrorMessage('UNKNOWN'),
        details: err instanceof Error ? err.message : String(err),
      }
      setError(unknownError)
      setState('error')
      onError?.(unknownError)
    }
  }, [language, continuous, interimResults, maxAlternatives, onTranscript, onError, transcript, state])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        setState('completed')
      } catch (err) {
        console.error('Error stopping recognition:', err)
      }
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
    setState('idle')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    }
  }, [])

  return {
    isSupported,
    state,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
  }
}
