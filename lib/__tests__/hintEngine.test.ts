import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  HINT_STYLES,
  MATH_COACH_TIPS,
  SOCRATIC_PROMPTS,
  getHintStyle,
  formatHintForStepType,
  getContextualTip,
  getStepTypeBadge,
  getValidationFeedback,
  getMathErrorMessage,
  getPhysicsErrorMessage,
} from '../hintEngine'
import type { StepType, HintLevel } from '@/types/scaffold'

describe('hintEngine', () => {
  describe('HINT_STYLES', () => {
    it('has configuration for all step types', () => {
      expect(HINT_STYLES.physics_concept).toBeDefined()
      expect(HINT_STYLES.math_manipulation).toBeDefined()
      expect(HINT_STYLES.diagram).toBeDefined()
      expect(HINT_STYLES.sanity_check).toBeDefined()
    })

    it('physics_concept has Socratic style', () => {
      expect(HINT_STYLES.physics_concept.headerText).toBe('Think Conceptually')
      expect(HINT_STYLES.physics_concept.tipPrefix).toBe('Ask yourself:')
    })

    it('math_manipulation has coach style', () => {
      expect(HINT_STYLES.math_manipulation.headerText).toBe('Math Coach Tip')
      expect(HINT_STYLES.math_manipulation.tipPrefix).toBe('Remember:')
    })

    it('diagram has visualization style', () => {
      expect(HINT_STYLES.diagram.headerText).toBe('Visualize It')
      expect(HINT_STYLES.diagram.tipPrefix).toBe('Picture this:')
    })

    it('sanity_check has check style', () => {
      expect(HINT_STYLES.sanity_check.headerText).toBe('Check Your Work')
      expect(HINT_STYLES.sanity_check.tipPrefix).toBe('Consider:')
    })
  })

  describe('MATH_COACH_TIPS', () => {
    it('has tips for all math categories', () => {
      expect(MATH_COACH_TIPS.algebra.length).toBeGreaterThan(0)
      expect(MATH_COACH_TIPS.calculus.length).toBeGreaterThan(0)
      expect(MATH_COACH_TIPS.trigonometry.length).toBeGreaterThan(0)
      expect(MATH_COACH_TIPS.vectors.length).toBeGreaterThan(0)
    })
  })

  describe('SOCRATIC_PROMPTS', () => {
    it('has prompts for all physics domains', () => {
      expect(SOCRATIC_PROMPTS.mechanics.length).toBeGreaterThan(0)
      expect(SOCRATIC_PROMPTS.electromagnetism.length).toBeGreaterThan(0)
      expect(SOCRATIC_PROMPTS.thermodynamics.length).toBeGreaterThan(0)
      expect(SOCRATIC_PROMPTS.waves.length).toBeGreaterThan(0)
    })
  })

  describe('getHintStyle', () => {
    it('returns physics_concept style by default', () => {
      const style = getHintStyle()
      expect(style).toEqual(HINT_STYLES.physics_concept)
    })

    it('returns physics_concept style for undefined', () => {
      const style = getHintStyle(undefined)
      expect(style).toEqual(HINT_STYLES.physics_concept)
    })

    it('returns correct style for physics_concept', () => {
      const style = getHintStyle('physics_concept')
      expect(style.headerText).toBe('Think Conceptually')
    })

    it('returns correct style for math_manipulation', () => {
      const style = getHintStyle('math_manipulation')
      expect(style.headerText).toBe('Math Coach Tip')
    })

    it('returns correct style for diagram', () => {
      const style = getHintStyle('diagram')
      expect(style.headerText).toBe('Visualize It')
    })

    it('returns correct style for sanity_check', () => {
      const style = getHintStyle('sanity_check')
      expect(style.headerText).toBe('Check Your Work')
    })
  })

  describe('formatHintForStepType', () => {
    const mockHint: HintLevel = {
      level: 1,
      title: 'Test Hint',
      content: 'This is a test hint content'
    }

    it('returns formatted content with physics_concept style', () => {
      const result = formatHintForStepType(mockHint, 'physics_concept')
      expect(result.formattedContent).toBe(mockHint.content)
      expect(result.style.headerText).toBe('Think Conceptually')
    })

    it('returns formatted content with math_manipulation style', () => {
      const result = formatHintForStepType(mockHint, 'math_manipulation')
      expect(result.formattedContent).toBe(mockHint.content)
      expect(result.style.headerText).toBe('Math Coach Tip')
    })

    it('returns default style when stepType is undefined', () => {
      const result = formatHintForStepType(mockHint, undefined)
      expect(result.style).toEqual(HINT_STYLES.physics_concept)
    })
  })

  describe('getContextualTip', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('returns null when stepType is undefined', () => {
      const tip = getContextualTip(undefined, 'Mechanics')
      expect(tip).toBeNull()
    })

    it('returns a math tip for math_manipulation', () => {
      const tip = getContextualTip('math_manipulation')
      expect(tip).not.toBeNull()
      // Should be from one of the math categories
      const allMathTips = Object.values(MATH_COACH_TIPS).flat()
      expect(allMathTips).toContain(tip)
    })

    it('returns mechanics prompt for mechanics domain', () => {
      const tip = getContextualTip('physics_concept', 'Mechanics')
      expect(tip).toBe(SOCRATIC_PROMPTS.mechanics[0])
    })

    it('returns electromagnetism prompt for electromagnetic domain', () => {
      const tip = getContextualTip('physics_concept', 'Electromagnetism')
      expect(tip).toBe(SOCRATIC_PROMPTS.electromagnetism[0])
    })

    it('returns electromagnetism prompt for magnetic domain', () => {
      const tip = getContextualTip('physics_concept', 'Magnetic Fields')
      expect(tip).toBe(SOCRATIC_PROMPTS.electromagnetism[0])
    })

    it('returns thermodynamics prompt for thermo domain', () => {
      const tip = getContextualTip('physics_concept', 'Thermodynamics')
      expect(tip).toBe(SOCRATIC_PROMPTS.thermodynamics[0])
    })

    it('returns waves prompt for waves domain', () => {
      const tip = getContextualTip('physics_concept', 'Waves and Oscillations')
      expect(tip).toBe(SOCRATIC_PROMPTS.waves[0])
    })

    it('returns waves prompt for optics domain', () => {
      const tip = getContextualTip('physics_concept', 'Optics')
      expect(tip).toBe(SOCRATIC_PROMPTS.waves[0])
    })

    it('returns null for unknown physics domain', () => {
      const tip = getContextualTip('physics_concept', 'Nuclear Physics')
      expect(tip).toBeNull()
    })

    it('returns null for diagram type', () => {
      const tip = getContextualTip('diagram', 'Mechanics')
      expect(tip).toBeNull()
    })

    it('returns null for sanity_check type', () => {
      const tip = getContextualTip('sanity_check', 'Mechanics')
      expect(tip).toBeNull()
    })
  })

  describe('getStepTypeBadge', () => {
    it('returns Physics badge for physics_concept', () => {
      const badge = getStepTypeBadge('physics_concept')
      expect(badge.label).toBe('Physics')
      expect(badge.bgClass).toContain('blue')
      expect(badge.textClass).toContain('blue')
    })

    it('returns Math badge for math_manipulation', () => {
      const badge = getStepTypeBadge('math_manipulation')
      expect(badge.label).toBe('Math')
      expect(badge.bgClass).toContain('purple')
      expect(badge.textClass).toContain('purple')
    })

    it('returns Diagram badge for diagram', () => {
      const badge = getStepTypeBadge('diagram')
      expect(badge.label).toBe('Diagram')
      expect(badge.bgClass).toContain('green')
      expect(badge.textClass).toContain('green')
    })

    it('returns Check badge for sanity_check', () => {
      const badge = getStepTypeBadge('sanity_check')
      expect(badge.label).toBe('Check')
      expect(badge.bgClass).toContain('amber')
      expect(badge.textClass).toContain('amber')
    })

    it('returns default Step badge for undefined', () => {
      const badge = getStepTypeBadge(undefined)
      expect(badge.label).toBe('Step')
      expect(badge.bgClass).toContain('gray')
      expect(badge.textClass).toContain('gray')
    })
  })

  describe('getValidationFeedback', () => {
    it('returns physics feedback when physics wrong but math correct', () => {
      const feedback = getValidationFeedback(false, true)
      expect(feedback.category).toBe('physics')
      expect(feedback.label).toBe('Physics Understanding')
    })

    it('returns math feedback when physics correct but math wrong', () => {
      const feedback = getValidationFeedback(true, false)
      expect(feedback.category).toBe('math')
      expect(feedback.label).toBe('Mathematical Execution')
    })

    it('returns conceptual feedback when both wrong', () => {
      const feedback = getValidationFeedback(false, false)
      expect(feedback.category).toBe('conceptual')
      expect(feedback.label).toBe('Approach Issue')
    })

    it('returns procedural feedback when both correct', () => {
      const feedback = getValidationFeedback(true, true)
      expect(feedback.category).toBe('procedural')
      expect(feedback.label).toBe('Minor Slip')
    })

    it('uses errorTypes to determine physics error', () => {
      const feedback = getValidationFeedback(true, true, [{ type: 'concept' }])
      expect(feedback.category).toBe('physics')
    })

    it('uses errorTypes to determine math error for sign', () => {
      const feedback = getValidationFeedback(true, true, [{ type: 'sign' }])
      expect(feedback.category).toBe('math')
    })

    it('uses errorTypes to determine math error for algebra', () => {
      const feedback = getValidationFeedback(true, true, [{ type: 'algebra' }])
      expect(feedback.category).toBe('math')
    })

    it('uses errorTypes to determine math error for units', () => {
      const feedback = getValidationFeedback(true, true, [{ type: 'units' }])
      expect(feedback.category).toBe('math')
    })

    it('uses errorTypes to determine physics error for approach', () => {
      const feedback = getValidationFeedback(true, true, [{ type: 'approach' }])
      expect(feedback.category).toBe('physics')
    })

    it('falls back to correctness flags when errorTypes is empty', () => {
      const feedback = getValidationFeedback(false, true, [])
      expect(feedback.category).toBe('physics')
    })

    it('feedback includes all required properties', () => {
      const feedback = getValidationFeedback(false, true)
      expect(feedback).toHaveProperty('category')
      expect(feedback).toHaveProperty('label')
      expect(feedback).toHaveProperty('shortTip')
      expect(feedback).toHaveProperty('encouragement')
      expect(feedback).toHaveProperty('icon')
      expect(feedback).toHaveProperty('bgClass')
      expect(feedback).toHaveProperty('textClass')
      expect(feedback).toHaveProperty('borderClass')
    })
  })

  describe('getMathErrorMessage', () => {
    it('returns sign error message', () => {
      const message = getMathErrorMessage('sign')
      expect(message).toContain('sign')
    })

    it('returns algebra error message', () => {
      const message = getMathErrorMessage('algebra')
      expect(message).toContain('algebraic')
    })

    it('returns units error message', () => {
      const message = getMathErrorMessage('units')
      expect(message).toContain('unit')
    })

    it('returns default message for unknown error type', () => {
      const message = getMathErrorMessage('unknown')
      expect(message).toContain('calculations')
    })
  })

  describe('getPhysicsErrorMessage', () => {
    it('returns concept error message', () => {
      const message = getPhysicsErrorMessage('concept')
      expect(message).toContain('physics principle')
    })

    it('returns approach error message', () => {
      const message = getPhysicsErrorMessage('approach')
      expect(message).toContain('method')
    })

    it('returns default message for unknown error type', () => {
      const message = getPhysicsErrorMessage('unknown')
      expect(message).toContain('physical situation')
    })
  })
})
