import { describe, it, expect } from 'vitest'
import {
  countLines,
  countWords,
  validateExplanation,
  EXPLAIN_TO_FRIEND_RULES,
} from '../explainToFriend'

describe('Explain to a Friend - Validation Functions', () => {
  describe('countLines', () => {
    it('should count non-empty lines', () => {
      expect(countLines('Line 1\nLine 2\nLine 3')).toBe(3)
    })

    it('should ignore empty lines', () => {
      expect(countLines('Line 1\n\nLine 2\n\nLine 3')).toBe(3)
    })

    it('should handle single line', () => {
      expect(countLines('Single line')).toBe(1)
    })

    it('should handle empty string', () => {
      expect(countLines('')).toBe(0)
    })

    it('should handle whitespace-only lines', () => {
      expect(countLines('Line 1\n   \nLine 2')).toBe(2)
    })
  })

  describe('countWords', () => {
    it('should count words in a sentence', () => {
      expect(countWords('This is a test')).toBe(4)
    })

    it('should handle multiple spaces', () => {
      expect(countWords('This  has   extra    spaces')).toBe(4)
    })

    it('should handle empty string', () => {
      expect(countWords('')).toBe(0)
    })

    it('should handle single word', () => {
      expect(countWords('Hello')).toBe(1)
    })

    it('should count across multiple lines', () => {
      expect(countWords('Line one has words\nLine two also words')).toBe(8)
    })
  })

  describe('validateExplanation', () => {
    it('should accept valid 3-line explanation', () => {
      const explanation = `The problem uses Newton's second law with friction forces included.
We decompose forces into parallel and perpendicular components to the incline.
This method works because it accounts for all forces acting on the object.`

      const result = validateExplanation(explanation)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject explanation with too few lines', () => {
      const explanation = `This is line one.
This is line two.`

      const result = validateExplanation(explanation)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(`Please write at least ${EXPLAIN_TO_FRIEND_RULES.MIN_LINES} lines`)
    })

    it('should reject explanation with too many lines', () => {
      const explanation = `Line 1
Line 2
Line 3
Line 4`

      const result = validateExplanation(explanation)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain(`Please keep it to ${EXPLAIN_TO_FRIEND_RULES.MAX_LINES} lines`)
    })

    it('should reject explanation that is too brief', () => {
      const explanation = `One
Two
Three`

      const result = validateExplanation(explanation)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Your explanation is too brief. Add more detail.')
    })

    it('should reject explanation with too many words', () => {
      const words = Array(110).fill('word').join(' ')
      const explanation = `${words}
Second line here
Third line here`

      const result = validateExplanation(explanation)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Keep it concise - explain in simpler terms')
    })

    it('should reject explanation with lines that are too short', () => {
      const explanation = `This line has enough words to pass validation.
Short.
This line also has enough words.`

      const result = validateExplanation(explanation)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Each line should have at least 5 words')
    })

    it('should handle multiline newlines correctly', () => {
      const explanation = `First line has enough words here.

Second line also has enough words here.
Third line has enough words as well.`

      const result = validateExplanation(explanation)
      expect(result.valid).toBe(true)
    })

    it('should accumulate multiple errors', () => {
      const explanation = `One
Two`

      const result = validateExplanation(explanation)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })
  })
})
