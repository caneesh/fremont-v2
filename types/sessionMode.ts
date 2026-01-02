export type SessionMode = 'guided' | 'assisted' | 'exam'

export type ProfessorVisibility = 'always' | 'on_error' | 'never'

export type StepVisibilityMode = 'all' | 'window' | 'none'

export interface StepVisibilityConfig {
  mode: StepVisibilityMode
  window?: {
    previous: number
    next: number
  }
}

export type SubmissionVisibility = 'after_steps' | 'always'
export type SubmissionVariant = 'standard' | 'exam'

export interface SessionModeBadgeConfig {
  label: string
  description: string
  className: string
}

export interface SessionModePresentationConfig {
  maxHintLevel: number
  maxTaskLevel: number
  professorVisibility: ProfessorVisibility
  stepVisibility: StepVisibilityConfig
  showSteps: boolean
  showSidebar: boolean
  submissionVisibility: SubmissionVisibility
  submissionVariant: SubmissionVariant
  badge: SessionModeBadgeConfig
}

export interface SessionModeTransitionConfig {
  guidedToAssistedMastery: number
  assistedToExamMastery: number
  examEntryMaxRecentErrors: number
  assistedRegressionErrorThreshold: number
  examRegressionErrorThreshold: number
}

export interface RecentErrorWindowConfig {
  windowMs: number
}

export interface SessionModePolicyConfig {
  transitions: SessionModeTransitionConfig
  recentErrorWindow: RecentErrorWindowConfig
  presentation: Record<SessionMode, SessionModePresentationConfig>
}

export interface SessionModeState {
  mode: SessionMode
  recentErrorTimestamps: number[]
  lastUpdatedAt: number
}

export const DEFAULT_SESSION_MODE_POLICY_CONFIG: SessionModePolicyConfig = {
  transitions: {
    guidedToAssistedMastery: 0.6,
    assistedToExamMastery: 0.75,
    examEntryMaxRecentErrors: 2,
    assistedRegressionErrorThreshold: 3,
    examRegressionErrorThreshold: 2,
  },
  recentErrorWindow: {
    windowMs: 20 * 60 * 1000,
  },
  presentation: {
    guided: {
      maxHintLevel: 4,
      maxTaskLevel: 5,
      professorVisibility: 'always',
      stepVisibility: { mode: 'all' },
      showSteps: true,
      showSidebar: true,
      submissionVisibility: 'after_steps',
      submissionVariant: 'standard',
      badge: {
        label: 'Guided',
        description: 'Full scaffolding and professor support',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      },
    },
    assisted: {
      maxHintLevel: 3,
      maxTaskLevel: 3,
      professorVisibility: 'on_error',
      stepVisibility: { mode: 'window', window: { previous: 1, next: 0 } },
      showSteps: true,
      showSidebar: true,
      submissionVisibility: 'after_steps',
      submissionVariant: 'standard',
      badge: {
        label: 'Assisted',
        description: 'Reduced scaffolding with targeted professor help',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      },
    },
    exam: {
      maxHintLevel: 0,
      maxTaskLevel: 0,
      professorVisibility: 'never',
      stepVisibility: { mode: 'none' },
      showSteps: false,
      showSidebar: false,
      submissionVisibility: 'always',
      submissionVariant: 'exam',
      badge: {
        label: 'Exam',
        description: 'Minimal support, exam-style submission',
        className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
      },
    },
  },
}
