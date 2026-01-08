/**
 * Clean Code Gate Policy
 *
 * Deterministic style rubric gate before submission.
 * Code must pass automated style checks and receive minimum readability score.
 */

import type {
  CleanCodeCheckResult,
  CleanCodeCategory,
  CleanCodeCategoryName,
  CleanCodeIssue,
  CleanCodeGateConfig,
} from '@/types/cleanCodeGate'
import { CLEAN_CODE_POLICY } from '@/types/cleanCodeGate'

// Re-export policy constants
export { CLEAN_CODE_POLICY }

/**
 * Issue detection rules - deterministic pattern matching
 * Note: Patterns are designed to be simple and efficient to avoid backtracking
 */
export const ISSUE_RULES: readonly IssueRule[] = [
  // Naming issues
  {
    id: 'naming-single-letter',
    category: 'naming',
    severity: 'warning',
    pattern: /\b[a-z]\s*=/g,
    message: 'Single-letter variable names reduce readability',
    suggestion: 'Use descriptive names like "velocity" instead of "v"',
    autoFixable: false,
  },
  {
    id: 'naming-unclear-abbrev',
    category: 'naming',
    severity: 'info',
    pattern: /\b(calc|tmp|val|num|res)\b/gi,
    message: 'Unclear abbreviation used',
    suggestion: 'Spell out abbreviations for clarity',
    autoFixable: false,
  },

  // Formatting issues
  {
    id: 'formatting-no-spaces',
    category: 'formatting',
    severity: 'warning',
    pattern: /[a-zA-Z0-9][+\-*/=][a-zA-Z0-9]/g,
    message: 'Missing spaces around operators',
    suggestion: 'Add spaces around operators for readability: a + b',
    autoFixable: true,
  },
  {
    id: 'formatting-multiple-spaces',
    category: 'formatting',
    severity: 'info',
    pattern: /  +/g,
    message: 'Multiple consecutive spaces',
    suggestion: 'Use single spaces between elements',
    autoFixable: true,
  },

  // Comment issues
  {
    id: 'comments-missing-units',
    category: 'comments',
    severity: 'warning',
    pattern: /= \d+\s*$/gm,
    message: 'Assignment without units comment',
    suggestion: 'Add units in comments: velocity = 10 # m/s',
    autoFixable: false,
  },

  // Structure issues
  {
    id: 'structure-long-line',
    category: 'structure',
    severity: 'warning',
    pattern: /^.{101,}$/gm,
    message: 'Line exceeds 100 characters',
    suggestion: 'Break long lines for readability',
    autoFixable: false,
  },
  {
    id: 'structure-nested-parens',
    category: 'structure',
    severity: 'info',
    pattern: /\(\(\(/g,
    message: 'Deeply nested parentheses',
    suggestion: 'Consider intermediate variables to reduce nesting',
    autoFixable: false,
  },

  // Simplicity issues
  {
    id: 'simplicity-redundant-calc',
    category: 'simplicity',
    severity: 'info',
    pattern: /[*\/] 1\b/g,
    message: 'Redundant multiplication/division by 1',
    suggestion: 'Remove unnecessary operations',
    autoFixable: true,
  },
  {
    id: 'simplicity-zero-add',
    category: 'simplicity',
    severity: 'info',
    pattern: /[+-] 0\b/g,
    message: 'Adding/subtracting zero',
    suggestion: 'Remove unnecessary zero operations',
    autoFixable: true,
  },
  {
    id: 'simplicity-double-negative',
    category: 'simplicity',
    severity: 'warning',
    pattern: /--/g,
    message: 'Double negative detected',
    suggestion: 'Simplify to positive value',
    autoFixable: true,
  },
]

interface IssueRule {
  readonly id: string
  readonly category: CleanCodeCategoryName
  readonly severity: 'info' | 'warning' | 'error'
  readonly pattern: RegExp
  readonly message: string
  readonly suggestion: string
  readonly autoFixable: boolean
}

/**
 * Default gate configuration
 */
export const DEFAULT_GATE_CONFIG: CleanCodeGateConfig = {
  minOverallScore: CLEAN_CODE_POLICY.MIN_OVERALL_SCORE,
  minCategoryScores: {
    naming: CLEAN_CODE_POLICY.MIN_CATEGORY_SCORE,
    formatting: CLEAN_CODE_POLICY.MIN_CATEGORY_SCORE,
    comments: CLEAN_CODE_POLICY.MIN_CATEGORY_SCORE,
    structure: CLEAN_CODE_POLICY.MIN_CATEGORY_SCORE,
    simplicity: CLEAN_CODE_POLICY.MIN_CATEGORY_SCORE,
  },
  maxIssues: CLEAN_CODE_POLICY.MAX_ISSUES_BLOCK,
  blockSubmission: true,
}

/**
 * Detect issues in code - DETERMINISTIC
 */
export function detectIssues(
  code: string,
  rules: readonly IssueRule[] = ISSUE_RULES
): CleanCodeIssue[] {
  const issues: CleanCodeIssue[] = []
  const lines = code.split('\n')

  for (const rule of rules) {
    // Reset regex lastIndex for global patterns
    rule.pattern.lastIndex = 0

    let match: RegExpExecArray | null
    while ((match = rule.pattern.exec(code)) !== null) {
      // Calculate line number
      const textBeforeMatch = code.substring(0, match.index)
      const lineNumber = textBeforeMatch.split('\n').length

      issues.push({
        id: `${rule.id}-${match.index}`,
        category: rule.category,
        severity: rule.severity,
        message: rule.message,
        lineNumber,
        suggestion: rule.suggestion,
        autoFixable: rule.autoFixable,
      })

      // Prevent infinite loops for zero-width matches
      if (match[0].length === 0) {
        rule.pattern.lastIndex++
      }
    }
  }

  // Sort by line number, then severity
  return issues.sort((a, b) => {
    const severityOrder = { error: 0, warning: 1, info: 2 }
    if ((a.lineNumber ?? 0) !== (b.lineNumber ?? 0)) {
      return (a.lineNumber ?? 0) - (b.lineNumber ?? 0)
    }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })
}

/**
 * Calculate category score based on issues - DETERMINISTIC
 */
export function calculateCategoryScore(
  category: CleanCodeCategoryName,
  issues: readonly CleanCodeIssue[],
  codeLength: number
): number {
  const categoryIssues = issues.filter(i => i.category === category)

  if (categoryIssues.length === 0) {
    return 100 // Perfect score if no issues
  }

  // Penalty per issue based on severity
  const penalties = {
    error: 25,
    warning: 10,
    info: 3,
  }

  let totalPenalty = 0
  for (const issue of categoryIssues) {
    totalPenalty += penalties[issue.severity]
  }

  // Normalize by code length (longer code can have more issues)
  const normalizedLines = Math.max(1, Math.ceil(codeLength / 100))
  const adjustedPenalty = totalPenalty / Math.sqrt(normalizedLines)

  return Math.max(0, Math.round(100 - adjustedPenalty))
}

/**
 * Calculate all category scores - DETERMINISTIC
 */
export function calculateCategoryScores(
  issues: readonly CleanCodeIssue[],
  codeLength: number
): CleanCodeCategory[] {
  const categories: CleanCodeCategoryName[] = [
    'naming',
    'formatting',
    'comments',
    'structure',
    'simplicity',
  ]

  return categories.map(name => ({
    name,
    score: calculateCategoryScore(name, issues, codeLength),
    weight: CLEAN_CODE_POLICY.CATEGORY_WEIGHTS[name],
    issueCount: issues.filter(i => i.category === name).length,
  }))
}

/**
 * Calculate overall weighted score - DETERMINISTIC
 */
export function calculateOverallScore(categories: readonly CleanCodeCategory[]): number {
  let weightedSum = 0
  let totalWeight = 0

  for (const cat of categories) {
    weightedSum += cat.score * cat.weight
    totalWeight += cat.weight
  }

  if (totalWeight === 0) return 100
  return Math.round(weightedSum / totalWeight)
}

/**
 * Determine if code passes the gate - DETERMINISTIC
 */
export function evaluateGatePass(
  overallScore: number,
  categories: readonly CleanCodeCategory[],
  issues: readonly CleanCodeIssue[],
  config: CleanCodeGateConfig = DEFAULT_GATE_CONFIG
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = []

  // Check overall score
  if (overallScore < config.minOverallScore) {
    reasons.push(
      `Overall score ${overallScore} below minimum ${config.minOverallScore}`
    )
  }

  // Check category scores
  for (const cat of categories) {
    const minScore = config.minCategoryScores[cat.name]
    if (cat.score < minScore) {
      reasons.push(
        `${cat.name} score ${cat.score} below minimum ${minScore}`
      )
    }
  }

  // Check total issue count
  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length

  if (errorCount > 0) {
    reasons.push(`${errorCount} error(s) must be fixed`)
  }

  if (issues.length > config.maxIssues) {
    reasons.push(
      `Total issues ${issues.length} exceeds maximum ${config.maxIssues}`
    )
  }

  return {
    passed: reasons.length === 0,
    reasons,
  }
}

/**
 * Generate improvement suggestions - DETERMINISTIC
 */
export function generateSuggestions(
  categories: readonly CleanCodeCategory[],
  issues: readonly CleanCodeIssue[]
): string[] {
  const suggestions: string[] = []

  // Find worst categories
  const sortedCategories = [...categories].sort((a, b) => a.score - b.score)
  const worstCategories = sortedCategories.slice(0, 2)

  for (const cat of worstCategories) {
    if (cat.score < 70) {
      suggestions.push(
        `Focus on improving ${cat.name}: ${getCategoryTip(cat.name)}`
      )
    }
  }

  // Highlight auto-fixable issues
  const autoFixable = issues.filter(i => i.autoFixable)
  if (autoFixable.length > 0) {
    suggestions.push(
      `${autoFixable.length} issue(s) can be auto-fixed`
    )
  }

  // Add specific high-impact suggestions
  const errorIssues = issues.filter(i => i.severity === 'error')
  if (errorIssues.length > 0) {
    suggestions.push(
      `Fix ${errorIssues.length} error(s) first - they block submission`
    )
  }

  return suggestions.slice(0, 5) // Limit suggestions
}

/**
 * Get improvement tip for category
 */
function getCategoryTip(category: CleanCodeCategoryName): string {
  const tips: Record<CleanCodeCategoryName, string> = {
    naming: 'Use descriptive variable names with proper units',
    formatting: 'Add spaces around operators and maintain consistent indentation',
    comments: 'Explain your reasoning and include units in comments',
    structure: 'Break solution into clear, numbered steps',
    simplicity: 'Remove redundant operations and simplify expressions',
  }
  return tips[category]
}

/**
 * Perform full clean code check - DETERMINISTIC
 */
export function performCleanCodeCheck(
  code: string,
  config: CleanCodeGateConfig = DEFAULT_GATE_CONFIG
): CleanCodeCheckResult {
  // Detect all issues
  const issues = detectIssues(code)

  // Calculate scores
  const categories = calculateCategoryScores(issues, code.length)
  const overallScore = calculateOverallScore(categories)

  // Evaluate pass/fail
  const { passed } = evaluateGatePass(overallScore, categories, issues, config)

  // Generate suggestions
  const suggestions = generateSuggestions(categories, issues)

  return {
    passed,
    overallScore,
    categories,
    issues,
    suggestions,
  }
}

/**
 * Check if submission should be blocked - DETERMINISTIC
 */
export function shouldBlockSubmission(
  result: CleanCodeCheckResult,
  config: CleanCodeGateConfig = DEFAULT_GATE_CONFIG
): { blocked: boolean; message: string } {
  if (!config.blockSubmission) {
    return {
      blocked: false,
      message: 'Clean code gate is in advisory mode',
    }
  }

  if (result.passed) {
    return {
      blocked: false,
      message: 'Code passes clean code standards',
    }
  }

  const errorCount = result.issues.filter(i => i.severity === 'error').length
  const warningCount = result.issues.filter(i => i.severity === 'warning').length

  return {
    blocked: true,
    message: `Submission blocked: ${errorCount} error(s), ${warningCount} warning(s). Score: ${result.overallScore}/${config.minOverallScore}`,
  }
}

/**
 * Get gate status summary - DETERMINISTIC
 */
export function getGateStatusSummary(result: CleanCodeCheckResult): {
  status: 'passed' | 'warning' | 'failed'
  shortMessage: string
  detailedMessage: string
} {
  if (result.passed) {
    return {
      status: 'passed',
      shortMessage: 'Clean code check passed',
      detailedMessage: `Score: ${result.overallScore}/100. Great job maintaining clean code standards!`,
    }
  }

  const hasErrors = result.issues.some(i => i.severity === 'error')
  const issueCount = result.issues.length

  if (hasErrors || result.overallScore < 50) {
    return {
      status: 'failed',
      shortMessage: 'Clean code check failed',
      detailedMessage: `Score: ${result.overallScore}/100. ${issueCount} issue(s) found. Fix errors before submitting.`,
    }
  }

  return {
    status: 'warning',
    shortMessage: 'Clean code check needs attention',
    detailedMessage: `Score: ${result.overallScore}/100. ${issueCount} issue(s) found. Consider improving before submitting.`,
  }
}

/**
 * Calculate improvement potential - DETERMINISTIC
 */
export function calculateImprovementPotential(
  result: CleanCodeCheckResult
): {
  maxPossibleScore: number
  autoFixGain: number
  priorityFixes: string[]
} {
  // Calculate score if all auto-fixable issues were fixed
  const autoFixableIssues = result.issues.filter(i => i.autoFixable)
  const remainingIssues = result.issues.filter(i => !i.autoFixable)

  // Estimate score without auto-fixable issues
  const penalties = { error: 25, warning: 10, info: 3 }
  let autoFixPenalty = 0
  for (const issue of autoFixableIssues) {
    autoFixPenalty += penalties[issue.severity]
  }

  const autoFixGain = Math.min(autoFixPenalty, 100 - result.overallScore)
  const maxPossibleScore = Math.min(100, result.overallScore + autoFixGain)

  // Get priority fixes (highest impact)
  const priorityFixes = remainingIssues
    .filter(i => i.severity === 'error' || i.severity === 'warning')
    .slice(0, 3)
    .map(i => i.suggestion)

  return {
    maxPossibleScore,
    autoFixGain,
    priorityFixes,
  }
}
