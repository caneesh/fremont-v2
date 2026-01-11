/**
 * Tutor Contracts Tests
 *
 * Verifies that tutor behavior contracts are correctly defined for each track.
 *
 * Key invariants:
 * - F1 = intuition-first, NO equations (allowedMathLevel='none')
 * - F2 = model-first, equations AFTER reasoning (mustElicitBeforeEquations=true)
 * - Competitive = full rigor (allowedMathLevel='full')
 */

import { describe, it, expect } from 'vitest'
import {
  getTutorContract,
  getPhysicsPolicyPrompt,
  checkContractViolations,
  type TutorContract,
  type AllowedMathLevel,
} from '../tutorContracts'
import type { Track } from '@prisma/client'

describe('getTutorContract', () => {
  describe('Foundation 1 (intuition mode)', () => {
    const contract = getTutorContract('foundation1')

    it('must have allowedMathLevel = "none"', () => {
      expect(contract.allowedMathLevel).toBe('none')
    })

    it('must require eliciting before equations', () => {
      expect(contract.mustElicitBeforeEquations).toBe(true)
    })

    it('must check for misconceptions', () => {
      expect(contract.mustAskMisconceptionCheck).toBe(true)
    })

    it('has cognitiveMode = intuition', () => {
      expect(contract.cognitiveMode).toBe('intuition')
    })

    it('has maximum scaffolding (hint ceiling = 5)', () => {
      expect(contract.defaultHintCeiling).toBe(5)
    })

    it('has physics policy bullets forbidding equations', () => {
      const hasNoEquationsPolicy = contract.physicsPolicyBullets.some(
        b => b.toLowerCase().includes('no equation')
      )
      expect(hasNoEquationsPolicy).toBe(true)
    })

    it('has short target time (2-5 min)', () => {
      expect(contract.targetTimeRange.min).toBeLessThanOrEqual(3)
      expect(contract.targetTimeRange.max).toBeLessThanOrEqual(6)
    })

    it('has max 3 scaffold steps', () => {
      expect(contract.maxScaffoldSteps).toBeLessThanOrEqual(3)
    })
  })

  describe('Foundation 2 (modeling mode)', () => {
    const contract = getTutorContract('foundation2')

    it('must have allowedMathLevel = "light" (equations after reasoning)', () => {
      expect(contract.allowedMathLevel).toBe('light')
    })

    it('must require eliciting before equations', () => {
      expect(contract.mustElicitBeforeEquations).toBe(true)
    })

    it('must check for misconceptions', () => {
      expect(contract.mustAskMisconceptionCheck).toBe(true)
    })

    it('has cognitiveMode = modeling', () => {
      expect(contract.cognitiveMode).toBe('modeling')
    })

    it('has physics policy requiring conceptual understanding first', () => {
      const hasConceptFirstPolicy = contract.physicsPolicyBullets.some(
        b => b.toLowerCase().includes('after') && b.toLowerCase().includes('understanding')
      )
      expect(hasConceptFirstPolicy).toBe(true)
    })
  })

  describe('Intermediate (modeling mode)', () => {
    const contract = getTutorContract('intermediate')

    it('has allowedMathLevel = "full"', () => {
      expect(contract.allowedMathLevel).toBe('full')
    })

    it('does NOT require eliciting before equations', () => {
      expect(contract.mustElicitBeforeEquations).toBe(false)
    })

    it('still checks for misconceptions', () => {
      expect(contract.mustAskMisconceptionCheck).toBe(true)
    })

    it('has cognitiveMode = modeling', () => {
      expect(contract.cognitiveMode).toBe('modeling')
    })
  })

  describe('Competitive (advanced mode)', () => {
    const contract = getTutorContract('competitive')

    it('must have allowedMathLevel = "full"', () => {
      expect(contract.allowedMathLevel).toBe('full')
    })

    it('does NOT require eliciting before equations', () => {
      expect(contract.mustElicitBeforeEquations).toBe(false)
    })

    it('does NOT require misconception checks (student should know)', () => {
      expect(contract.mustAskMisconceptionCheck).toBe(false)
    })

    it('has cognitiveMode = advanced', () => {
      expect(contract.cognitiveMode).toBe('advanced')
    })

    it('has minimal scaffolding (hint ceiling <= 2)', () => {
      expect(contract.defaultHintCeiling).toBeLessThanOrEqual(2)
    })

    it('has longer target time for challenging problems', () => {
      expect(contract.targetTimeRange.max).toBeGreaterThanOrEqual(15)
    })
  })

  describe('contract structure', () => {
    const tracks: Track[] = ['foundation1', 'foundation2', 'intermediate', 'competitive']

    it('all tracks have valid contracts', () => {
      for (const track of tracks) {
        const contract = getTutorContract(track)
        expect(contract).toBeDefined()
        expect(contract.track).toBe(track)
      }
    })

    it('all contracts have required fields', () => {
      for (const track of tracks) {
        const contract = getTutorContract(track)

        expect(contract.allowedMathLevel).toBeDefined()
        expect(['none', 'light', 'full']).toContain(contract.allowedMathLevel)

        expect(typeof contract.mustElicitBeforeEquations).toBe('boolean')
        expect(typeof contract.mustAskMisconceptionCheck).toBe('boolean')

        expect(contract.defaultHintCeiling).toBeGreaterThanOrEqual(1)
        expect(contract.defaultHintCeiling).toBeLessThanOrEqual(5)

        expect(contract.tone).toBeTruthy()
        expect(contract.physicsPolicyBullets.length).toBeGreaterThan(0)

        expect(contract.maxScaffoldSteps).toBeGreaterThan(0)
        expect(contract.targetTimeRange.min).toBeLessThan(contract.targetTimeRange.max)
      }
    })

    it('hint ceiling decreases as track advances', () => {
      const f1 = getTutorContract('foundation1').defaultHintCeiling
      const f2 = getTutorContract('foundation2').defaultHintCeiling
      const int = getTutorContract('intermediate').defaultHintCeiling
      const comp = getTutorContract('competitive').defaultHintCeiling

      expect(f1).toBeGreaterThanOrEqual(f2)
      expect(f2).toBeGreaterThanOrEqual(int)
      expect(int).toBeGreaterThanOrEqual(comp)
    })

    it('max scaffold steps increases as track advances', () => {
      const f1 = getTutorContract('foundation1').maxScaffoldSteps
      const f2 = getTutorContract('foundation2').maxScaffoldSteps
      const int = getTutorContract('intermediate').maxScaffoldSteps
      const comp = getTutorContract('competitive').maxScaffoldSteps

      expect(f1).toBeLessThanOrEqual(f2)
      expect(f2).toBeLessThanOrEqual(int)
      expect(int).toBeLessThanOrEqual(comp)
    })
  })
})

describe('getPhysicsPolicyPrompt', () => {
  it('returns formatted prompt for foundation1', () => {
    const prompt = getPhysicsPolicyPrompt('foundation1')

    expect(prompt).toContain('Foundation 1')
    expect(prompt).toContain('intuition')
    expect(prompt).toContain('none')
    expect(prompt).toContain('Do NOT use equations')
  })

  it('returns formatted prompt for foundation2', () => {
    const prompt = getPhysicsPolicyPrompt('foundation2')

    expect(prompt).toContain('Foundation 2')
    expect(prompt).toContain('modeling')
    expect(prompt).toContain('light')
  })

  it('returns formatted prompt for competitive', () => {
    const prompt = getPhysicsPolicyPrompt('competitive')

    expect(prompt).toContain('Competitive')
    expect(prompt).toContain('advanced')
    expect(prompt).toContain('full')
  })

  it('includes physics policy bullets', () => {
    const prompt = getPhysicsPolicyPrompt('foundation1')
    const contract = getTutorContract('foundation1')

    for (const bullet of contract.physicsPolicyBullets) {
      expect(prompt).toContain(bullet)
    }
  })

  it('includes tone guidance', () => {
    const prompt = getPhysicsPolicyPrompt('foundation1')
    const contract = getTutorContract('foundation1')

    expect(prompt).toContain(contract.tone)
  })
})

describe('checkContractViolations', () => {
  describe('foundation1 (no math allowed)', () => {
    it('detects equation usage', () => {
      const violations = checkContractViolations(
        'foundation1',
        'Using the equation F = ma, we can solve for acceleration.'
      )
      expect(violations.length).toBeGreaterThan(0)
      expect(violations[0]).toContain('equation')
    })

    it('allows qualitative explanations', () => {
      const violations = checkContractViolations(
        'foundation1',
        'When you push harder, the object speeds up more quickly. Think about what happens when you try to push a heavy box versus a light one.'
      )
      expect(violations).toHaveLength(0)
    })

    it('detects variable assignments', () => {
      const violations = checkContractViolations(
        'foundation1',
        'Let v = 10 m/s and calculate the kinetic energy.'
      )
      expect(violations.length).toBeGreaterThan(0)
    })
  })

  describe('competitive (full math allowed)', () => {
    it('allows equation usage', () => {
      const violations = checkContractViolations(
        'competitive',
        'Using F = ma and v² = u² + 2as, we can derive the final velocity.'
      )
      expect(violations).toHaveLength(0)
    })

    it('allows complex math', () => {
      const violations = checkContractViolations(
        'competitive',
        'Taking the integral ∫F·dr gives us the work done.'
      )
      expect(violations).toHaveLength(0)
    })
  })
})
