/**
 * Solve UI Configuration
 *
 * Centralized configuration for the /solve page progressive disclosure system.
 * Controls visibility of components based on solving state (SOLVING vs COMPLETED).
 */

/**
 * UI States for the solve page
 * SOLVING: User is actively working through steps
 * COMPLETED: User has finished all steps and passed sanity check/marked solved
 */
export type SolveUIState = 'SOLVING' | 'COMPLETED'

/**
 * Feature visibility configuration
 * Used to control which components are visible in each state
 */
export const SOLVE_UI_VISIBILITY = {
  SOLVING: {
    // Always visible during solving
    stepAccordion: true,
    stepProgressIndicator: true,
    primaryCTA: true, // Continue/Submit button
    conceptsDrawerButton: true, // Collapsed concepts button

    // Hidden during solving (moved to post-completion)
    whatIfSimulation: false,
    problemVariations: false,
    nextChallenge: false,
    completionActions: false,
  },
  COMPLETED: {
    // Still visible but de-emphasized
    stepAccordion: true,
    stepProgressIndicator: true,
    primaryCTA: false, // No longer needed
    conceptsDrawerButton: true,

    // Now visible
    whatIfSimulation: true,
    problemVariations: true,
    nextChallenge: true,
    completionActions: true,
  },
} as const

/**
 * LocalStorage key for concepts drawer state
 */
export const CONCEPTS_DRAWER_KEY = 'solve_concepts_drawer_open'

/**
 * Get persisted drawer state from localStorage
 */
export function getDrawerState(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const stored = localStorage.getItem(CONCEPTS_DRAWER_KEY)
    return stored === 'true'
  } catch {
    return false
  }
}

/**
 * Save drawer state to localStorage
 */
export function setDrawerState(isOpen: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CONCEPTS_DRAWER_KEY, String(isOpen))
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Completion Actions Configuration
 * Defines the actions shown in the post-completion decision layer
 */
export const COMPLETION_ACTIONS = {
  primary: {
    id: 'continue-path',
    label: 'Continue the Path',
    description: 'Generate your next challenge with increased difficulty',
    icon: 'arrow-right',
  },
  secondary: [
    {
      id: 'reinforce-concept',
      label: 'Reinforce This Concept',
      description: 'Practice similar problems to solidify understanding',
      icon: 'refresh',
    },
    {
      id: 'explore-whatif',
      label: 'Explore What-If Scenarios',
      description: 'See how different parameters affect the solution',
      icon: 'beaker',
    },
    {
      id: 'review-concepts',
      label: 'Review Concepts Used',
      description: 'Open the concepts reference drawer',
      icon: 'book-open',
    },
  ],
} as const

export type CompletionActionId =
  | typeof COMPLETION_ACTIONS.primary.id
  | typeof COMPLETION_ACTIONS.secondary[number]['id']
