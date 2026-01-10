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
   * DISABLED: Causing step completion issues - needs better implementation
   */
  FBD_CANVAS: false,

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
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_REVEAL_RECONSTRUCT_VALIDATE=false)
   */
  REVEAL_RECONSTRUCT_VALIDATE: process.env.NEXT_PUBLIC_FEATURE_REVEAL_RECONSTRUCT_VALIDATE !== 'false',

  /**
   * Confidence-Weighted SRS
   * When enabled, asks students to rate their confidence after answering.
   * Uses a correctness × confidence matrix to adjust SRS scheduling:
   * - Correct + High confidence = accelerated review (mastery)
   * - Correct + Low confidence = sooner review (lucky guess)
   * - Wrong + High confidence = aggressive review (dangerous misconception)
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS=false)
   */
  CONFIDENCE_WEIGHTED_SRS: process.env.NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS !== 'false',

  /**
   * Boundary-Case Builder
   * When enabled, shows an interactive tool for students to "stress test"
   * their equations by examining limiting cases (e.g., θ → 0°, m → ∞).
   * Teaches physical intuition and validates mathematical understanding.
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_BOUNDARY_CASE=false)
   */
  BOUNDARY_CASE_BUILDER: process.env.NEXT_PUBLIC_FEATURE_BOUNDARY_CASE !== 'false',

  /**
   * Equationless Path
   * When enabled, certain steps (typically Strategy level) require a verbal
   * plan before algebra entry is allowed. Forces students to articulate
   * their approach in words before jumping to equations.
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_EQUATIONLESS_PATH=false)
   */
  EQUATIONLESS_PATH: process.env.NEXT_PUBLIC_FEATURE_EQUATIONLESS_PATH !== 'false',

  /**
   * Concept Contrast Challenge
   * When enabled, challenges students to explain why they rejected "neighboring"
   * concepts before applying their chosen principle. Forces deep understanding
   * by requiring students to articulate why similar-but-inapplicable laws don't work.
   * Triggers on steps with key physics concepts like Conservation of Momentum, etc.
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_CONCEPT_CONTRAST=false)
   */
  CONCEPT_CONTRAST: process.env.NEXT_PUBLIC_FEATURE_CONCEPT_CONTRAST !== 'false',

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
   * DISABLED: Causing step UI issues (green steps without passing, fill-in-blanks broken)
   */
  PHASED_SCAFFOLD: false,

  /**
   * Feynman Hint Prompts
   * When enabled, requires students to explain their conceptual understanding
   * (Feynman style) before unlocking level 3+ hints (Strategy/Equation/Solution).
   * This ensures students truly understand the "why" before getting computational help.
   * Dynamically generates a Feynman prompt based on step concepts if no explicit
   * feynmanPrompt config is provided.
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_FEYNMAN_HINT_PROMPTS=false)
   */
  FEYNMAN_HINT_PROMPTS: process.env.NEXT_PUBLIC_FEATURE_FEYNMAN_HINT_PROMPTS !== 'false',

  /**
   * Constraint Collision Detection
   * When enabled, detects in real-time when student's work contradicts problem
   * constraints (e.g., ignoring friction on a rough surface, using energy
   * conservation with friction). Shows Socratic dialogue to guide correction.
   * Triggers before wrong answers compound into bigger errors.
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_CONSTRAINT_COLLISION=false)
   */
  CONSTRAINT_COLLISION: process.env.NEXT_PUBLIC_FEATURE_CONSTRAINT_COLLISION !== 'false',

  /**
   * Paper Solution Upload
   * When enabled, allows students to upload photos of handwritten solutions.
   * Uses Claude Vision for OCR extraction, then analyzes the solution against
   * step rubrics. Provides Socratic feedback on handwritten work.
   * Useful for students who prefer to work on paper first.
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_PAPER_SOLUTION=false)
   */
  PAPER_SOLUTION_UPLOAD: process.env.NEXT_PUBLIC_FEATURE_PAPER_SOLUTION !== 'false',

  /**
   * Socratic Tutor Chat
   * When enabled, shows a live chat with a professor after completing a step.
   * The professor asks 1-2 comprehension questions, and if the student struggles,
   * engages in a dynamic Socratic dialogue until understanding is confirmed.
   * Celebrates with confetti when the student demonstrates mastery.
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR=false)
   */
  SOCRATIC_TUTOR_CHAT: process.env.NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR !== 'false',

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
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_STUDY_PLAN_V2=false)
   */
  STUDY_PLAN_V2: process.env.NEXT_PUBLIC_FEATURE_STUDY_PLAN_V2 !== 'false',

  /**
   * Adaptive Preflight Gating
   * When enabled, auto-inserts preflight checks on steps with high mistake
   * probability. Uses data from:
   * - Mistake Notebook (SRS cards, severity, recency)
   * - Mistake Tracking (struggle rates, patterns)
   * - Concept Mastery (mastery scores)
   *
   * A risk score is calculated for each step, and steps above the threshold
   * (default 0.55) trigger a preflight check requiring students to verify
   * their understanding before proceeding.
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_ADAPTIVE_PREFLIGHT=false)
   */
  ADAPTIVE_PREFLIGHT: process.env.NEXT_PUBLIC_FEATURE_ADAPTIVE_PREFLIGHT !== 'false',

  /**
   * Why This Step Explainer
   * When enabled, shows a "Why?" button on each step that generates an
   * on-demand explanation of why that step is important in the solution process.
   * Uses Claude to explain the pedagogical purpose of the step.
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_WHY_THIS_STEP=false)
   */
  WHY_THIS_STEP: process.env.NEXT_PUBLIC_FEATURE_WHY_THIS_STEP !== 'false',

  /**
   * Step Confidence Heatmap
   * When enabled, displays a visual heatmap of confidence ratings across steps.
   * Shows at-a-glance understanding of where the student is confident vs uncertain.
   * Works in conjunction with CONFIDENCE_WEIGHTED_SRS for rating collection.
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_STEP_HEATMAP=false)
   */
  STEP_HEATMAP: process.env.NEXT_PUBLIC_FEATURE_STEP_HEATMAP !== 'false',

  /**
   * Pattern-First Mode
   * When enabled, prompts students to identify the relevant physics pattern
   * before accessing the solution scaffold. This builds pattern recognition
   * skills crucial for physics problem-solving (fast recognition under time pressure).
   *
   * Features:
   * - Timed pattern selection modal (default: 12 seconds)
   * - Tracks decision accuracy and speed
   * - Locks scaffold until selection or timeout
   * - Analytics for pattern identification performance
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_PATTERN_FIRST=false)
   */
  PATTERN_FIRST_MODE: process.env.NEXT_PUBLIC_FEATURE_PATTERN_FIRST !== 'false',

  /**
   * Skip-or-Commit Gate
   * When enabled, forces learners to make a strategic decision at T=25 seconds:
   * - Commit: continue solving the problem
   * - Skip: exit and move to next problem (no shame)
   *
   * This trains exam-time strategy by forcing quick triage decisions.
   * Features:
   * - Configurable gate timing (default: 25 seconds)
   * - Auto-commit after 8 seconds if user ignores
   * - Session analytics for skip/commit patterns
   * - "Should have skipped" flagging for problems where user spent >2x expected time AND got wrong
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_SKIP_COMMIT=false)
   */
  SKIP_COMMIT_GATE: process.env.NEXT_PUBLIC_FEATURE_SKIP_COMMIT !== 'false',

  /**
   * P0 Decision Gates
   * When enabled, requires students to correctly complete micro-tasks before
   * they can submit/complete a step (for concept, setup, equation step types).
   *
   * Features:
   * - Configurable number of required correct answers (default: 1, or 2 if weak confidence)
   * - Wrong answers show targeted feedback from micro_task.reasoning
   * - Retry up to maxAttempts (default: 2); after that, auto-unlock Hint Level 2
   * - Gating intensity increases if pattern gate was wrong or consecutive wrong submissions
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_P0_DECISION_GATES=false)
   */
  P0_DECISION_GATES: process.env.NEXT_PUBLIC_FEATURE_P0_DECISION_GATES !== 'false',

  /**
   * P0 Rebuild Gates
   * When enabled, forces students who use Hint Level 5 (Reveal/Full Solution)
   * to demonstrate understanding before proceeding.
   *
   * Features:
   * - Triggers immediately after reveal is shown
   * - 2 questions: "Which pattern was used?" + "What was the first decision?"
   * - Must answer correctly to unlock "Continue" / next step
   * - Tracks: hint_used(level=5), rebuild_gate_shown, rebuild_gate_passed/failed
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_P0_REBUILD_GATES=false)
   */
  P0_REBUILD_GATES: process.env.NEXT_PUBLIC_FEATURE_P0_REBUILD_GATES !== 'false',

  /**
   * Cognitive Load Governor
   * When enabled, dynamically reduces UI complexity for struggling students.
   *
   * Monitors session metrics:
   * - timeSpentPerStep: Average time on each step
   * - wrongAttempts: Count of incorrect submissions
   * - hintEscalationSpeed: How fast hints are being unlocked
   * - revealUsed: Whether level 5 (full solution) was revealed
   * - circuitBreakerState: Current state of the error circuit breaker
   *
   * When cognitiveLoadScore = 'high':
   * - Show only ONE active step at a time
   * - Collapse future steps (read-only)
   * - Reduce MCQs to binary where possible
   * - Shorten hint text (first sentence only)
   * - Disable optional hints temporarily
   *
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_COGNITIVE_LOAD_GOVERNOR=false)
   */
  COGNITIVE_LOAD_GOVERNOR: process.env.NEXT_PUBLIC_FEATURE_COGNITIVE_LOAD_GOVERNOR !== 'false',

  /**
   * Confidence Repair System
   * When enabled, detects frustrating sessions and auto-recovers students.
   *
   * Detection Criteria (any 2 triggers):
   * - Reveal used more than N times (default: 2)
   * - Circuit breaker tripped
   * - Average step time > threshold (default: 5 min)
   * - Session ended mid-problem
   *
   * On Next Session Start:
   * - Activates Recovery Mode automatically
   * - Presents 1 warm-up problem from previously mastered pattern
   * - Disables Reveal during recovery
   * - Enables extra micro-tasks for confidence
   * - Professor Check-In uses supportive tone only
   *
   * Completion:
   * - After 1 successful warm-up, exits Recovery Mode
   * - Resumes normal study path
   *
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_CONFIDENCE_REPAIR=false)
   */
  CONFIDENCE_REPAIR: process.env.NEXT_PUBLIC_FEATURE_CONFIDENCE_REPAIR !== 'false',

  /**
   * Learning Integrity Monitor
   * When enabled, silently tracks behavioral signals that may indicate
   * AI-assisted answering (fast answers, tab switching, paste events).
   *
   * Key Principles:
   * - Silent detection, never accusation
   * - Pattern accumulation (not single incidents)
   * - Generous thresholds (benefit of the doubt)
   * - Gentle interventions framed as learning opportunities
   *
   * Interventions:
   * - Comprehension checks ("Let's solidify this!")
   * - Extra decision gates (silent)
   * - Session flagging for review (silent)
   *
   * Never blocks progress or shames the student.
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_LEARNING_INTEGRITY=false)
   */
  LEARNING_INTEGRITY: process.env.NEXT_PUBLIC_FEATURE_LEARNING_INTEGRITY !== 'false',

  /**
   * Question Engine v1
   * When enabled, uses the template-based Question Scaffolding Engine for
   * problem resolution instead of the full LLM-generated scaffolds.
   *
   * Benefits:
   * - Faster response times (template reuse + caching)
   * - Consistent step structure across similar problems
   * - Lower LLM costs (fingerprinting + adaptation vs full generation)
   * - 27 physics templates covering mechanics, thermo, EM, optics, waves, modern
   *
   * The Question Engine uses:
   * - LLM-free fingerprinting for template selection
   * - Content-addressed caching (SHA-256)
   * - Template enforcement (LLM can only fill slots, not modify structure)
   * - Local scaffold cache for known questions (instant response)
   *
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_QUESTION_ENGINE=false)
   */
  QUESTION_ENGINE: process.env.NEXT_PUBLIC_FEATURE_QUESTION_ENGINE !== 'false',

  /**
   * Dashboard v3
   * When enabled, uses the new unified AppShell layout with:
   * - Desktop: Sidebar + TopBar navigation
   * - Mobile: Bottom nav (4 items + More menu)
   * - Dashboard as default landing page
   * - /solve as dedicated solver route
   *
   * Features:
   * - Planning-control first dashboard
   * - Hero metrics (days practiced, problems solved, independence)
   * - Today's plan editor with task reordering
   * - Session runner for guided daily practice
   *
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_DASHBOARD_V3=false)
   */
  DASHBOARD_V3: process.env.NEXT_PUBLIC_FEATURE_DASHBOARD_V3 !== 'false',

  /**
   * Socratic-First Step Interaction
   * When enabled, transforms step interaction from hint-reveal to Socratic questioning.
   *
   * Key features:
   * - Hybrid entry: "thinking prompt" first, then Socratic guidance
   * - Self-report + AI verify: User rates confidence (guess/okay/solid), AI verifies
   * - Stuck mode: Free choice with embedded Socratic questions per hint
   * - Warm tone: System never uses "wrong" or condescending language
   *
   * Flow:
   * 1. Step opens with thinking prompt: "What's your approach?"
   * 2. Student answers + rates confidence
   * 3. AI verifies → guides with follow-up questions OR celebrates mastery
   * 4. If stuck: Hint ladder with Socratic verification per hint
   *
   * Integrates with:
   * - Concept Mastery Service (records Socratic attempts)
   * - Mistake Notebook (triggers on misconceptions, overconfidence)
   * - Error Pattern Service (records Socratic errors)
   *
   * Default: OFF (can be enabled with NEXT_PUBLIC_FEATURE_SOCRATIC_FIRST=true)
   */
  SOCRATIC_FIRST_MODE: true,

  /**
   * Database Questions
   * When enabled, the practice page uses questions from the PostgreSQL database
   * (via Prisma) instead of static JSON files.
   *
   * This enables:
   * - 54+ physics questions across 27 patterns
   * - Questions stored in the Question table with v2 payloads
   * - Patterns from the Pattern table
   * - Dynamic question addition without code changes
   *
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_DATABASE_QUESTIONS=false)
   */
  USE_DATABASE_QUESTIONS: process.env.NEXT_PUBLIC_FEATURE_DATABASE_QUESTIONS !== 'false',

  /**
   * Warm-Up Protocol
   * When enabled, shows 2-5 minute micro-drills before the main study session.
   *
   * Features:
   * - Decay-based block selection (prioritizes rusty patterns)
   * - Timed MCQ/short answer drills (20s per item)
   * - Skip once per day with mastery penalty (-0.05)
   * - Session gating (must complete or skip before accessing dashboard)
   *
   * Selection algorithm uses:
   * - Pattern decay scores (higher = more urgent)
   * - Recent mistake types
   * - Mastery thresholds (include if decay > 0.3, exclude if mastery > 0.85)
   *
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_WARMUP_PROTOCOL=false)
   */
  WARMUP_PROTOCOL: process.env.NEXT_PUBLIC_FEATURE_WARMUP_PROTOCOL !== 'false',

  /**
   * Pivot Injection
   * When enabled, dynamically injects pivot questions during problem-solving
   * to help students get "unstuck" and think differently.
   *
   * Triggers when:
   * - Time spent on step exceeds threshold (90-180 seconds)
   * - Multiple wrong attempts (2-4 depending on difficulty)
   * - High hint level reached (level >= 2)
   *
   * Pivot categories:
   * - Simplify: Break down complex problems
   * - Analogy: Connect to familiar concepts
   * - Constraint: Identify problem boundaries
   * - Decompose: Split into sub-problems
   * - Visualize: Draw or imagine the scenario
   * - Reverse: Work backwards from goal
   *
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_PIVOT_INJECTION=false)
   */
  PIVOT_INJECTION: process.env.NEXT_PUBLIC_FEATURE_PIVOT_INJECTION !== 'false',

  /**
   * Constraint Highlight
   * When enabled, highlights constraint keywords in the problem statement
   * after a wrong answer to help students notice what they may have missed.
   *
   * Features:
   * - Detects 14+ physics constraints (frictionless, massless, elastic, etc.)
   * - Shows highlighted keyword with hint after first wrong attempt
   * - Requires acknowledgment before continuing
   * - Tracks which constraints students commonly miss
   *
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_CONSTRAINT_HIGHLIGHT=false)
   */
  CONSTRAINT_HIGHLIGHT: process.env.NEXT_PUBLIC_FEATURE_CONSTRAINT_HIGHLIGHT !== 'false',

  /**
   * Debug/Refactor Problem Modes
   * When enabled, provides alternative problem-solving modes beyond standard scaffolds:
   *
   * Debug Mode:
   * - 5-step flow: understand → hypothesis → fix → test → reflection
   * - Given buggy code + failing tests, student must identify and fix the bug
   * - Scoring: tests 40%, bugId 30%, hypothesis 15%, reflection 15%
   *
   * Refactor Mode:
   * - 5-step flow: read → identify → refactor → test → reflection
   * - Given working but smelly code, student must improve it
   * - Scoring: tests 30%, smells 35%, style 20%, quality 15%
   *
   * Features:
   * - Code editor with syntax highlighting
   * - Test runner visualization
   * - Step-by-step guided progression
   * - Rubric-based scoring with detailed feedback
   *
   * Default: ON (can be disabled with NEXT_PUBLIC_FEATURE_DEBUG_REFACTOR=false)
   */
  DEBUG_REFACTOR_MODE: process.env.NEXT_PUBLIC_FEATURE_DEBUG_REFACTOR !== 'false',
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
