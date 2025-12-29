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
  ERROR_ANTICIPATOR: true,

  /**
   * Reveal-Reconstruct-Validate Flow
   * When enabled, reading mode uses a structured 3-stage learning flow:
   * 1. REVEAL: Structured explanation with scannable sections
   * 2. RECONSTRUCT: 1-2 comprehension check questions
   * 3. VALIDATE: Confidence-weighted feedback (solid/partial/mismatch)
   *
   * When disabled, falls back to the original one-liner reveal behavior.
   * Default: ON in development, OFF in production unless configured.
   */
  REVEAL_RECONSTRUCT_VALIDATE: process.env.NEXT_PUBLIC_FEATURE_REVEAL_RECONSTRUCT_VALIDATE === 'true'
    || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FEATURE_REVEAL_RECONSTRUCT_VALIDATE !== 'false')
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
