/**
 * Tutor Behavior Contracts
 *
 * Defines track-specific tutor behavior that downstream APIs must respect.
 * These contracts ensure consistent, level-appropriate tutoring across all
 * AI-powered interactions (Socratic tutor, hints, scaffolds, etc.).
 *
 * Contract Philosophy:
 * - F1 (Foundation 1) = Intuition-first, NO equations. Build physical sense.
 * - F2 (Foundation 2) = Model-first, equations AFTER reasoning demonstrated.
 * - Int (Intermediate) = Standard tutoring with full equation support.
 * - Comp (Competitive) = Minimal scaffolding, time pressure, challenge mode.
 */

import type { Track } from '@prisma/client'
import { getCognitiveMode, type CognitiveMode } from './cognitiveMode'

/**
 * Math level allowed in tutor responses
 */
export type AllowedMathLevel = 'none' | 'light' | 'full'

/**
 * Tutor behavior contract for a specific track
 */
export interface TutorContract {
  /** Track this contract applies to */
  track: Track

  /** Cognitive mode derived from track */
  cognitiveMode: CognitiveMode

  /**
   * Math level allowed in tutor responses
   * - none: No equations, algebra, or calculations. Qualitative only.
   * - light: Basic algebra OK, but must be explained step-by-step.
   * - full: Full mathematical treatment including calculus if needed.
   */
  allowedMathLevel: AllowedMathLevel

  /**
   * If true, tutor MUST elicit conceptual understanding BEFORE
   * introducing any equations. Even if student jumps to equations,
   * guide them back to reasoning first.
   */
  mustElicitBeforeEquations: boolean

  /**
   * If true, tutor should actively check for common misconceptions
   * related to the concept being taught.
   */
  mustAskMisconceptionCheck: boolean

  /**
   * Maximum hint level to offer before revealing answer (1-5)
   * Lower = less scaffolding, higher = more hand-holding
   */
  defaultHintCeiling: number

  /**
   * Tone/personality for the tutor
   */
  tone: string

  /**
   * Physics policy bullets - short strings for prompt injection
   * These are the core rules the tutor MUST follow for this track.
   */
  physicsPolicyBullets: string[]

  /**
   * Maximum steps to show in a solution scaffold
   */
  maxScaffoldSteps: number

  /**
   * Target time range for problems (in minutes)
   */
  targetTimeRange: { min: number; max: number }
}

/**
 * Contract definitions per track
 */
const TUTOR_CONTRACTS: Record<Track, TutorContract> = {
  foundation1: {
    track: 'foundation1',
    cognitiveMode: 'intuition',
    allowedMathLevel: 'none',
    mustElicitBeforeEquations: true,
    mustAskMisconceptionCheck: true,
    defaultHintCeiling: 5,
    tone: 'Warm, encouraging, patient. Celebrate small wins. Never use "wrong".',
    physicsPolicyBullets: [
      'NO equations or algebra - qualitative reasoning only',
      'Use diagrams and visual representations extensively',
      'Focus on cause-effect relationships ("If X increases, what happens to Y?")',
      'Compare scenarios rather than calculate ("Which has more energy?")',
      'Use limiting cases to build intuition ("What if the angle were 0?")',
      'Praise physical reasoning even if incomplete',
      'Guide student to "see" the physics before any math',
    ],
    maxScaffoldSteps: 3,
    targetTimeRange: { min: 2, max: 5 },
  },

  foundation2: {
    track: 'foundation2',
    cognitiveMode: 'modeling',
    allowedMathLevel: 'light',
    mustElicitBeforeEquations: true,
    mustAskMisconceptionCheck: true,
    defaultHintCeiling: 4,
    tone: 'Encouraging but starting to challenge. Build confidence in math.',
    physicsPolicyBullets: [
      'Equations allowed ONLY after student shows conceptual understanding',
      'Basic algebra and trigonometry OK, explain each step',
      'Introduce vector concepts gently (direction before magnitude)',
      'Connect equations to physical meaning ("What does F=ma tell us here?")',
      'Use dimensional analysis to verify reasoning',
      'If student jumps to equations, ask: "What physical principle applies first?"',
      'Multi-step problems OK but limit to 5 steps max',
    ],
    maxScaffoldSteps: 5,
    targetTimeRange: { min: 3, max: 8 },
  },

  intermediate: {
    track: 'intermediate',
    cognitiveMode: 'modeling',
    allowedMathLevel: 'full',
    mustElicitBeforeEquations: false,
    mustAskMisconceptionCheck: true,
    defaultHintCeiling: 3,
    tone: 'Professional, supportive. Treat student as capable.',
    physicsPolicyBullets: [
      'Full mathematical treatment including algebra, trig, basic calculus',
      'Expect student to set up equations independently',
      'Guide on strategy, not just execution',
      'Check for conceptual gaps when math errors occur',
      'Encourage efficiency and elegance in solutions',
      'Multi-concept integration expected',
    ],
    maxScaffoldSteps: 7,
    targetTimeRange: { min: 5, max: 12 },
  },

  competitive: {
    track: 'competitive',
    cognitiveMode: 'advanced',
    allowedMathLevel: 'full',
    mustElicitBeforeEquations: false,
    mustAskMisconceptionCheck: false,
    defaultHintCeiling: 2,
    tone: 'Challenging, direct. Respect student expertise. Minimal hand-holding.',
    physicsPolicyBullets: [
      'Competition-level rigor expected',
      'Minimal scaffolding - student should struggle productively',
      'Time pressure awareness - suggest efficient approaches',
      'Advanced techniques encouraged (symmetry, approximations, limiting cases)',
      'Point out elegant solutions and shortcuts',
      'If stuck, give strategic hints not procedural ones',
      'Challenge student to find multiple solution paths',
    ],
    maxScaffoldSteps: 10,
    targetTimeRange: { min: 8, max: 20 },
  },
}

/**
 * Get the tutor contract for a given track
 *
 * @param track - User's current track level
 * @returns Complete tutor behavior contract for that track
 *
 * @example
 * const contract = getTutorContract('foundation1')
 * // contract.allowedMathLevel === 'none'
 * // contract.mustElicitBeforeEquations === true
 */
export function getTutorContract(track: Track): TutorContract {
  return TUTOR_CONTRACTS[track]
}

/**
 * Get physics policy bullets as a formatted string for prompt injection
 *
 * @param track - User's current track level
 * @returns Formatted string ready to inject into AI prompts
 */
export function getPhysicsPolicyPrompt(track: Track): string {
  const contract = getTutorContract(track)
  const bullets = contract.physicsPolicyBullets.map(b => `- ${b}`).join('\n')

  return `## Track: ${getTrackDisplayName(track)} (${contract.cognitiveMode} mode)

### Physics Tutoring Policies
${bullets}

### Math Level: ${contract.allowedMathLevel}
${contract.allowedMathLevel === 'none' ? 'Do NOT use equations, algebra, or calculations.' : ''}
${contract.allowedMathLevel === 'light' ? 'Basic algebra OK, but explain each step and connect to physical meaning.' : ''}
${contract.allowedMathLevel === 'full' ? 'Full mathematical treatment allowed.' : ''}

### Tone
${contract.tone}
`
}

/**
 * Get display name for a track
 */
function getTrackDisplayName(track: Track): string {
  const names: Record<Track, string> = {
    foundation1: 'Foundation 1',
    foundation2: 'Foundation 2',
    intermediate: 'Intermediate',
    competitive: 'Competitive',
  }
  return names[track]
}

/**
 * Check if a tutor response violates the contract
 * (For use in response validation/filtering)
 *
 * @param track - User's track
 * @param response - AI tutor response text
 * @returns Array of violations found (empty if compliant)
 */
export function checkContractViolations(track: Track, response: string): string[] {
  const contract = getTutorContract(track)
  const violations: string[] = []

  // Check for equation usage when not allowed
  if (contract.allowedMathLevel === 'none') {
    // Simple heuristic: check for = sign with variables
    const hasEquation = /[a-zA-Z]\s*=\s*[a-zA-Z0-9]/.test(response)
    const hasMathSymbols = /[∫∑∏√±×÷]/.test(response)

    if (hasEquation || hasMathSymbols) {
      violations.push('Contains equations/math when allowedMathLevel is "none"')
    }
  }

  return violations
}
