/**
 * Clean Code Gate Types (PhaseB_01)
 *
 * Style rubric gate before submission. Code must pass automated
 * style checks and receive minimum readability score.
 */

/**
 * Clean code check result
 */
export interface CleanCodeCheckResult {
  readonly passed: boolean
  readonly overallScore: number // 0-100
  readonly categories: readonly CleanCodeCategory[]
  readonly issues: readonly CleanCodeIssue[]
  readonly suggestions: readonly string[]
}

/**
 * Clean code category score
 */
export interface CleanCodeCategory {
  readonly name: CleanCodeCategoryName
  readonly score: number
  readonly weight: number
  readonly issueCount: number
}

export type CleanCodeCategoryName =
  | 'naming' // Variable/function naming
  | 'formatting' // Indentation, spacing
  | 'comments' // Appropriate comments
  | 'structure' // Code organization
  | 'simplicity' // Avoiding unnecessary complexity

/**
 * A specific clean code issue
 */
export interface CleanCodeIssue {
  readonly id: string
  readonly category: CleanCodeCategoryName
  readonly severity: 'info' | 'warning' | 'error'
  readonly message: string
  readonly lineNumber?: number
  readonly suggestion: string
  readonly autoFixable: boolean
}

/**
 * Clean code gate configuration
 */
export interface CleanCodeGateConfig {
  readonly minOverallScore: number // Default: 70
  readonly minCategoryScores: Record<CleanCodeCategoryName, number>
  readonly maxIssues: number // Max issues before fail
  readonly blockSubmission: boolean // Block if not passed
}

// Policy constants
export const CLEAN_CODE_POLICY = {
  MIN_OVERALL_SCORE: 70,
  MIN_CATEGORY_SCORE: 50,
  MAX_ISSUES_WARNING: 5,
  MAX_ISSUES_BLOCK: 10,
  CATEGORY_WEIGHTS: {
    naming: 0.25,
    formatting: 0.15,
    comments: 0.20,
    structure: 0.25,
    simplicity: 0.15,
  },
} as const

// Event types
export type CleanCodeEventType =
  | 'clean_code_check_started'
  | 'clean_code_check_passed'
  | 'clean_code_check_failed'
  | 'clean_code_issue_fixed'
  | 'clean_code_gate_bypassed'
