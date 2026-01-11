/**
 * Cognitive Mode Tests
 *
 * Verifies the mapping from tracks to cognitive modes.
 */

import { describe, it, expect } from 'vitest'
import { getCognitiveMode, getCognitiveModeDescription, type CognitiveMode } from '../cognitiveMode'
import type { Track } from '@prisma/client'

describe('getCognitiveMode', () => {
  it('maps foundation1 to intuition mode', () => {
    expect(getCognitiveMode('foundation1')).toBe('intuition')
  })

  it('maps foundation2 to modeling mode', () => {
    expect(getCognitiveMode('foundation2')).toBe('modeling')
  })

  it('maps intermediate to modeling mode', () => {
    expect(getCognitiveMode('intermediate')).toBe('modeling')
  })

  it('maps competitive to advanced mode', () => {
    expect(getCognitiveMode('competitive')).toBe('advanced')
  })

  it('returns a valid CognitiveMode for all tracks', () => {
    const tracks: Track[] = ['foundation1', 'foundation2', 'intermediate', 'competitive']
    const validModes: CognitiveMode[] = ['intuition', 'modeling', 'advanced']

    for (const track of tracks) {
      const mode = getCognitiveMode(track)
      expect(validModes).toContain(mode)
    }
  })
})

describe('getCognitiveModeDescription', () => {
  it('returns description for intuition mode', () => {
    const desc = getCognitiveModeDescription('intuition')
    expect(desc).toContain('qualitative')
    expect(desc).toContain('No equations')
  })

  it('returns description for modeling mode', () => {
    const desc = getCognitiveModeDescription('modeling')
    expect(desc).toContain('quantitative')
    expect(desc).toContain('conceptual understanding')
  })

  it('returns description for advanced mode', () => {
    const desc = getCognitiveModeDescription('advanced')
    expect(desc).toContain('mathematical')
    expect(desc).toContain('competition')
  })
})
