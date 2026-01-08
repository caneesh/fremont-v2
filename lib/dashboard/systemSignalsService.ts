/**
 * System Signals Service
 *
 * Retrieves and formats feature flag information for dashboard display.
 * Shows only user-relevant flags (not internal/debug).
 */

import type {
  SystemSignalsData,
  DisplayableFeatureFlag,
  LearningModeSummary,
} from '@/types/systemSignals'
import { FEATURE_FLAGS } from '@/lib/featureFlags'

/**
 * Feature flag metadata for display
 */
const FLAG_METADATA: Record<string, {
  displayName: string
  description: string
  category: DisplayableFeatureFlag['category']
  examBenefit?: string
}> = {
  PATTERN_FIRST_MODE: {
    displayName: 'Pattern-First',
    description: 'Identify physics patterns before solving',
    category: 'learning_mode',
    examBenefit: 'Builds fast pattern recognition crucial for timed exams',
  },
  SOCRATIC_TUTOR_CHAT: {
    displayName: 'Socratic Tutor',
    description: 'AI professor guides your understanding',
    category: 'learning_mode',
    examBenefit: 'Develops deep conceptual understanding through dialogue',
  },
  SOCRATIC_FIRST_MODE: {
    displayName: 'Socratic-First',
    description: 'Thinking prompts before hints',
    category: 'learning_mode',
    examBenefit: 'Trains independent problem-solving approach',
  },
  SKIP_COMMIT_GATE: {
    displayName: 'Skip-or-Commit',
    description: 'Practice exam-time triage decisions',
    category: 'learning_mode',
    examBenefit: 'Builds strategic time management for exams',
  },
  STUDY_PLAN_V2: {
    displayName: 'Pattern Curriculum',
    description: 'Learning organized by problem-solving patterns',
    category: 'learning_mode',
    examBenefit: 'Systematic coverage of all problem types',
  },
  CONFIDENCE_WEIGHTED_SRS: {
    displayName: 'Confidence SRS',
    description: 'Review scheduling based on your confidence',
    category: 'feedback',
    examBenefit: 'Targets weak spots, accelerates strong areas',
  },
  MISTAKE_NOTEBOOK: {
    displayName: 'Mistake Tracking',
    description: 'Spaced repetition for your errors',
    category: 'feedback',
    examBenefit: 'Ensures past mistakes become strengths',
  },
  ERROR_ANTICIPATOR: {
    displayName: 'Error Warnings',
    description: 'Proactive alerts for common traps',
    category: 'feedback',
    examBenefit: 'Prevents repeating common exam mistakes',
  },
  BOUNDARY_CASE_BUILDER: {
    displayName: 'Boundary Cases',
    description: 'Test equations with limiting values',
    category: 'practice',
    examBenefit: 'Builds physical intuition for answer verification',
  },
  CONCEPT_CONTRAST: {
    displayName: 'Concept Contrast',
    description: 'Explain why similar concepts don\'t apply',
    category: 'practice',
    examBenefit: 'Prevents conceptual confusion under pressure',
  },
  WARMUP_PROTOCOL: {
    displayName: 'Warm-Up Drills',
    description: 'Quick review before main practice',
    category: 'practice',
    examBenefit: 'Activates knowledge before tackling new problems',
  },
  ADAPTIVE_PREFLIGHT: {
    displayName: 'Adaptive Checks',
    description: 'Extra verification on risky steps',
    category: 'advanced',
    examBenefit: 'Catches mistakes before they compound',
  },
  COGNITIVE_LOAD_GOVERNOR: {
    displayName: 'Load Management',
    description: 'Simplifies UI when you\'re struggling',
    category: 'advanced',
    examBenefit: 'Prevents overwhelm during difficult problems',
  },
}

/**
 * Flags to display (in order)
 */
const DISPLAY_FLAGS = [
  'PATTERN_FIRST_MODE',
  'SOCRATIC_FIRST_MODE',
  'SKIP_COMMIT_GATE',
  'STUDY_PLAN_V2',
  'CONFIDENCE_WEIGHTED_SRS',
  'MISTAKE_NOTEBOOK',
  'WARMUP_PROTOCOL',
  'CONCEPT_CONTRAST',
]

/**
 * Get displayable feature flags
 */
function getDisplayableFlags(): DisplayableFeatureFlag[] {
  const flags: DisplayableFeatureFlag[] = []

  for (const key of DISPLAY_FLAGS) {
    const metadata = FLAG_METADATA[key]
    if (!metadata) continue

    const isEnabled = FEATURE_FLAGS[key as keyof typeof FEATURE_FLAGS] ?? false

    flags.push({
      key,
      displayName: metadata.displayName,
      description: metadata.description,
      isEnabled,
      category: metadata.category,
      examBenefit: metadata.examBenefit,
    })
  }

  return flags
}

/**
 * Get learning mode summary
 */
function getLearningModes(): LearningModeSummary {
  return {
    patternFirst: FEATURE_FLAGS.PATTERN_FIRST_MODE ?? false,
    socraticTutor: FEATURE_FLAGS.SOCRATIC_TUTOR_CHAT ?? false,
    skipOrCommit: FEATURE_FLAGS.SKIP_COMMIT_GATE ?? false,
    confidenceSRS: FEATURE_FLAGS.CONFIDENCE_WEIGHTED_SRS ?? false,
    studyPlanV2: FEATURE_FLAGS.STUDY_PLAN_V2 ?? false,
  }
}

/**
 * Compute system signals data
 */
export function computeSystemSignals(): SystemSignalsData {
  const flags = getDisplayableFlags()
  const learningModes = getLearningModes()

  const enabledCount = flags.filter(f => f.isEnabled).length

  return {
    flags,
    learningModes,
    enabledCount,
    totalCount: flags.length,
    computedAt: new Date().toISOString(),
  }
}

/**
 * Get a quick summary of active modes for compact display
 */
export function getActiveModesSummary(): Array<{
  name: string
  isEnabled: boolean
}> {
  return [
    { name: 'Pattern-First', isEnabled: FEATURE_FLAGS.PATTERN_FIRST_MODE ?? false },
    { name: 'Socratic', isEnabled: FEATURE_FLAGS.SOCRATIC_FIRST_MODE ?? false },
    { name: 'Skip-Gate', isEnabled: FEATURE_FLAGS.SKIP_COMMIT_GATE ?? false },
  ]
}
