import { describe, it, expect, beforeEach, vi } from 'vitest'
import { spotMistakeService } from '../spotMistakeService'
import type { MistakeAnalysis, MistakeType } from '@/types/spotTheMistake'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('SpotMistakeService', () => {
  const testStudentId = 'test-student-123'

  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('recordAnalysis', () => {
    it('should record a correct analysis', () => {
      const analysis: MistakeAnalysis = {
        studentId: testStudentId,
        solutionId: 'sol-1',
        identifiedStepIndex: 2,
        explanation: 'Wrong sign convention',
        timestamp: new Date().toISOString(),
        isCorrect: true,
        feedback: 'Excellent!'
      }

      spotMistakeService.recordAnalysis(analysis)

      const history = spotMistakeService.getAnalysisHistory(testStudentId)
      expect(history).toHaveLength(1)
      expect(history[0].isCorrect).toBe(true)
    })

    it('should record an incorrect analysis', () => {
      const analysis: MistakeAnalysis = {
        studentId: testStudentId,
        solutionId: 'sol-1',
        identifiedStepIndex: 1,
        explanation: 'I think step 1 is wrong',
        timestamp: new Date().toISOString(),
        isCorrect: false,
      }

      spotMistakeService.recordAnalysis(analysis)

      const history = spotMistakeService.getAnalysisHistory(testStudentId)
      expect(history).toHaveLength(1)
      expect(history[0].isCorrect).toBe(false)
    })

    it('should limit history to 100 entries', () => {
      // Add 150 analyses
      for (let i = 0; i < 150; i++) {
        const analysis: MistakeAnalysis = {
          studentId: testStudentId,
          solutionId: `sol-${i}`,
          identifiedStepIndex: i % 5,
          explanation: `Analysis ${i}`,
          timestamp: new Date().toISOString(),
          isCorrect: i % 2 === 0,
        }
        spotMistakeService.recordAnalysis(analysis)
      }

      const history = spotMistakeService.getAnalysisHistory(testStudentId)
      expect(history.length).toBeLessThanOrEqual(100)
    })
  })

  describe('getStatistics', () => {
    it('should return empty statistics for new student', () => {
      const stats = spotMistakeService.getStatistics(testStudentId)

      expect(stats.totalAttempts).toBe(0)
      expect(stats.correctIdentifications).toBe(0)
      expect(stats.averageTimeToIdentify).toBe(0)
      expect(stats.commonMisses).toHaveLength(0)
    })

    it('should update statistics after analyses', () => {
      const analyses: MistakeAnalysis[] = [
        {
          studentId: testStudentId,
          solutionId: 'sol-1',
          identifiedStepIndex: 2,
          explanation: 'Test',
          timestamp: new Date().toISOString(),
          isCorrect: true,
        },
        {
          studentId: testStudentId,
          solutionId: 'sol-2',
          identifiedStepIndex: 1,
          explanation: 'Test',
          timestamp: new Date().toISOString(),
          isCorrect: false,
        },
        {
          studentId: testStudentId,
          solutionId: 'sol-3',
          identifiedStepIndex: 3,
          explanation: 'Test',
          timestamp: new Date().toISOString(),
          isCorrect: true,
        },
      ]

      analyses.forEach(a => spotMistakeService.recordAnalysis(a))

      const stats = spotMistakeService.getStatistics(testStudentId)
      expect(stats.totalAttempts).toBe(3)
      expect(stats.correctIdentifications).toBe(2)
    })
  })

  describe('updateMistakeTypeStats', () => {
    it('should track correctly identified mistake types', () => {
      spotMistakeService.updateMistakeTypeStats(
        testStudentId,
        'sign_convention',
        true
      )

      const stats = spotMistakeService.getStatistics(testStudentId)
      expect(stats.mistakesByType.sign_convention.encountered).toBe(1)
      expect(stats.mistakesByType.sign_convention.identified).toBe(1)
      expect(stats.mistakesByType.sign_convention.successRate).toBe(1.0)
    })

    it('should track missed mistake types', () => {
      spotMistakeService.updateMistakeTypeStats(
        testStudentId,
        'conservation_violation',
        false
      )

      const stats = spotMistakeService.getStatistics(testStudentId)
      expect(stats.mistakesByType.conservation_violation.encountered).toBe(1)
      expect(stats.mistakesByType.conservation_violation.identified).toBe(0)
      expect(stats.mistakesByType.conservation_violation.successRate).toBe(0)
      expect(stats.commonMisses).toContain('conservation_violation')
    })

    it('should calculate success rate correctly', () => {
      // 3 attempts, 2 successful
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'reference_frame', true)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'reference_frame', false)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'reference_frame', true)

      const successRate = spotMistakeService.getMistakeTypeSuccessRate(
        testStudentId,
        'reference_frame'
      )
      expect(successRate).toBeCloseTo(2/3, 2)
    })

    it('should remove from common misses when success rate improves', () => {
      // First, fail twice to add to common misses
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'force_identification', false)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'force_identification', false)

      let stats = spotMistakeService.getStatistics(testStudentId)
      expect(stats.commonMisses).toContain('force_identification')

      // Now succeed enough times to improve success rate above 0.7
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'force_identification', true)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'force_identification', true)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'force_identification', true)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'force_identification', true)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'force_identification', true)

      stats = spotMistakeService.getStatistics(testStudentId)
      expect(stats.commonMisses).not.toContain('force_identification')
    })
  })

  describe('getOverallSuccessRate', () => {
    it('should return 0 for no attempts', () => {
      const rate = spotMistakeService.getOverallSuccessRate(testStudentId)
      expect(rate).toBe(0)
    })

    it('should calculate correct success rate', () => {
      const analyses = [
        { isCorrect: true },
        { isCorrect: false },
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: false },
      ]

      analyses.forEach((a, i) => {
        spotMistakeService.recordAnalysis({
          studentId: testStudentId,
          solutionId: `sol-${i}`,
          identifiedStepIndex: i,
          explanation: 'Test',
          timestamp: new Date().toISOString(),
          isCorrect: a.isCorrect,
        })
      })

      const rate = spotMistakeService.getOverallSuccessRate(testStudentId)
      expect(rate).toBe(0.6) // 3 out of 5
    })
  })

  describe('getWeakAreas', () => {
    it('should identify weak areas (success rate < 0.5)', () => {
      // Sign convention: 1/3 = 0.33 (weak)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'sign_convention', false)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'sign_convention', false)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'sign_convention', true)

      // Reference frame: 2/2 = 1.0 (strong)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'reference_frame', true)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'reference_frame', true)

      const weakAreas = spotMistakeService.getWeakAreas(testStudentId)
      expect(weakAreas).toContain('sign_convention')
      expect(weakAreas).not.toContain('reference_frame')
    })

    it('should return empty array when no weak areas', () => {
      // All types have good success rate or no data
      const weakAreas = spotMistakeService.getWeakAreas(testStudentId)
      expect(weakAreas).toHaveLength(0)
    })
  })

  describe('getStrongAreas', () => {
    it('should identify strong areas (success rate >= 0.8)', () => {
      // Conservation: 4/5 = 0.8 (strong)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'conservation_violation', true)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'conservation_violation', true)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'conservation_violation', true)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'conservation_violation', true)
      spotMistakeService.updateMistakeTypeStats(testStudentId, 'conservation_violation', false)

      const strongAreas = spotMistakeService.getStrongAreas(testStudentId)
      expect(strongAreas).toContain('conservation_violation')
    })
  })

  describe('cleanup', () => {
    it('should remove old analyses', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 60) // 60 days ago

      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 10) // 10 days ago

      spotMistakeService.recordAnalysis({
        studentId: testStudentId,
        solutionId: 'old',
        identifiedStepIndex: 0,
        explanation: 'Old analysis',
        timestamp: oldDate.toISOString(),
        isCorrect: true,
      })

      spotMistakeService.recordAnalysis({
        studentId: testStudentId,
        solutionId: 'recent',
        identifiedStepIndex: 0,
        explanation: 'Recent analysis',
        timestamp: recentDate.toISOString(),
        isCorrect: true,
      })

      spotMistakeService.cleanup(testStudentId, 30)

      const history = spotMistakeService.getAnalysisHistory(testStudentId)
      expect(history).toHaveLength(1)
      expect(history[0].solutionId).toBe('recent')
    })
  })

  // REGRESSION TESTS
  describe('Regression Tests', () => {
    it('should handle rapid consecutive analyses', () => {
      const startTime = Date.now()

      // Simulate 50 rapid analyses
      for (let i = 0; i < 50; i++) {
        spotMistakeService.recordAnalysis({
          studentId: testStudentId,
          solutionId: `rapid-${i}`,
          identifiedStepIndex: i % 5,
          explanation: `Rapid ${i}`,
          timestamp: new Date(startTime + i * 100).toISOString(),
          isCorrect: i % 3 === 0,
        })
      }

      const stats = spotMistakeService.getStatistics(testStudentId)
      expect(stats.totalAttempts).toBe(50)
      expect(stats.correctIdentifications).toBe(17) // floor(50/3) + 1
    })

    it('should handle all mistake types correctly', () => {
      const allTypes: MistakeType[] = [
        'sign_convention',
        'reference_frame',
        'conservation_violation',
        'force_identification',
        'concept_confusion',
        'coordinate_system',
        'initial_conditions',
        'vector_scalar_confusion',
      ]

      allTypes.forEach(type => {
        spotMistakeService.updateMistakeTypeStats(testStudentId, type, true)
      })

      const stats = spotMistakeService.getStatistics(testStudentId)
      allTypes.forEach(type => {
        expect(stats.mistakesByType[type].encountered).toBe(1)
        expect(stats.mistakesByType[type].successRate).toBe(1.0)
      })
    })

    it('should persist data across service instances', () => {
      spotMistakeService.recordAnalysis({
        studentId: testStudentId,
        solutionId: 'persist-test',
        identifiedStepIndex: 2,
        explanation: 'Test persistence',
        timestamp: new Date().toISOString(),
        isCorrect: true,
      })

      // Simulate getting data in a new instance
      const history = spotMistakeService.getAnalysisHistory(testStudentId)
      expect(history).toHaveLength(1)
      expect(history[0].solutionId).toBe('persist-test')
    })

    it('should handle edge case: exactly 100 analyses', () => {
      for (let i = 0; i < 100; i++) {
        spotMistakeService.recordAnalysis({
          studentId: testStudentId,
          solutionId: `edge-${i}`,
          identifiedStepIndex: i % 5,
          explanation: `Edge ${i}`,
          timestamp: new Date().toISOString(),
          isCorrect: i % 2 === 0,
        })
      }

      const history = spotMistakeService.getAnalysisHistory(testStudentId)
      expect(history).toHaveLength(100)

      const stats = spotMistakeService.getOverallSuccessRate(testStudentId)
      expect(stats).toBe(0.5)
    })

    it('should handle missing or corrupted localStorage data', () => {
      // Corrupt the data
      localStorage.setItem(
        'physiscaffold_spot_mistake_analysis_history_test-corrupt',
        'invalid json{'
      )

      const history = spotMistakeService.getAnalysisHistory('test-corrupt')
      expect(history).toEqual([])
    })
  })
})
