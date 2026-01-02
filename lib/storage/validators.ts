/**
 * Lightweight Validators for Storage Data
 *
 * JSON schema-like validation without external dependencies.
 * Returns typed validation results.
 */

import type {
  StoredEvent,
  EventType,
  UserPreferences,
  ProblemAttempt,
  ProblemProgress,
  StepProgress,
  ScaffoldData,
  Step,
  HintLevel,
  Concept,
  SanityCheck
} from './types'

// ============================================
// Validation Result Type
// ============================================

export interface ValidationResult<T> {
  valid: boolean
  data?: T
  errors: string[]
}

// ============================================
// Helper Functions
// ============================================

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function isISODateString(value: unknown): boolean {
  if (!isString(value)) return false
  const date = new Date(value)
  return !isNaN(date.getTime()) && value.includes('T')
}

// ============================================
// Event Validators
// ============================================

const VALID_EVENT_TYPES: EventType[] = [
  'problem_started',
  'problem_saved_draft',
  'problem_marked_solved',
  'problem_deleted',
  'step_activated',
  'step_completed',
  'step_failed',
  'hint_unlocked',
  'hint_viewed',
  'task_attempted',
  'task_correct',
  'task_incorrect',
  'reading_mode_activated',
  'sanity_check_completed',
  'reflection_started',
  'reflection_completed',
  'preference_changed',
  'error_occurred',
  // Pattern-First Mode
  'pattern_first_shown',
  'pattern_selected',
  'pattern_first_timeout',
  'pattern_first_unlock',
  'pattern_correctness'
]

export function validateEvent(data: unknown): ValidationResult<StoredEvent> {
  const errors: string[] = []

  if (!isObject(data)) {
    return { valid: false, errors: ['Event must be an object'] }
  }

  if (!isString(data.id)) {
    errors.push('Event id must be a string')
  }

  if (!isString(data.type) || !VALID_EVENT_TYPES.includes(data.type as EventType)) {
    errors.push(`Event type must be one of: ${VALID_EVENT_TYPES.join(', ')}`)
  }

  if (!isISODateString(data.timestamp)) {
    errors.push('Event timestamp must be an ISO date string')
  }

  if (!isString(data.sessionId)) {
    errors.push('Event sessionId must be a string')
  }

  if (data.userId !== undefined && !isString(data.userId)) {
    errors.push('Event userId must be a string if provided')
  }

  if (!isObject(data.metadata)) {
    errors.push('Event metadata must be an object')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: data as unknown as StoredEvent, errors: [] }
}

// ============================================
// Problem Attempt Validators
// ============================================

export function validateProblemAttempt(data: unknown): ValidationResult<ProblemAttempt> {
  const errors: string[] = []

  if (!isObject(data)) {
    return { valid: false, errors: ['ProblemAttempt must be an object'] }
  }

  if (!isString(data.id)) errors.push('id must be a string')
  if (!isString(data.problemId)) errors.push('problemId must be a string')
  if (!isString(data.problemTitle)) errors.push('problemTitle must be a string')
  if (!isString(data.status) || !['IN_PROGRESS', 'SOLVED'].includes(data.status)) {
    errors.push('status must be "IN_PROGRESS" or "SOLVED"')
  }
  if (!isBoolean(data.reviewFlag)) errors.push('reviewFlag must be a boolean')
  if (!isISODateString(data.createdAt)) errors.push('createdAt must be an ISO date string')
  if (!isISODateString(data.updatedAt)) errors.push('updatedAt must be an ISO date string')

  // Optional fields
  if (data.userId !== undefined && !isString(data.userId)) {
    errors.push('userId must be a string if provided')
  }
  if (data.draftSolution !== undefined && !isString(data.draftSolution)) {
    errors.push('draftSolution must be a string if provided')
  }
  if (data.finalSolution !== undefined && !isString(data.finalSolution)) {
    errors.push('finalSolution must be a string if provided')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: data as unknown as ProblemAttempt, errors: [] }
}

// ============================================
// Problem Progress Validators
// ============================================

export function validateStepProgress(data: unknown): ValidationResult<StepProgress> {
  const errors: string[] = []

  if (!isObject(data)) {
    return { valid: false, errors: ['StepProgress must be an object'] }
  }

  if (!isNumber(data.stepId)) errors.push('stepId must be a number')
  if (!isBoolean(data.isCompleted)) errors.push('isCompleted must be a boolean')

  if (data.userAnswer !== undefined && !isString(data.userAnswer)) {
    errors.push('userAnswer must be a string if provided')
  }
  if (data.currentHintLevel !== undefined && !isNumber(data.currentHintLevel)) {
    errors.push('currentHintLevel must be a number if provided')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: data as unknown as StepProgress, errors: [] }
}

export function validateProblemProgress(data: unknown): ValidationResult<ProblemProgress> {
  const errors: string[] = []

  if (!isObject(data)) {
    return { valid: false, errors: ['ProblemProgress must be an object'] }
  }

  if (!isString(data.problemText)) errors.push('problemText must be a string')
  if (!isNumber(data.currentStep)) errors.push('currentStep must be a number')
  if (
    data.sessionMode !== undefined &&
    data.sessionMode !== 'guided' &&
    data.sessionMode !== 'assisted' &&
    data.sessionMode !== 'exam'
  ) {
    errors.push('sessionMode must be guided, assisted, or exam if provided')
  }

  if (!isArray(data.stepProgress)) {
    errors.push('stepProgress must be an array')
  } else {
    data.stepProgress.forEach((step, index) => {
      const result = validateStepProgress(step)
      if (!result.valid) {
        errors.push(`stepProgress[${index}]: ${result.errors.join(', ')}`)
      }
    })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: data as unknown as ProblemProgress, errors: [] }
}

// ============================================
// Scaffold Validators
// ============================================

export function validateConcept(data: unknown): ValidationResult<Concept> {
  const errors: string[] = []

  if (!isObject(data)) {
    return { valid: false, errors: ['Concept must be an object'] }
  }

  if (!isString(data.id)) errors.push('id must be a string')
  if (!isString(data.name)) errors.push('name must be a string')
  if (!isString(data.definition)) errors.push('definition must be a string')
  if (data.formula !== undefined && !isString(data.formula)) {
    errors.push('formula must be a string if provided')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: data as unknown as Concept, errors: [] }
}

export function validateHintLevel(data: unknown): ValidationResult<HintLevel> {
  const errors: string[] = []

  if (!isObject(data)) {
    return { valid: false, errors: ['HintLevel must be an object'] }
  }

  if (!isNumber(data.level) || data.level < 1 || data.level > 5) {
    errors.push('level must be a number between 1 and 5')
  }
  if (!isString(data.title)) errors.push('title must be a string')
  if (!isString(data.content)) errors.push('content must be a string')

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: data as unknown as HintLevel, errors: [] }
}

export function validateStep(data: unknown): ValidationResult<Step> {
  const errors: string[] = []

  if (!isObject(data)) {
    return { valid: false, errors: ['Step must be an object'] }
  }

  if (!isNumber(data.id)) errors.push('id must be a number')
  if (!isString(data.title)) errors.push('title must be a string')

  if (!isArray(data.hints)) {
    errors.push('hints must be an array')
  } else {
    data.hints.forEach((hint, index) => {
      const result = validateHintLevel(hint)
      if (!result.valid) {
        errors.push(`hints[${index}]: ${result.errors.join(', ')}`)
      }
    })
  }

  if (!isArray(data.requiredConcepts)) {
    errors.push('requiredConcepts must be an array')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: data as unknown as Step, errors: [] }
}

export function validateSanityCheck(data: unknown): ValidationResult<SanityCheck> {
  const errors: string[] = []

  if (!isObject(data)) {
    return { valid: false, errors: ['SanityCheck must be an object'] }
  }

  if (!isString(data.question)) errors.push('question must be a string')
  if (!isString(data.expectedBehavior)) errors.push('expectedBehavior must be a string')
  if (!isString(data.type) || !['limit', 'dimension', 'symmetry'].includes(data.type)) {
    errors.push('type must be "limit", "dimension", or "symmetry"')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: data as unknown as SanityCheck, errors: [] }
}

export function validateScaffoldData(data: unknown): ValidationResult<ScaffoldData> {
  const errors: string[] = []

  if (!isObject(data)) {
    return { valid: false, errors: ['ScaffoldData must be an object'] }
  }

  if (!isString(data.problem)) errors.push('problem must be a string')
  if (!isString(data.domain)) errors.push('domain must be a string')
  if (!isString(data.subdomain)) errors.push('subdomain must be a string')

  if (!isArray(data.concepts)) {
    errors.push('concepts must be an array')
  } else {
    data.concepts.forEach((concept, index) => {
      const result = validateConcept(concept)
      if (!result.valid) {
        errors.push(`concepts[${index}]: ${result.errors.join(', ')}`)
      }
    })
  }

  if (!isArray(data.steps)) {
    errors.push('steps must be an array')
  } else {
    data.steps.forEach((step, index) => {
      const result = validateStep(step)
      if (!result.valid) {
        errors.push(`steps[${index}]: ${result.errors.join(', ')}`)
      }
    })
  }

  if (!isObject(data.sanityCheck)) {
    errors.push('sanityCheck must be an object')
  } else {
    const result = validateSanityCheck(data.sanityCheck)
    if (!result.valid) {
      errors.push(`sanityCheck: ${result.errors.join(', ')}`)
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: data as unknown as ScaffoldData, errors: [] }
}

// ============================================
// User Preferences Validators
// ============================================

export function validateUserPreferences(data: unknown): ValidationResult<UserPreferences> {
  const errors: string[] = []

  if (!isObject(data)) {
    return { valid: false, errors: ['UserPreferences must be an object'] }
  }

  if (data.theme !== undefined && !['light', 'dark', 'system'].includes(data.theme as string)) {
    errors.push('theme must be "light", "dark", or "system"')
  }

  if (data.showHintsAutomatically !== undefined && !isBoolean(data.showHintsAutomatically)) {
    errors.push('showHintsAutomatically must be a boolean')
  }

  if (data.enableAnimations !== undefined && !isBoolean(data.enableAnimations)) {
    errors.push('enableAnimations must be a boolean')
  }

  if (data.enableSoundEffects !== undefined && !isBoolean(data.enableSoundEffects)) {
    errors.push('enableSoundEffects must be a boolean')
  }

  if (data.defaultHintLevel !== undefined && (!isNumber(data.defaultHintLevel) || data.defaultHintLevel < 1 || data.defaultHintLevel > 5)) {
    errors.push('defaultHintLevel must be a number between 1 and 5')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: data as unknown as UserPreferences, errors: [] }
}

// ============================================
// Batch Validation
// ============================================

export function validateArray<T>(
  items: unknown[],
  validator: (item: unknown) => ValidationResult<T>
): ValidationResult<T[]> {
  const errors: string[] = []
  const validItems: T[] = []

  items.forEach((item, index) => {
    const result = validator(item)
    if (result.valid && result.data) {
      validItems.push(result.data)
    } else {
      errors.push(`[${index}]: ${result.errors.join(', ')}`)
    }
  })

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: validItems, errors: [] }
}
