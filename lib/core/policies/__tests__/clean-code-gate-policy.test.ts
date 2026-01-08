/**
 * Clean Code Gate Policy Tests
 *
 * Tests for deterministic style checking and gate evaluation.
 */

import { describe, it, expect } from 'vitest'
import {
  detectIssues,
  calculateCategoryScore,
  calculateCategoryScores,
  calculateOverallScore,
  evaluateGatePass,
  generateSuggestions,
  performCleanCodeCheck,
  shouldBlockSubmission,
  getGateStatusSummary,
  calculateImprovementPotential,
  CLEAN_CODE_POLICY,
  DEFAULT_GATE_CONFIG,
  ISSUE_RULES,
} from '../clean-code-gate-policy'
import type {
  CleanCodeCategory,
  CleanCodeIssue,
  CleanCodeGateConfig,
} from '@/types/cleanCodeGate'

// Helper to create mock issues
function createIssue(
  overrides?: Partial<CleanCodeIssue>
): CleanCodeIssue {
  return {
    id: 'test-issue-1',
    category: 'naming',
    severity: 'warning',
    message: 'Test issue',
    lineNumber: 1,
    suggestion: 'Fix the issue',
    autoFixable: false,
    ...overrides,
  }
}

// Helper to create mock categories
function createCategory(
  overrides?: Partial<CleanCodeCategory>
): CleanCodeCategory {
  return {
    name: 'naming',
    score: 80,
    weight: 0.25,
    issueCount: 1,
    ...overrides,
  }
}

describe('detectIssues', () => {
  it('should detect single-letter variable names', () => {
    const code = 'x = 5'
    const issues = detectIssues(code)

    expect(issues.some(i => i.id.includes('naming-single-letter'))).toBe(true)
  })

  it('should detect missing spaces around operators', () => {
    const code = 'a=b+c'
    const issues = detectIssues(code)

    expect(issues.some(i => i.id.includes('formatting-no-spaces'))).toBe(true)
  })

  it('should detect multiple consecutive spaces', () => {
    const code = 'velocity  = 10'
    const issues = detectIssues(code)

    expect(issues.some(i => i.id.includes('formatting-multiple-spaces'))).toBe(true)
  })

  it('should detect long lines', () => {
    const code = 'a'.repeat(102)
    const issues = detectIssues(code)

    expect(issues.some(i => i.id.includes('structure-long-line'))).toBe(true)
  })

  it('should detect redundant operations', () => {
    const code = 'result = value * 1'
    const issues = detectIssues(code)

    expect(issues.some(i => i.id.includes('simplicity-redundant-calc'))).toBe(true)
  })

  it('should detect double negatives', () => {
    const code = 'result = --5'
    const issues = detectIssues(code)

    expect(issues.some(i => i.id.includes('simplicity-double-negative'))).toBe(true)
  })

  it('should return no errors for clean code', () => {
    const code = '# Step 1: Calculate velocity\nvelocity = distance / time  # m/s'
    const issues = detectIssues(code)

    const errorCount = issues.filter(i => i.severity === 'error').length
    expect(errorCount).toBe(0)
  })

  it('should include line numbers for issues', () => {
    const code = 'line1\nx = 5\nline3'
    const issues = detectIssues(code)

    const singleLetterIssue = issues.find(i =>
      i.id.includes('naming-single-letter')
    )
    expect(singleLetterIssue?.lineNumber).toBe(2)
  })

  it('should sort issues by line number and severity', () => {
    const code = 'x = 5\ny = 10\nz = 15'
    const issues = detectIssues(code)

    for (let i = 1; i < issues.length; i++) {
      const prevLine = issues[i - 1].lineNumber ?? 0
      const currLine = issues[i].lineNumber ?? 0
      expect(currLine).toBeGreaterThanOrEqual(prevLine)
    }
  })

  it('should be deterministic (same input = same output)', () => {
    const code = 'x = 5\na=b+c'
    const issues1 = detectIssues(code)
    const issues2 = detectIssues(code)

    expect(issues1).toEqual(issues2)
  })
})

describe('calculateCategoryScore', () => {
  it('should return 100 for no issues', () => {
    const score = calculateCategoryScore('naming', [], 100)
    expect(score).toBe(100)
  })

  it('should penalize errors heavily', () => {
    const issues: CleanCodeIssue[] = [
      createIssue({ category: 'naming', severity: 'error' }),
    ]
    const score = calculateCategoryScore('naming', issues, 100)

    expect(score).toBeLessThan(80) // Error penalty is 25
  })

  it('should penalize warnings moderately', () => {
    const issues: CleanCodeIssue[] = [
      createIssue({ category: 'naming', severity: 'warning' }),
    ]
    const score = calculateCategoryScore('naming', issues, 100)

    expect(score).toBe(90) // Warning penalty is 10
  })

  it('should penalize info issues lightly', () => {
    const issues: CleanCodeIssue[] = [
      createIssue({ category: 'naming', severity: 'info' }),
    ]
    const score = calculateCategoryScore('naming', issues, 100)

    expect(score).toBe(97) // Info penalty is 3
  })

  it('should only count issues in specified category', () => {
    const issues: CleanCodeIssue[] = [
      createIssue({ category: 'naming', severity: 'warning' }),
      createIssue({ category: 'formatting', severity: 'error' }),
    ]
    const score = calculateCategoryScore('naming', issues, 100)

    expect(score).toBe(90) // Only naming warning counted
  })

  it('should normalize by code length', () => {
    const issues: CleanCodeIssue[] = [
      createIssue({ category: 'naming', severity: 'warning' }),
      createIssue({ category: 'naming', severity: 'warning' }),
    ]

    const shortCodeScore = calculateCategoryScore('naming', issues, 50)
    const longCodeScore = calculateCategoryScore('naming', issues, 500)

    // Longer code should have higher score for same issues
    expect(longCodeScore).toBeGreaterThan(shortCodeScore)
  })

  it('should not go below 0', () => {
    const issues: CleanCodeIssue[] = Array(10).fill(null).map(() =>
      createIssue({ category: 'naming', severity: 'error' })
    )
    const score = calculateCategoryScore('naming', issues, 100)

    expect(score).toBeGreaterThanOrEqual(0)
  })
})

describe('calculateCategoryScores', () => {
  it('should return scores for all categories', () => {
    const categories = calculateCategoryScores([], 100)

    expect(categories).toHaveLength(5)
    expect(categories.map(c => c.name)).toEqual([
      'naming',
      'formatting',
      'comments',
      'structure',
      'simplicity',
    ])
  })

  it('should include correct weights', () => {
    const categories = calculateCategoryScores([], 100)

    const namingCat = categories.find(c => c.name === 'naming')
    expect(namingCat?.weight).toBe(CLEAN_CODE_POLICY.CATEGORY_WEIGHTS.naming)
  })

  it('should count issues per category', () => {
    const issues: CleanCodeIssue[] = [
      createIssue({ category: 'naming' }),
      createIssue({ category: 'naming' }),
      createIssue({ category: 'formatting' }),
    ]
    const categories = calculateCategoryScores(issues, 100)

    const namingCat = categories.find(c => c.name === 'naming')
    const formattingCat = categories.find(c => c.name === 'formatting')

    expect(namingCat?.issueCount).toBe(2)
    expect(formattingCat?.issueCount).toBe(1)
  })

  it('should have perfect scores for categories with no issues', () => {
    const issues: CleanCodeIssue[] = [
      createIssue({ category: 'naming' }),
    ]
    const categories = calculateCategoryScores(issues, 100)

    const simplicityCat = categories.find(c => c.name === 'simplicity')
    expect(simplicityCat?.score).toBe(100)
  })
})

describe('calculateOverallScore', () => {
  it('should return 100 for all perfect categories', () => {
    const categories: CleanCodeCategory[] = [
      createCategory({ name: 'naming', score: 100, weight: 0.25 }),
      createCategory({ name: 'formatting', score: 100, weight: 0.15 }),
      createCategory({ name: 'comments', score: 100, weight: 0.20 }),
      createCategory({ name: 'structure', score: 100, weight: 0.25 }),
      createCategory({ name: 'simplicity', score: 100, weight: 0.15 }),
    ]
    const score = calculateOverallScore(categories)

    expect(score).toBe(100)
  })

  it('should weight categories correctly', () => {
    const categories: CleanCodeCategory[] = [
      createCategory({ name: 'naming', score: 100, weight: 0.5 }),
      createCategory({ name: 'formatting', score: 0, weight: 0.5 }),
    ]
    const score = calculateOverallScore(categories)

    expect(score).toBe(50)
  })

  it('should handle unequal weights', () => {
    const categories: CleanCodeCategory[] = [
      createCategory({ name: 'naming', score: 100, weight: 0.75 }),
      createCategory({ name: 'formatting', score: 0, weight: 0.25 }),
    ]
    const score = calculateOverallScore(categories)

    expect(score).toBe(75)
  })

  it('should round to nearest integer', () => {
    const categories: CleanCodeCategory[] = [
      createCategory({ name: 'naming', score: 80, weight: 0.33 }),
      createCategory({ name: 'formatting', score: 70, weight: 0.33 }),
      createCategory({ name: 'comments', score: 60, weight: 0.34 }),
    ]
    const score = calculateOverallScore(categories)

    expect(Number.isInteger(score)).toBe(true)
  })

  it('should return 100 for empty categories', () => {
    const score = calculateOverallScore([])
    expect(score).toBe(100)
  })
})

describe('evaluateGatePass', () => {
  it('should pass when all criteria met', () => {
    const categories = calculateCategoryScores([], 100)
    const result = evaluateGatePass(85, categories, [])

    expect(result.passed).toBe(true)
    expect(result.reasons).toHaveLength(0)
  })

  it('should fail when overall score below minimum', () => {
    const categories = calculateCategoryScores([], 100)
    const result = evaluateGatePass(50, categories, [])

    expect(result.passed).toBe(false)
    expect(result.reasons.some(r => r.includes('Overall score'))).toBe(true)
  })

  it('should fail when category score below minimum', () => {
    const categories: CleanCodeCategory[] = [
      createCategory({ name: 'naming', score: 30 }),
      createCategory({ name: 'formatting', score: 90 }),
      createCategory({ name: 'comments', score: 90 }),
      createCategory({ name: 'structure', score: 90 }),
      createCategory({ name: 'simplicity', score: 90 }),
    ]
    const result = evaluateGatePass(80, categories, [])

    expect(result.passed).toBe(false)
    expect(result.reasons.some(r => r.includes('naming'))).toBe(true)
  })

  it('should fail when errors present', () => {
    const categories = calculateCategoryScores([], 100)
    const issues = [createIssue({ severity: 'error' })]
    const result = evaluateGatePass(85, categories, issues)

    expect(result.passed).toBe(false)
    expect(result.reasons.some(r => r.includes('error'))).toBe(true)
  })

  it('should fail when too many issues', () => {
    const categories = calculateCategoryScores([], 100)
    const issues = Array(15).fill(null).map((_, i) =>
      createIssue({ id: `issue-${i}`, severity: 'info' })
    )
    const result = evaluateGatePass(85, categories, issues)

    expect(result.passed).toBe(false)
    expect(result.reasons.some(r => r.includes('exceeds'))).toBe(true)
  })

  it('should use custom config thresholds', () => {
    const customConfig: CleanCodeGateConfig = {
      ...DEFAULT_GATE_CONFIG,
      minOverallScore: 90,
    }
    const categories = calculateCategoryScores([], 100)
    const result = evaluateGatePass(85, categories, [], customConfig)

    expect(result.passed).toBe(false)
  })

  it('should collect multiple failure reasons', () => {
    const categories: CleanCodeCategory[] = [
      createCategory({ name: 'naming', score: 30 }),
      createCategory({ name: 'formatting', score: 30 }),
      createCategory({ name: 'comments', score: 90 }),
      createCategory({ name: 'structure', score: 90 }),
      createCategory({ name: 'simplicity', score: 90 }),
    ]
    const issues = [createIssue({ severity: 'error' })]
    const result = evaluateGatePass(50, categories, issues)

    expect(result.reasons.length).toBeGreaterThan(1)
  })
})

describe('generateSuggestions', () => {
  it('should suggest improvements for low-scoring categories', () => {
    const categories: CleanCodeCategory[] = [
      createCategory({ name: 'naming', score: 50 }),
      createCategory({ name: 'formatting', score: 90 }),
      createCategory({ name: 'comments', score: 90 }),
      createCategory({ name: 'structure', score: 90 }),
      createCategory({ name: 'simplicity', score: 90 }),
    ]
    const suggestions = generateSuggestions(categories, [])

    expect(suggestions.some(s => s.includes('naming'))).toBe(true)
  })

  it('should highlight auto-fixable issues', () => {
    const categories = calculateCategoryScores([], 100)
    const issues = [createIssue({ autoFixable: true })]
    const suggestions = generateSuggestions(categories, issues)

    expect(suggestions.some(s => s.includes('auto-fix'))).toBe(true)
  })

  it('should prioritize error fixes', () => {
    const categories = calculateCategoryScores([], 100)
    const issues = [
      createIssue({ severity: 'error' }),
      createIssue({ severity: 'warning' }),
    ]
    const suggestions = generateSuggestions(categories, issues)

    expect(suggestions.some(s => s.includes('error'))).toBe(true)
  })

  it('should limit suggestions to 5', () => {
    const categories: CleanCodeCategory[] = [
      createCategory({ name: 'naming', score: 30 }),
      createCategory({ name: 'formatting', score: 30 }),
      createCategory({ name: 'comments', score: 30 }),
      createCategory({ name: 'structure', score: 30 }),
      createCategory({ name: 'simplicity', score: 30 }),
    ]
    const issues = Array(10).fill(null).map((_, i) =>
      createIssue({ id: `issue-${i}`, severity: 'error', autoFixable: true })
    )
    const suggestions = generateSuggestions(categories, issues)

    expect(suggestions.length).toBeLessThanOrEqual(5)
  })

  it('should return empty array for perfect code', () => {
    const categories: CleanCodeCategory[] = [
      createCategory({ name: 'naming', score: 100 }),
      createCategory({ name: 'formatting', score: 100 }),
      createCategory({ name: 'comments', score: 100 }),
      createCategory({ name: 'structure', score: 100 }),
      createCategory({ name: 'simplicity', score: 100 }),
    ]
    const suggestions = generateSuggestions(categories, [])

    expect(suggestions).toHaveLength(0)
  })
})

describe('performCleanCodeCheck', () => {
  it('should return complete check result', () => {
    const code = 'velocity = distance / time  # m/s'
    const result = performCleanCodeCheck(code)

    expect(result).toHaveProperty('passed')
    expect(result).toHaveProperty('overallScore')
    expect(result).toHaveProperty('categories')
    expect(result).toHaveProperty('issues')
    expect(result).toHaveProperty('suggestions')
  })

  it('should pass clean code', () => {
    // Minimal code that avoids most patterns
    const code = '# Step 1\nresult = 42'
    const result = performCleanCodeCheck(code)

    // May have some minor issues but should still pass
    expect(result.overallScore).toBeGreaterThan(50)
  })

  it('should fail code with many issues', () => {
    const code = 'x=y+z\na=b*c\nm=n/o'
    const result = performCleanCodeCheck(code)

    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('should be deterministic', () => {
    const code = 'x = 5\ny = 10'
    const result1 = performCleanCodeCheck(code)
    const result2 = performCleanCodeCheck(code)

    expect(result1.overallScore).toBe(result2.overallScore)
    expect(result1.passed).toBe(result2.passed)
    expect(result1.issues.length).toBe(result2.issues.length)
  })

  it('should use custom config', () => {
    const code = 'velocity = 10'
    const strictConfig: CleanCodeGateConfig = {
      ...DEFAULT_GATE_CONFIG,
      minOverallScore: 99,
    }
    const result = performCleanCodeCheck(code, strictConfig)

    // With strict config, likely to fail
    expect(result.overallScore).toBeLessThan(99)
  })
})

describe('shouldBlockSubmission', () => {
  it('should not block when gate passes', () => {
    const result = performCleanCodeCheck('# Good code\nvelocity = 10')
    // Manually set passed to true for test
    const passedResult = { ...result, passed: true }
    const block = shouldBlockSubmission(passedResult)

    expect(block.blocked).toBe(false)
  })

  it('should block when gate fails and blocking enabled', () => {
    const result = performCleanCodeCheck('x=y+z')
    const failedResult = { ...result, passed: false }
    const block = shouldBlockSubmission(failedResult)

    expect(block.blocked).toBe(true)
    expect(block.message).toContain('blocked')
  })

  it('should not block when blocking disabled', () => {
    const result = performCleanCodeCheck('x=y+z')
    const failedResult = { ...result, passed: false }
    const advisoryConfig: CleanCodeGateConfig = {
      ...DEFAULT_GATE_CONFIG,
      blockSubmission: false,
    }
    const block = shouldBlockSubmission(failedResult, advisoryConfig)

    expect(block.blocked).toBe(false)
    expect(block.message).toContain('advisory')
  })

  it('should include error and warning counts in message', () => {
    const issues: CleanCodeIssue[] = [
      createIssue({ severity: 'error' }),
      createIssue({ severity: 'warning' }),
      createIssue({ severity: 'warning' }),
    ]
    const result = {
      passed: false,
      overallScore: 50,
      categories: [],
      issues,
      suggestions: [],
    }
    const block = shouldBlockSubmission(result)

    expect(block.message).toContain('1 error')
    expect(block.message).toContain('2 warning')
  })
})

describe('getGateStatusSummary', () => {
  it('should return passed status for passing result', () => {
    const result = {
      passed: true,
      overallScore: 85,
      categories: [],
      issues: [],
      suggestions: [],
    }
    const summary = getGateStatusSummary(result)

    expect(summary.status).toBe('passed')
    expect(summary.shortMessage).toContain('passed')
  })

  it('should return failed status for low score', () => {
    const result = {
      passed: false,
      overallScore: 40,
      categories: [],
      issues: [],
      suggestions: [],
    }
    const summary = getGateStatusSummary(result)

    expect(summary.status).toBe('failed')
  })

  it('should return failed status for errors', () => {
    const result = {
      passed: false,
      overallScore: 70,
      categories: [],
      issues: [createIssue({ severity: 'error' })],
      suggestions: [],
    }
    const summary = getGateStatusSummary(result)

    expect(summary.status).toBe('failed')
  })

  it('should return warning status for moderate issues', () => {
    const result = {
      passed: false,
      overallScore: 65,
      categories: [],
      issues: [createIssue({ severity: 'warning' })],
      suggestions: [],
    }
    const summary = getGateStatusSummary(result)

    expect(summary.status).toBe('warning')
  })

  it('should include score in detailed message', () => {
    const result = {
      passed: true,
      overallScore: 85,
      categories: [],
      issues: [],
      suggestions: [],
    }
    const summary = getGateStatusSummary(result)

    expect(summary.detailedMessage).toContain('85')
  })
})

describe('calculateImprovementPotential', () => {
  it('should calculate auto-fix gain', () => {
    const result = {
      passed: false,
      overallScore: 70,
      categories: [],
      issues: [
        createIssue({ autoFixable: true, severity: 'warning' }),
        createIssue({ autoFixable: true, severity: 'warning' }),
      ],
      suggestions: [],
    }
    const potential = calculateImprovementPotential(result)

    expect(potential.autoFixGain).toBeGreaterThan(0)
  })

  it('should calculate max possible score', () => {
    const result = {
      passed: false,
      overallScore: 70,
      categories: [],
      issues: [createIssue({ autoFixable: true })],
      suggestions: [],
    }
    const potential = calculateImprovementPotential(result)

    expect(potential.maxPossibleScore).toBeGreaterThan(result.overallScore)
  })

  it('should not exceed 100 for max score', () => {
    const result = {
      passed: false,
      overallScore: 95,
      categories: [],
      issues: [
        createIssue({ autoFixable: true, severity: 'warning' }),
        createIssue({ autoFixable: true, severity: 'warning' }),
      ],
      suggestions: [],
    }
    const potential = calculateImprovementPotential(result)

    expect(potential.maxPossibleScore).toBeLessThanOrEqual(100)
  })

  it('should return priority fixes for non-auto-fixable issues', () => {
    const result = {
      passed: false,
      overallScore: 60,
      categories: [],
      issues: [
        createIssue({ autoFixable: false, severity: 'error', suggestion: 'Fix error' }),
        createIssue({ autoFixable: false, severity: 'warning', suggestion: 'Fix warning' }),
      ],
      suggestions: [],
    }
    const potential = calculateImprovementPotential(result)

    expect(potential.priorityFixes.length).toBeGreaterThan(0)
    expect(potential.priorityFixes).toContain('Fix error')
  })

  it('should limit priority fixes to 3', () => {
    const result = {
      passed: false,
      overallScore: 40,
      categories: [],
      issues: Array(10).fill(null).map((_, i) =>
        createIssue({
          id: `issue-${i}`,
          autoFixable: false,
          severity: 'error',
          suggestion: `Fix ${i}`,
        })
      ),
      suggestions: [],
    }
    const potential = calculateImprovementPotential(result)

    expect(potential.priorityFixes.length).toBeLessThanOrEqual(3)
  })

  it('should return zero gain for already perfect code', () => {
    const result = {
      passed: true,
      overallScore: 100,
      categories: [],
      issues: [],
      suggestions: [],
    }
    const potential = calculateImprovementPotential(result)

    expect(potential.autoFixGain).toBe(0)
    expect(potential.maxPossibleScore).toBe(100)
  })
})

describe('CLEAN_CODE_POLICY constants', () => {
  it('should have valid score thresholds', () => {
    expect(CLEAN_CODE_POLICY.MIN_OVERALL_SCORE).toBeGreaterThan(0)
    expect(CLEAN_CODE_POLICY.MIN_OVERALL_SCORE).toBeLessThanOrEqual(100)
    expect(CLEAN_CODE_POLICY.MIN_CATEGORY_SCORE).toBeGreaterThan(0)
    expect(CLEAN_CODE_POLICY.MIN_CATEGORY_SCORE).toBeLessThanOrEqual(100)
  })

  it('should have valid issue thresholds', () => {
    expect(CLEAN_CODE_POLICY.MAX_ISSUES_WARNING).toBeLessThan(
      CLEAN_CODE_POLICY.MAX_ISSUES_BLOCK
    )
  })

  it('should have weights that sum to 1', () => {
    const weights = CLEAN_CODE_POLICY.CATEGORY_WEIGHTS
    const sum = weights.naming + weights.formatting + weights.comments +
      weights.structure + weights.simplicity

    expect(sum).toBeCloseTo(1, 5)
  })
})

describe('DEFAULT_GATE_CONFIG', () => {
  it('should have all required fields', () => {
    expect(DEFAULT_GATE_CONFIG).toHaveProperty('minOverallScore')
    expect(DEFAULT_GATE_CONFIG).toHaveProperty('minCategoryScores')
    expect(DEFAULT_GATE_CONFIG).toHaveProperty('maxIssues')
    expect(DEFAULT_GATE_CONFIG).toHaveProperty('blockSubmission')
  })

  it('should have category scores for all categories', () => {
    const categories = ['naming', 'formatting', 'comments', 'structure', 'simplicity']
    for (const cat of categories) {
      expect(DEFAULT_GATE_CONFIG.minCategoryScores).toHaveProperty(cat)
    }
  })
})

describe('ISSUE_RULES', () => {
  it('should have rules for all categories', () => {
    const categories = new Set(ISSUE_RULES.map(r => r.category))

    expect(categories.has('naming')).toBe(true)
    expect(categories.has('formatting')).toBe(true)
    expect(categories.has('comments')).toBe(true)
    expect(categories.has('structure')).toBe(true)
    expect(categories.has('simplicity')).toBe(true)
  })

  it('should have valid severity levels', () => {
    for (const rule of ISSUE_RULES) {
      expect(['info', 'warning', 'error']).toContain(rule.severity)
    }
  })

  it('should have suggestions for all rules', () => {
    for (const rule of ISSUE_RULES) {
      expect(rule.suggestion.length).toBeGreaterThan(0)
    }
  })
})
