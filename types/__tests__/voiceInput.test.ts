import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isVoiceInputSupported,
  getVoiceErrorMessage,
  mapNativeError,
  type VoiceErrorCode,
} from '../voiceInput'

describe('Voice Input Types and Utilities', () => {
  describe('isVoiceInputSupported', () => {
    let originalWindow: any

    beforeEach(() => {
      originalWindow = global.window
    })

    afterEach(() => {
      global.window = originalWindow
    })

    it('should return false when window is undefined', () => {
      // @ts-ignore
      global.window = undefined
      expect(isVoiceInputSupported()).toBe(false)
    })

    it('should return true when SpeechRecognition is available', () => {
      global.window = {
        SpeechRecognition: class {}
      } as any

      expect(isVoiceInputSupported()).toBe(true)
    })

    it('should return true when webkitSpeechRecognition is available', () => {
      global.window = {
        webkitSpeechRecognition: class {}
      } as any

      expect(isVoiceInputSupported()).toBe(true)
    })

    it('should return false when neither API is available', () => {
      global.window = {} as any

      expect(isVoiceInputSupported()).toBe(false)
    })
  })

  describe('getVoiceErrorMessage', () => {
    it('should return correct message for NOT_SUPPORTED', () => {
      const message = getVoiceErrorMessage('NOT_SUPPORTED')
      expect(message).toContain('not supported')
      expect(message).toContain('browser')
    })

    it('should return correct message for PERMISSION_DENIED', () => {
      const message = getVoiceErrorMessage('PERMISSION_DENIED')
      expect(message).toContain('denied')
      expect(message).toContain('microphone')
    })

    it('should return correct message for NO_SPEECH', () => {
      const message = getVoiceErrorMessage('NO_SPEECH')
      expect(message).toContain('No speech')
      expect(message).toContain('detected')
    })

    it('should return correct message for AUDIO_CAPTURE', () => {
      const message = getVoiceErrorMessage('AUDIO_CAPTURE')
      expect(message).toContain('audio')
      expect(message).toContain('microphone')
    })

    it('should return correct message for NETWORK', () => {
      const message = getVoiceErrorMessage('NETWORK')
      expect(message).toContain('Network')
      expect(message).toContain('internet')
    })

    it('should return correct message for NOT_ALLOWED', () => {
      const message = getVoiceErrorMessage('NOT_ALLOWED')
      expect(message).toContain('not allowed')
      expect(message).toContain('settings')
    })

    it('should return correct message for SERVICE_NOT_ALLOWED', () => {
      const message = getVoiceErrorMessage('SERVICE_NOT_ALLOWED')
      expect(message).toContain('service')
      expect(message).toContain('not allowed')
    })

    it('should return correct message for ABORTED', () => {
      const message = getVoiceErrorMessage('ABORTED')
      expect(message).toContain('cancelled')
    })

    it('should return generic message for UNKNOWN', () => {
      const message = getVoiceErrorMessage('UNKNOWN')
      expect(message).toContain('unexpected')
      expect(message).toContain('try again')
    })
  })

  describe('mapNativeError', () => {
    it('should map permission errors correctly', () => {
      expect(mapNativeError('not-allowed')).toBe('PERMISSION_DENIED')
      expect(mapNativeError('permission-denied')).toBe('PERMISSION_DENIED')
      expect(mapNativeError('NOT-ALLOWED')).toBe('PERMISSION_DENIED')
    })

    it('should map no-speech error correctly', () => {
      expect(mapNativeError('no-speech')).toBe('NO_SPEECH')
      expect(mapNativeError('NO-SPEECH')).toBe('NO_SPEECH')
    })

    it('should map audio errors correctly', () => {
      expect(mapNativeError('audio-capture')).toBe('AUDIO_CAPTURE')
      expect(mapNativeError('audio-error')).toBe('AUDIO_CAPTURE')
    })

    it('should map network errors correctly', () => {
      expect(mapNativeError('network')).toBe('NETWORK')
      expect(mapNativeError('network-error')).toBe('NETWORK')
    })

    it('should map aborted errors correctly', () => {
      expect(mapNativeError('aborted')).toBe('ABORTED')
      expect(mapNativeError('ABORTED')).toBe('ABORTED')
    })

    it('should map service-not-allowed correctly', () => {
      expect(mapNativeError('service-not-allowed')).toBe('SERVICE_NOT_ALLOWED')
    })

    it('should return UNKNOWN for unrecognized errors', () => {
      expect(mapNativeError('random-error')).toBe('UNKNOWN')
      expect(mapNativeError('xyz-123')).toBe('UNKNOWN')
      expect(mapNativeError('')).toBe('UNKNOWN')
    })

    it('should be case-insensitive', () => {
      expect(mapNativeError('No-Speech')).toBe('NO_SPEECH')
      expect(mapNativeError('NETWORK-ERROR')).toBe('NETWORK')
      expect(mapNativeError('PermissionDenied')).toBe('PERMISSION_DENIED')
    })
  })

  describe('Error code consistency', () => {
    const errorCodes: VoiceErrorCode[] = [
      'NOT_SUPPORTED',
      'PERMISSION_DENIED',
      'NO_SPEECH',
      'AUDIO_CAPTURE',
      'NETWORK',
      'NOT_ALLOWED',
      'SERVICE_NOT_ALLOWED',
      'ABORTED',
      'UNKNOWN',
    ]

    it('should have error messages for all error codes', () => {
      errorCodes.forEach(code => {
        const message = getVoiceErrorMessage(code)
        expect(message).toBeTruthy()
        expect(message.length).toBeGreaterThan(0)
      })
    })

    it('all error messages should be user-friendly', () => {
      errorCodes.forEach(code => {
        const message = getVoiceErrorMessage(code)
        // Should not contain technical jargon like "API", "undefined", etc.
        expect(message).not.toContain('undefined')
        expect(message).not.toContain('null')
        // Should be a complete sentence
        expect(message.endsWith('.')).toBe(true)
      })
    })
  })
})
