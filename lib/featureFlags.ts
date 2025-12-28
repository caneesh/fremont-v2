/**
 * Feature Flags
 *
 * Centralized feature flag management.
 * Uses environment variables for configuration.
 */

export const FEATURE_FLAGS = {
  /**
   * FBD Canvas - Interactive Free Body Diagram
   * When enabled, mechanics problems may include diagram steps
   * that require users to draw force diagrams.
   */
  FBD_CANVAS: process.env.NEXT_PUBLIC_ENABLE_FBD === 'true',

  /**
   * Micro Tasks - Active learning mode
   * When enabled, uses MCQ/fill-in-blank tasks instead of hints.
   * This is currently the default mode.
   */
  MICRO_TASKS: true,

  /**
   * Mistake Notebook - Spaced repetition review
   * When enabled, tracks mistakes and provides SRS-based review.
   */
  MISTAKE_NOTEBOOK: true,

  /**
   * Error Anticipator - Pass 1.5 analysis
   * When enabled, generates warning beacons for common mistakes.
   */
  ERROR_ANTICIPATOR: true
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature] ?? false
}

/**
 * Get all enabled features (for debugging)
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)
}
