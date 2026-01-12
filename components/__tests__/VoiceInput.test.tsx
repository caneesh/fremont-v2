import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import VoiceInput from '../VoiceInput'

vi.mock('@/hooks/useVoiceInput', () => ({
  useVoiceInput: () => ({
    isSupported: false,
    state: 'idle',
    transcript: '',
    interimTranscript: '',
    error: null,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    resetTranscript: vi.fn(),
  }),
}))

describe('VoiceInput', () => {
  it('renders a fallback message when voice input is not supported', () => {
    render(<VoiceInput onTranscriptChange={() => {}} />)

    expect(screen.getByText('Voice Input Not Supported')).toBeInTheDocument()
  })
})

