import { describe, it, expect } from 'vitest'
import {
  getTrackFallbackChain,
  getTrackDisplayName,
  selectWithTrackFallback,
  questionMatchesTrack,
  type Question,
  type QuestionTrack,
} from '../studyPath'

describe('Track Fallback Functions', () => {
  describe('getTrackFallbackChain', () => {
    it('should return foundation1 -> foundation2 -> intermediate for foundation1', () => {
      const chain = getTrackFallbackChain('foundation1')
      expect(chain).toEqual(['foundation1', 'foundation2', 'intermediate'])
    })

    it('should return foundation2 -> intermediate -> foundation1 for foundation2', () => {
      const chain = getTrackFallbackChain('foundation2')
      expect(chain).toEqual(['foundation2', 'intermediate', 'foundation1'])
    })

    it('should return intermediate -> foundation2 -> competitive for intermediate', () => {
      const chain = getTrackFallbackChain('intermediate')
      expect(chain).toEqual(['intermediate', 'foundation2', 'competitive'])
    })

    it('should return competitive -> intermediate -> foundation2 for competitive', () => {
      const chain = getTrackFallbackChain('competitive')
      expect(chain).toEqual(['competitive', 'intermediate', 'foundation2'])
    })
  })

  describe('getTrackDisplayName', () => {
    it('should return correct display names', () => {
      expect(getTrackDisplayName('foundation1')).toBe('Foundation 1')
      expect(getTrackDisplayName('foundation2')).toBe('Foundation 2')
      expect(getTrackDisplayName('intermediate')).toBe('Intermediate')
      expect(getTrackDisplayName('competitive')).toBe('Competitive')
    })
  })

  describe('selectWithTrackFallback', () => {
    const createQuestion = (id: string, track?: QuestionTrack, difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium'): Question => ({
      id,
      title: `Question ${id}`,
      statement: 'Test statement',
      topic: 'mechanics',
      subtopic: 'kinematics',
      difficulty,
      track,
      concepts: ['test'],
      expectedTime: 10,
    })

    it('should return items matching the requested track', () => {
      const items = [
        createQuestion('1', 'foundation1'),
        createQuestion('2', 'foundation2'),
        createQuestion('3', 'intermediate'),
      ]

      const result = selectWithTrackFallback(items, 'foundation1', questionMatchesTrack)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('1')
      expect(result.requestedTrack).toBe('foundation1')
      expect(result.actualTrack).toBe('foundation1')
      expect(result.usedFallback).toBe(false)
      expect(result.fallbackMessage).toBeUndefined()
    })

    it('should fallback to next track when requested track is empty', () => {
      const items = [
        createQuestion('1', 'foundation2'),
        createQuestion('2', 'intermediate'),
      ]

      const result = selectWithTrackFallback(items, 'foundation1', questionMatchesTrack)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('1')
      expect(result.requestedTrack).toBe('foundation1')
      expect(result.actualTrack).toBe('foundation2')
      expect(result.usedFallback).toBe(true)
      expect(result.fallbackMessage).toContain('Foundation 1')
      expect(result.fallbackMessage).toContain('Foundation 2')
    })

    it('should skip to second fallback when first fallback is also empty', () => {
      const items = [
        createQuestion('1', 'intermediate'),
      ]

      const result = selectWithTrackFallback(items, 'foundation1', questionMatchesTrack)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('1')
      expect(result.actualTrack).toBe('intermediate')
      expect(result.usedFallback).toBe(true)
    })

    it('should return empty array with message when all fallbacks are empty', () => {
      const items = [
        createQuestion('1', 'competitive'),
      ]

      const result = selectWithTrackFallback(items, 'foundation1', questionMatchesTrack)

      expect(result.items).toHaveLength(0)
      expect(result.usedFallback).toBe(false)
      expect(result.fallbackMessage).toContain('No questions available')
    })

    it('should work with difficulty-derived tracks', () => {
      // Questions without explicit track - derived from difficulty
      const items = [
        createQuestion('1', undefined, 'Easy'), // matches foundation1, foundation2
        createQuestion('2', undefined, 'Medium'), // matches foundation2, intermediate
        createQuestion('3', undefined, 'Hard'), // matches intermediate, competitive
      ]

      const f1Result = selectWithTrackFallback(items, 'foundation1', questionMatchesTrack)
      expect(f1Result.items).toHaveLength(1)
      expect(f1Result.items[0].id).toBe('1')
      expect(f1Result.usedFallback).toBe(false)

      const compResult = selectWithTrackFallback(items, 'competitive', questionMatchesTrack)
      expect(compResult.items).toHaveLength(1)
      expect(compResult.items[0].id).toBe('3')
      expect(compResult.usedFallback).toBe(false)
    })

    it('should return all matching items from fallback track', () => {
      const items = [
        createQuestion('1', 'foundation2'),
        createQuestion('2', 'foundation2'),
        createQuestion('3', 'foundation2'),
      ]

      const result = selectWithTrackFallback(items, 'foundation1', questionMatchesTrack)

      expect(result.items).toHaveLength(3)
      expect(result.actualTrack).toBe('foundation2')
      expect(result.usedFallback).toBe(true)
    })

    it('should handle empty items array', () => {
      const result = selectWithTrackFallback([], 'foundation1', questionMatchesTrack)

      expect(result.items).toHaveLength(0)
      expect(result.usedFallback).toBe(false)
      expect(result.fallbackMessage).toContain('No questions available')
    })
  })
})
