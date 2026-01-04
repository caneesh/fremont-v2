/**
 * Dashboard Module
 *
 * Exports all dashboard-related services and utilities.
 */

// Dashboard metrics (hero metrics, topic coverage, wins)
export {
  computeDashboardMetrics,
  getTopicCoverage,
  getWinsMessage,
} from './dashboardMetrics'

// Today's plan management
export {
  loadPlan,
  savePlan,
  createPlan,
  getOrCreatePlan,
  addTask,
  removeTask,
  moveTaskUp,
  moveTaskDown,
  setActiveIndex,
  markTaskDone,
  getActiveTask,
  getTaskRoute,
  getTaskSuggestions,
  createTaskFromSuggestion,
  cleanupOldPlans,
} from './todayPlanService'

// Pattern track resolution
export {
  resolveNextAction,
  isNextAction,
  getAllTracksWithProgress,
  setActiveTrack,
  type PatternTrackNextAction,
  type PatternStepType,
  type NoNextAction,
} from './patternTrackResolveService'

// Independence metrics
export {
  calculateProblemIndependence,
  computeIndependenceMetrics,
  getIndependenceLabel,
  getIndependenceColor,
  type ProblemIndependenceScore,
  type IndependenceMetrics,
} from './independenceMetricsService'
