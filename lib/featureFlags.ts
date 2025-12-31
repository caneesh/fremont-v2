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
    || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FEATURE_REVEAL_RECONSTRUCT_VALIDATE !== 'false'),

  /**
   * Confidence-Weighted SRS
   * When enabled, asks students to rate their confidence after answering.
   * Uses a correctness × confidence matrix to adjust SRS scheduling:
   * - Correct + High confidence = accelerated review (mastery)
   * - Correct + Low confidence = sooner review (lucky guess)
   * - Wrong + High confidence = aggressive review (dangerous misconception)
   */
  CONFIDENCE_WEIGHTED_SRS: process.env.NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS === 'true'
    || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS !== 'false'),

  /**
   * Boundary-Case Builder
   * When enabled, shows an interactive tool for students to "stress test"
   * their equations by examining limiting cases (e.g., θ → 0°, m → ∞).
   * Teaches physical intuition and validates mathematical understanding.
   */
  BOUNDARY_CASE_BUILDER: process.env.NEXT_PUBLIC_FEATURE_BOUNDARY_CASE === 'true'
    || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FEATURE_BOUNDARY_CASE !== 'false'),

  /**
   * Equationless Path
   * When enabled, certain steps (typically Strategy level) require a verbal
   * plan before algebra entry is allowed. Forces students to articulate
   * their approach in words before jumping to equations.
   */
  EQUATIONLESS_PATH: process.env.NEXT_PUBLIC_FEATURE_EQUATIONLESS_PATH === 'true'
    || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FEATURE_EQUATIONLESS_PATH !== 'false'),

  /**
   * Concept Contrast Challenge
   * When enabled, challenges students to explain why they rejected "neighboring"
   * concepts before applying their chosen principle. Forces deep understanding
   * by requiring students to articulate why similar-but-inapplicable laws don't work.
   * Triggers on steps with key physics concepts like Conservation of Momentum, etc.
   */
  CONCEPT_CONTRAST: process.env.NEXT_PUBLIC_FEATURE_CONCEPT_CONTRAST === 'true'
    || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FEATURE_CONCEPT_CONTRAST !== 'false'),

  /**
   * Dev: Skip Steps Mode
   * When enabled, shows sanity check and other post-completion UI without
   * requiring all steps to be completed first. For testing only.
   * Can also be enabled via URL parameter: ?skipSteps=true
   */
  DEV_SKIP_STEPS: process.env.NODE_ENV === 'development',

  /**
   * Phased Scaffold Loading
   * When enabled, uses 3-phase scaffold generation for reduced latency:
   * - Phase A: Outline (~10-20s) - step list with minimal info
   * - Phase B: Step Expansion (on-demand) - deep content per step
   * - Phase C: Final Solve (optional) - only when explicitly requested
   *
   * This dramatically reduces initial load time from 5+ minutes to ~15 seconds.
   */
  PHASED_SCAFFOLD: process.env.NEXT_PUBLIC_FEATURE_PHASED_SCAFFOLD === 'true'
    || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FEATURE_PHASED_SCAFFOLD !== 'false'),

  /**
   * Feynman Hint Prompts
   * When enabled, requires students to explain their conceptual understanding
   * (Feynman style) before unlocking level 3+ hints (Strategy/Equation/Solution).
   * This ensures students truly understand the "why" before getting computational help.
   * Dynamically generates a Feynman prompt based on step concepts if no explicit
   * feynmanPrompt config is provided.
   */
  FEYNMAN_HINT_PROMPTS: process.env.NEXT_PUBLIC_FEATURE_FEYNMAN_HINT_PROMPTS === 'true'
    || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FEATURE_FEYNMAN_HINT_PROMPTS !== 'false'),

  /**
   * Constraint Collision Detection
   * When enabled, detects in real-time when student's work contradicts problem
   * constraints (e.g., ignoring friction on a rough surface, using energy
   * conservation with friction). Shows Socratic dialogue to guide correction.
   * Triggers before wrong answers compound into bigger errors.
   */
  CONSTRAINT_COLLISION: process.env.NEXT_PUBLIC_FEATURE_CONSTRAINT_COLLISION === 'true'
    || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FEATURE_CONSTRAINT_COLLISION !== 'false'),

  /**
   * Paper Solution Upload
   * When enabled, allows students to upload photos of handwritten solutions.
   * Uses Claude Vision for OCR extraction, then analyzes the solution against
   * step rubrics. Provides Socratic feedback on handwritten work.
   * Useful for students who prefer to work on paper first.
   */
  PAPER_SOLUTION_UPLOAD: process.env.NEXT_PUBLIC_FEATURE_PAPER_SOLUTION === 'true'
    || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FEATURE_PAPER_SOLUTION !== 'false'),

  /**
   * Socratic Tutor Chat
   * When enabled, shows a live chat with a professor after completing a step.
   * The professor asks 1-2 comprehension questions, and if the student struggles,
   * engages in a dynamic Socratic dialogue until understanding is confirmed.
   * Celebrates with confetti when the student demonstrates mastery.
   */
  SOCRATIC_TUTOR_CHAT: process.env.NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR === 'true'
    || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR !== 'false'),

  /**
   * Study Plan v2 - Pattern-First Learning
   * When enabled, provides an alternative study plan experience driven by:
   * - Meta-skills (foundational thinking skills)
   * - Pattern Tracks (core problem-solving patterns)
   * - Topic exposure (secondary, aligned to patterns)
   * - Error recycling (mistake → pattern → fix loop)
   * - Confidence-weighted spaced repetition (SRS)
   *
   * The original topic-based Study Plan (v1) remains available when disabled.
   * Default: ON in development, OFF in production unless configured.
   */
  STUDY_PLAN_V2: process.env.NEXT_PUBLIC_FEATURE_STUDY_PLAN_V2 === 'true'
    || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FEATURE_STUDY_PLAN_V2 !== 'false'),
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
