/**
 * Misconception Detection Service
 *
 * Detects common physics misconceptions in student solutions and generates
 * Socratic clarification questions to address them.
 *
 * The service uses pattern matching and keyword detection to identify
 * misconceptions without giving away the correct answer.
 */

import type {
  DetectedMisconception,
  MisconceptionAnalysisResult,
  MisconceptionPattern,
} from '@/types/misconception'
import { PHYSICS_MISCONCEPTIONS } from '@/types/misconception'

/**
 * Generate a unique ID for a detected misconception
 */
function generateId(): string {
  return `misc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Select a random item from an array
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Calculate confidence based on how the misconception was detected
 */
function calculateConfidence(
  patternMatches: number,
  keywordMatches: number,
  pattern: MisconceptionPattern
): number {
  // Base confidence starts at 0.5
  let confidence = 0.5

  // Strong pattern match (regex) adds more confidence
  if (patternMatches > 0) {
    confidence += 0.3
    // Multiple pattern matches increase confidence further
    if (patternMatches > 1) {
      confidence += 0.1
    }
  }

  // Keyword matches add moderate confidence
  if (keywordMatches >= 2) {
    confidence += 0.2
  } else if (keywordMatches === 1) {
    confidence += 0.1
  }

  // High severity misconceptions should have higher threshold to show
  // so we don't reduce confidence, but we require higher confidence to display

  return Math.min(confidence, 0.95)
}

/**
 * Extract the evidence string from the solution that triggered the detection
 */
function extractEvidence(
  solution: string,
  pattern: MisconceptionPattern
): string {
  // Try to find the matching text
  for (const regex of pattern.patterns) {
    const match = solution.match(regex)
    if (match) {
      // Get some context around the match
      const matchIndex = solution.indexOf(match[0])
      const start = Math.max(0, matchIndex - 20)
      const end = Math.min(solution.length, matchIndex + match[0].length + 20)
      let evidence = solution.substring(start, end)

      // Clean up the evidence
      if (start > 0) evidence = '...' + evidence
      if (end < solution.length) evidence = evidence + '...'

      return evidence.trim()
    }
  }

  // If no pattern match, find keyword context
  const lowerSolution = solution.toLowerCase()
  for (const keyword of pattern.keywords) {
    const keywordIndex = lowerSolution.indexOf(keyword.toLowerCase())
    if (keywordIndex !== -1) {
      const start = Math.max(0, keywordIndex - 30)
      const end = Math.min(solution.length, keywordIndex + keyword.length + 30)
      let evidence = solution.substring(start, end)

      if (start > 0) evidence = '...' + evidence
      if (end < solution.length) evidence = evidence + '...'

      return evidence.trim()
    }
  }

  return 'Student solution contains indicators of this misconception'
}

/**
 * Check if a topic matches the problem domain
 */
function topicMatchesDomain(
  patternTopics: string[],
  domain: string,
  subdomain: string
): boolean {
  const domainLower = domain.toLowerCase()
  const subdomainLower = subdomain.toLowerCase()

  for (const topic of patternTopics) {
    const topicLower = topic.toLowerCase()
    if (
      domainLower.includes(topicLower) ||
      subdomainLower.includes(topicLower) ||
      topicLower.includes(domainLower) ||
      topicLower.includes(subdomainLower)
    ) {
      return true
    }
  }

  // Special mappings
  const topicMappings: Record<string, string[]> = {
    'mechanics': ['dynamics', 'kinematics', 'forces', 'motion', 'newton'],
    'circular motion': ['rotational', 'centripetal', 'angular'],
    'energy': ['work', 'power', 'conservation'],
    'friction': ['surfaces', 'contact'],
  }

  for (const topic of patternTopics) {
    const topicLower = topic.toLowerCase()
    const mappedTerms = topicMappings[topicLower] || []
    for (const term of mappedTerms) {
      if (domainLower.includes(term) || subdomainLower.includes(term)) {
        return true
      }
    }
  }

  return false
}

/**
 * Detect misconceptions in student solution
 */
export function detectMisconceptions(
  studentSolution: string,
  problemContext: {
    problemText: string
    domain: string
    subdomain: string
  },
  options: {
    confidenceThreshold?: number
    maxResults?: number
    filterByTopic?: boolean
  } = {}
): MisconceptionAnalysisResult {
  const {
    confidenceThreshold = 0.65,
    maxResults = 3,
    filterByTopic = true,
  } = options

  const detected: DetectedMisconception[] = []
  const solutionLower = studentSolution.toLowerCase()

  // Check each misconception pattern
  for (const pattern of PHYSICS_MISCONCEPTIONS) {
    // Skip patterns that don't match the topic (if filtering enabled)
    if (filterByTopic && !topicMatchesDomain(pattern.topics, problemContext.domain, problemContext.subdomain)) {
      continue
    }

    let patternMatches = 0
    let keywordMatches = 0

    // Check regex patterns
    for (const regex of pattern.patterns) {
      if (regex.test(studentSolution)) {
        patternMatches++
      }
    }

    // Check keywords
    for (const keyword of pattern.keywords) {
      if (solutionLower.includes(keyword.toLowerCase())) {
        keywordMatches++
      }
    }

    // Skip if no matches at all
    if (patternMatches === 0 && keywordMatches < 2) {
      continue
    }

    // Calculate confidence
    const confidence = calculateConfidence(patternMatches, keywordMatches, pattern)

    // Skip if below threshold
    if (confidence < confidenceThreshold) {
      continue
    }

    // Create detected misconception
    const misconception: DetectedMisconception = {
      id: generateId(),
      type: pattern.type,
      description: pattern.description,
      evidence: extractEvidence(studentSolution, pattern),
      confidence,
      clarificationQuestion: randomChoice(pattern.clarificationQuestions),
      correctUnderstanding: pattern.correctUnderstanding,
      relatedConcept: pattern.relatedConcepts[0] || pattern.title,
      severity: pattern.severity,
    }

    detected.push(misconception)
  }

  // Sort by confidence (highest first) and limit results
  detected.sort((a, b) => b.confidence - a.confidence)
  const topResults = detected.slice(0, maxResults)

  return {
    detected: topResults,
    analysisTimestamp: new Date().toISOString(),
    totalPatternChecked: PHYSICS_MISCONCEPTIONS.length,
  }
}

/**
 * Get the most severe misconception from a list
 */
export function getMostSevereMisconception(
  misconceptions: DetectedMisconception[]
): DetectedMisconception | null {
  if (misconceptions.length === 0) return null

  const severityOrder = { high: 3, medium: 2, low: 1 }

  return misconceptions.reduce((prev, curr) => {
    const prevScore = severityOrder[prev.severity] * prev.confidence
    const currScore = severityOrder[curr.severity] * curr.confidence
    return currScore > prevScore ? curr : prev
  })
}

/**
 * Check if misconception detection should be shown
 * (Similar to shouldShowDialogue for constraint collisions)
 */
export function shouldShowMisconception(misconception: DetectedMisconception): boolean {
  // Always show high severity with high confidence
  if (misconception.severity === 'high' && misconception.confidence >= 0.7) {
    return true
  }

  // Show medium severity with very high confidence
  if (misconception.severity === 'medium' && misconception.confidence >= 0.8) {
    return true
  }

  // Show low severity only with extremely high confidence
  if (misconception.severity === 'low' && misconception.confidence >= 0.9) {
    return true
  }

  return false
}

/**
 * Generate a gentle Socratic prompt based on the misconception
 * This is designed to guide without spoiling the correct answer
 */
export function generateSocraticPrompt(misconception: DetectedMisconception): string {
  // The clarification question is already Socratic in nature
  // We add a gentle framing
  const framings = [
    "Let's pause and think about this:",
    "Before we continue, consider:",
    "I noticed something in your reasoning. Think about this:",
    "Let me ask you a guiding question:",
  ]

  return `${randomChoice(framings)} ${misconception.clarificationQuestion}`
}

/**
 * Log a misconception detection event
 */
export function logMisconceptionEvent(
  misconception: DetectedMisconception,
  problemId: string,
  studentId?: string
): void {
  if (typeof window === 'undefined') return

  try {
    const storageKey = 'physiscaffold_misconception_events'
    const existing = localStorage.getItem(storageKey)
    const events = existing ? JSON.parse(existing) : []

    events.push({
      misconceptionId: misconception.id,
      type: misconception.type,
      problemId,
      studentId,
      timestamp: new Date().toISOString(),
      confidence: misconception.confidence,
      severity: misconception.severity,
    })

    // Keep only last 100 events
    if (events.length > 100) {
      events.shift()
    }

    localStorage.setItem(storageKey, JSON.stringify(events))
  } catch (error) {
    console.error('Failed to log misconception event:', error)
  }
}

/**
 * Get misconception analytics
 */
export function getMisconceptionAnalytics(): {
  totalDetected: number
  byType: { type: string; count: number }[]
  bySeverity: { severity: string; count: number }[]
} {
  if (typeof window === 'undefined') {
    return { totalDetected: 0, byType: [], bySeverity: [] }
  }

  try {
    const storageKey = 'physiscaffold_misconception_events'
    const existing = localStorage.getItem(storageKey)
    if (!existing) {
      return { totalDetected: 0, byType: [], bySeverity: [] }
    }

    const events = JSON.parse(existing)

    // Count by type
    const typeCounts: Record<string, number> = {}
    const severityCounts: Record<string, number> = {}

    for (const event of events) {
      typeCounts[event.type] = (typeCounts[event.type] || 0) + 1
      severityCounts[event.severity] = (severityCounts[event.severity] || 0) + 1
    }

    return {
      totalDetected: events.length,
      byType: Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      bySeverity: Object.entries(severityCounts)
        .map(([severity, count]) => ({ severity, count }))
        .sort((a, b) => b.count - a.count),
    }
  } catch (error) {
    console.error('Failed to get misconception analytics:', error)
    return { totalDetected: 0, byType: [], bySeverity: [] }
  }
}
