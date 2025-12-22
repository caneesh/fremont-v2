// Voice Input Types - Speech-to-Text for Problem Entry

export type VoiceRecordingState =
  | 'idle'           // Not recording
  | 'requesting'     // Requesting microphone permission
  | 'recording'      // Actively recording
  | 'processing'     // Converting speech to text
  | 'error'          // Error occurred
  | 'completed'      // Transcription complete

export interface VoiceInputResult {
  transcript: string
  confidence: number  // 0-1, how confident the recognition is
  isFinal: boolean    // Is this the final result or interim?
  timestamp: string
}

export interface VoiceInputError {
  code: VoiceErrorCode
  message: string
  details?: string
}

export type VoiceErrorCode =
  | 'NOT_SUPPORTED'           // Browser doesn't support Web Speech API
  | 'PERMISSION_DENIED'       // User denied microphone permission
  | 'NO_SPEECH'               // No speech detected
  | 'AUDIO_CAPTURE'           // Audio capture failed
  | 'NETWORK'                 // Network error (speech API uses cloud)
  | 'NOT_ALLOWED'             // Not allowed to use microphone
  | 'SERVICE_NOT_ALLOWED'     // Speech service not allowed
  | 'ABORTED'                 // Recognition was aborted
  | 'UNKNOWN'                 // Unknown error

export interface VoiceInputSession {
  id: string
  startTime: string
  endTime?: string
  transcript: string
  interimTranscripts: string[]
  finalTranscript: string
  confidence: number
  language: string
  duration: number  // milliseconds
}

export interface VoiceInputStatistics {
  totalSessions: number
  successfulSessions: number
  averageDuration: number
  averageConfidence: number
  mostCommonErrors: VoiceErrorCode[]
}

// Browser support check
export function isVoiceInputSupported(): boolean {
  if (typeof window === 'undefined') return false

  // Check for Web Speech API support
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition

  return !!SpeechRecognition
}

// Get user-friendly error message
export function getVoiceErrorMessage(code: VoiceErrorCode): string {
  switch (code) {
    case 'NOT_SUPPORTED':
      return 'Voice input is not supported in your browser. Try Chrome or Edge.'
    case 'PERMISSION_DENIED':
      return 'Microphone access denied. Please enable microphone permissions.'
    case 'NO_SPEECH':
      return 'No speech detected. Please speak clearly and try again.'
    case 'AUDIO_CAPTURE':
      return 'Could not capture audio. Check your microphone connection.'
    case 'NETWORK':
      return 'Network error. Check your internet connection.'
    case 'NOT_ALLOWED':
      return 'Microphone access not allowed. Check browser settings.'
    case 'SERVICE_NOT_ALLOWED':
      return 'Speech recognition service not allowed.'
    case 'ABORTED':
      return 'Recording was cancelled.'
    case 'UNKNOWN':
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

// Map native error codes to our error codes
export function mapNativeError(error: string): VoiceErrorCode {
  const lowerError = error.toLowerCase()

  // Check service-not-allowed BEFORE general not-allowed
  if (lowerError.includes('service-not-allowed')) {
    return 'SERVICE_NOT_ALLOWED'
  }
  if (lowerError.includes('not-allowed') || lowerError.includes('permission')) {
    return 'PERMISSION_DENIED'
  }
  if (lowerError.includes('no-speech')) {
    return 'NO_SPEECH'
  }
  if (lowerError.includes('audio')) {
    return 'AUDIO_CAPTURE'
  }
  if (lowerError.includes('network')) {
    return 'NETWORK'
  }
  if (lowerError.includes('aborted')) {
    return 'ABORTED'
  }

  return 'UNKNOWN'
}
