/**
 * Study Plan v2 Module
 *
 * Pattern-first learning system for physics problem solving.
 */

// Repository
export {
  studyPlanV2Repository,
  contentCatalogRepository,
  userStateRepository,
  type IContentCatalogRepository,
  type IUserStateRepository,
  type StudyPlanV2Repository,
} from './repository'

// Scheduler
export {
  generateDailyPlan,
  getOrGenerateTodaysPlan,
  markPlanItemCompleted,
  updateMasteryOnAttempt,
  recordMistakeEvent,
  selectTodayThinkingObjective,
  calculateMasteryDelta,
  calculateNextReviewInterval,
  calculateNextReviewDate,
  createInitialPatternState,
  createInitialMetaSkillState,
} from './scheduler'

// Service
export { studyPlanV2Service } from './studyPlanV2Service'

// Telemetry
export {
  recordStepCompletionV2,
  isInV2Session,
  getV2SessionInfo,
  advanceV2Session,
  clearV2Session,
  completeV2Session,
} from './telemetryHook'
