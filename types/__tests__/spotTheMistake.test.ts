import { describe, it, expect } from 'vitest'
import type {
  StudentSolution,
  SolutionStep,
  MistakeType,
  MistakeAnalysis,
  MistakeStatistics,
} from '../spotTheMistake'

describe('SpotTheMistake Types', () => {
  describe('StudentSolution', () => {
    it('should have correct structure', () => {
      const solution: StudentSolution = {
        id: 'test-123',
        problemId: 'prob-456',
        title: 'Student Solution',
        steps: [],
        conclusion: 'Final answer',
        mistakeLocation: {
          stepIndex: 2,
          mistakeType: 'sign_convention',
          correctApproach: 'Should use positive sign'
        },
        createdAt: new Date().toISOString(),
      }

      expect(solution.id).toBe('test-123')
      expect(solution.mistakeLocation.stepIndex).toBe(2)
      expect(solution.mistakeLocation.mistakeType).toBe('sign_convention')
    })

    it('should validate mistake types', () => {
      const validTypes: MistakeType[] = [
        'sign_convention',
        'reference_frame',
        'conservation_violation',
        'force_identification',
        'concept_confusion',
        'coordinate_system',
        'initial_conditions',
        'vector_scalar_confusion',
      ]

      validTypes.forEach(type => {
        const solution: StudentSolution = {
          id: 'test',
          problemId: 'prob',
          title: 'Test',
          steps: [],
          conclusion: 'Done',
          mistakeLocation: {
            stepIndex: 0,
            mistakeType: type,
            correctApproach: 'Test'
          },
          createdAt: new Date().toISOString(),
        }

        expect(solution.mistakeLocation.mistakeType).toBe(type)
      })
    })
  })

  describe('SolutionStep', () => {
    it('should have all required fields', () => {
      const step: SolutionStep = {
        stepNumber: 1,
        title: 'Setup equations',
        content: 'We need to apply Newton&apos;s laws',
        equations: ['$F = ma$', '$$\\sum F = 0$$'],
        reasoning: 'Because the system is in equilibrium'
      }

      expect(step.stepNumber).toBe(1)
      expect(step.title).toBe('Setup equations')
      expect(step.equations).toHaveLength(2)
      expect(step.reasoning).toBeTruthy()
    })

    it('should allow optional equations', () => {
      const step: SolutionStep = {
        stepNumber: 1,
        title: 'Identify forces',
        content: 'Draw free body diagram',
        reasoning: 'Visual representation helps'
      }

      expect(step.equations).toBeUndefined()
      expect(step.reasoning).toBeTruthy()
    })
  })

  describe('MistakeAnalysis', () => {
    it('should track student analysis', () => {
      const analysis: MistakeAnalysis = {
        studentId: 'student-123',
        solutionId: 'sol-456',
        identifiedStepIndex: 2,
        explanation: 'Step 2 has wrong sign for centripetal force',
        timestamp: new Date().toISOString(),
        isCorrect: true,
        feedback: 'Great analysis!'
      }

      expect(analysis.isCorrect).toBe(true)
      expect(analysis.identifiedStepIndex).toBe(2)
      expect(analysis.feedback).toBeTruthy()
    })

    it('should allow null step index for "no mistake" claim', () => {
      const analysis: MistakeAnalysis = {
        studentId: 'student-123',
        solutionId: 'sol-456',
        identifiedStepIndex: null,
        explanation: 'I think the solution is correct',
        timestamp: new Date().toISOString(),
        isCorrect: false,
      }

      expect(analysis.identifiedStepIndex).toBeNull()
      expect(analysis.isCorrect).toBe(false)
    })
  })

  describe('MistakeStatistics', () => {
    it('should calculate success rates correctly', () => {
      const stats: MistakeStatistics = {
        studentId: 'student-123',
        totalAttempts: 10,
        correctIdentifications: 7,
        mistakesByType: {
          sign_convention: {
            encountered: 3,
            identified: 2,
            successRate: 2/3
          },
          reference_frame: {
            encountered: 2,
            identified: 2,
            successRate: 1.0
          },
          conservation_violation: {
            encountered: 5,
            identified: 3,
            successRate: 0.6
          },
          force_identification: {
            encountered: 0,
            identified: 0,
            successRate: 0
          },
          concept_confusion: {
            encountered: 0,
            identified: 0,
            successRate: 0
          },
          coordinate_system: {
            encountered: 0,
            identified: 0,
            successRate: 0
          },
          initial_conditions: {
            encountered: 0,
            identified: 0,
            successRate: 0
          },
          vector_scalar_confusion: {
            encountered: 0,
            identified: 0,
            successRate: 0
          },
        },
        averageTimeToIdentify: 180000, // 3 minutes
        commonMisses: ['sign_convention', 'conservation_violation']
      }

      expect(stats.correctIdentifications / stats.totalAttempts).toBe(0.7)
      expect(stats.mistakesByType.reference_frame.successRate).toBe(1.0)
      expect(stats.commonMisses).toContain('sign_convention')
    })

    it('should track all mistake types', () => {
      const stats: MistakeStatistics = {
        studentId: 'test',
        totalAttempts: 0,
        correctIdentifications: 0,
        mistakesByType: {
          sign_convention: { encountered: 0, identified: 0, successRate: 0 },
          reference_frame: { encountered: 0, identified: 0, successRate: 0 },
          conservation_violation: { encountered: 0, identified: 0, successRate: 0 },
          force_identification: { encountered: 0, identified: 0, successRate: 0 },
          concept_confusion: { encountered: 0, identified: 0, successRate: 0 },
          coordinate_system: { encountered: 0, identified: 0, successRate: 0 },
          initial_conditions: { encountered: 0, identified: 0, successRate: 0 },
          vector_scalar_confusion: { encountered: 0, identified: 0, successRate: 0 },
        },
        averageTimeToIdentify: 0,
        commonMisses: []
      }

      const types = Object.keys(stats.mistakesByType)
      expect(types).toHaveLength(8)
      expect(types).toContain('sign_convention')
      expect(types).toContain('vector_scalar_confusion')
    })
  })

  describe('Request/Response Types', () => {
    it('should validate generation request', () => {
      const request = {
        problemText: 'A block slides down an incline...',
        domain: 'Classical Mechanics',
        subdomain: 'Dynamics',
        correctSolution: 'Optional complete solution'
      }

      expect(request.problemText).toBeTruthy()
      expect(request.domain).toBe('Classical Mechanics')
    })

    it('should validate analysis request', () => {
      const request = {
        studentId: 'student-123',
        solutionId: 'sol-456',
        identifiedStepIndex: 2,
        explanation: 'The force direction is wrong'
      }

      expect(request.identifiedStepIndex).toBe(2)
      expect(request.explanation).toBeTruthy()
    })

    it('should validate analysis response', () => {
      const response = {
        isCorrect: true,
        feedback: 'Well done!',
        actualMistakeLocation: {
          stepIndex: 2,
          mistakeType: 'sign_convention' as MistakeType
        },
        correctApproach: 'Use positive direction for upward forces',
        encouragement: 'Keep up the good work!'
      }

      expect(response.isCorrect).toBe(true)
      expect(response.actualMistakeLocation.stepIndex).toBe(2)
      expect(response.encouragement).toBeTruthy()
    })
  })
})
