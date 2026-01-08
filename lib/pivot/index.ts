/**
 * Pivot Injection Module
 *
 * Exports pivot service and related types.
 */

export { pivotService, createPivotService } from './pivot-service'
export type { PivotService } from './pivot-service'

export {
  pivotRepository,
  pivotAnalytics,
  LocalStoragePivotRepository,
  ConsolePivotAnalytics,
} from './pivot-repository'

// Re-export types from service
export type {
  PivotQuestion,
  PivotTrigger,
  PivotDecision,
  PivotSessionState,
  PivotAnswerSubmission,
} from './pivot-service'

export { DEFAULT_PIVOT_QUESTIONS } from './pivot-service'
