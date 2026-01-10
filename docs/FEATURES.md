# PhysiScaffold - Features

This document describes all features with their implementation status, location in code, and any constraints.

## Core Features (Fully Implemented)

### 1. Two-Pass AI Architecture

**What it does**: Uses a hidden solver pass to generate the correct solution internally, then a visible scaffolder pass to create guidance without revealing answers.

**Implementation**: `lib/anthropic.ts`, `/api/scaffold/*` routes

**Success criteria**:
- Scaffold steps align with correct solution path
- No direct answers leak to the student
- Hints are contextually accurate

---

### 2. Problem Input & Scaffold Generation

**What it does**: Accepts physics problem text (typed or pasted) and generates a structured step-by-step solution scaffold.

**Implementation**: `components/solve/SolvePage.tsx`, `/api/scaffold/outline`

**Where it appears**: Main page at `/solve` - problem input textarea and "Generate Scaffold" button

**Success criteria**:
- Scaffold appears within 10-20 seconds (Phase A outline)
- Steps are logically ordered
- Concept inventory populates in right panel

---

### 3. Solution Roadmap (Step Accordion)

**What it does**: Displays scaffold steps as an expandable accordion. Steps unlock progressively as the student completes each one.

**Implementation**: `components/solve/SolutionScaffold.tsx`, `components/solve/StepAccordion.tsx`

**Where it appears**: Main solve interface - center panel

**Success criteria**:
- Only current step is interactive
- Completed steps show checkmark
- Locked steps are visually distinct

---

### 4. Micro-Task Mode

**What it does**: Breaks each step into micro-tasks: multiple-choice questions (MCQs) and fill-in-the-blank exercises instead of open-ended hints.

**Implementation**: `components/micro-tasks/`, `lib/featureFlags.ts` (`MICRO_TASKS: true`)

**Where it appears**: Within each accordion step when expanded

**Feature flag**: Always ON (`FEATURE_FLAGS.MICRO_TASKS = true`)

**Success criteria**:
- MCQs render with selectable options
- Fill-in-blanks accept text input
- Immediate feedback on submission with reasoning

---

### 5. 5-Level Hint System

**What it does**: Provides progressive hints when students are stuck. Hints escalate from conceptual to computational.

**Implementation**: `lib/hintEngine.ts`

**Hint Levels**:
| Level | Type | Content |
|-------|------|---------|
| 1 | Concept Identification | Key physics principles |
| 2 | Visualization | Diagrams, intuition |
| 3 | Strategy Selection | Problem-solving approach |
| 4 | Structural Equation | Mathematical setup |
| 5 | Full Solution | Complete answer reveal |

**Where it appears**: "Show Hint" button within each step

**Success criteria**:
- Hints are contextual to current step
- Each level provides more detail
- Level 5 is the final reveal

---

### 6. Socratic Tutor Chat (Professor Check-In)

**What it does**: After completing a step, an AI tutor asks a "why" question to validate conceptual understanding. Provides conversational guidance.

**Implementation**: `components/SocraticTutorChat.tsx`, `/api/socratic-tutor/` routes

**Where it appears**: Chat panel after step completion

**Feature flag**: `NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR` (default: ON)

**Success criteria**:
- Tutor question appears after step submission
- Accepts natural language responses
- Advances to next step after validation
- Shows celebration on correct understanding

---

### 7. Concept Inventory Panel

**What it does**: Displays relevant formulas, definitions, and explanations for the current problem in a right-side panel.

**Implementation**: `components/ConceptInventory.tsx`

**Where it appears**: Right panel on the solve page

**Success criteria**:
- Concepts load with scaffold
- LaTeX formulas render correctly (KaTeX)
- Scrollable if content is long

---

### 8. Sanity Check Module

**What it does**: Final validation step that prompts students to verify their answer using limiting cases, dimensional analysis, and symmetry checks.

**Implementation**: `lib/sanityCheckService.ts`, `components/solve/SanityCheck.tsx`

**Where it appears**: Final step of the scaffold flow

**Success criteria**:
- Prompts for limiting case verification
- Accepts qualitative reasoning
- Marks problem as complete after validation

---

### 9. Pattern-First Mode

**What it does**: Timed pattern identification phase before solving. Students must recognize the problem type within a time limit (~12 seconds).

**Implementation**: `lib/patternFirstService.ts`, `components/PatternFirstModal.tsx`

**Where it appears**: Modal before scaffold generation

**Feature flag**: `NEXT_PUBLIC_FEATURE_PATTERN_FIRST` (default: ON)

**Success criteria**:
- Timer counts down from 12 seconds
- Pattern options are displayed
- Selection recorded for analytics
- Proceeds after selection or timeout

---

### 10. Skip-or-Commit Gate

**What it does**: Forces triage decision at T=25 seconds - student must commit to solving or skip the problem. Trains exam strategy.

**Implementation**: `lib/skipCommitGateService.ts`, `components/SkipCommitGateModal.tsx`

**Where it appears**: Modal overlay during solve

**Feature flag**: `NEXT_PUBLIC_FEATURE_SKIP_COMMIT` (default: ON)

**Configuration**:
- Gate timing: 25 seconds
- Auto-commit after: 8 seconds

**Success criteria**:
- Gate appears at configured time
- "Commit" continues solving
- "Skip" marks problem as skipped
- Analytics recorded for patterns

---

### 11. Problem History & Progress Tracking

**What it does**: Tracks all problem attempts with status (in-progress, solved, skipped). Persists progress for resumption.

**Implementation**: `lib/problemHistory.ts`, `/history` page

**Database**: `user_question_history` table

**Where it appears**: `/history` page and dashboard indicators

**Attempt outcomes**: `completed`, `abandoned`, `revealed`, `skipped`

**Success criteria**:
- All attempts logged
- Status accurately reflects completion
- Resume works from last position

---

### 12. Draft Autosave

**What it does**: Automatically saves work every 30 seconds. Prevents data loss on browser close or refresh.

**Implementation**: `lib/problemHistory.ts`, `hooks/useAutoSave.ts`

**Where it appears**: Background process during solve

**Success criteria**:
- No visible save action needed
- Progress restored on return
- Works across browser sessions

---

### 13. Mistake Notebook

**What it does**: Tracks errors made during problem-solving for targeted review later using spaced repetition.

**Implementation**: `lib/mistakeNotebook.ts`, `lib/mistakeTracking.ts`, `/mistake-notebook` page

**Feature flag**: Always ON (`FEATURE_FLAGS.MISTAKE_NOTEBOOK = true`)

**Where it appears**: `/mistake-notebook` page

**Success criteria**:
- Mistakes captured automatically
- Categorized by error type
- SRS scheduling for review

---

### 14. Confidence-Weighted SRS

**What it does**: Spaced repetition system that adjusts review intervals based on self-reported confidence levels.

**Implementation**: `lib/confidenceWeightedSRS.ts`, `lib/srsScheduler.ts`

**Feature flag**: `NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS` (default: ON)

**Confidence levels**: Guess / Okay / Solid

**Scheduling matrix**:
| Correctness | Confidence | Scheduling |
|-------------|------------|------------|
| Correct | High (Solid) | Accelerated review (mastery) |
| Correct | Low (Guess) | Sooner review (lucky guess) |
| Wrong | High (Solid) | Aggressive review (misconception) |
| Wrong | Low (Guess) | Normal review |

**Success criteria**:
- Confidence prompt after completion
- Intervals adjust based on matrix
- Review queue prioritized correctly

---

### 15. Error Anticipator

**What it does**: Proactive warning beacons for common mistakes. Predicts errors at step level.

**Implementation**: `lib/errorAnticipatorService.ts`

**Feature flag**: Always ON (`FEATURE_FLAGS.ERROR_ANTICIPATOR = true`)

**Success criteria**:
- Warning beacons shown without spoiling
- Contextual to step content
- Non-intrusive guidance

---

### 16. Adaptive Preflight Gating

**What it does**: Auto-inserts preflight checks on steps with high mistake probability.

**Implementation**: `lib/adaptivePreflightService.ts`

**Feature flag**: `NEXT_PUBLIC_FEATURE_ADAPTIVE_PREFLIGHT` (default: ON)

**Risk scoring based on**:
- Mistake Notebook (SRS cards, severity, recency)
- Mistake Tracking (struggle rates, patterns)
- Concept Mastery (mastery scores)

**Success criteria**:
- High-risk steps (score > 0.55) trigger preflight
- Students must verify understanding before proceeding
- Risk scores personalized per user

---

### 17. Study Plan v2 (Pattern-First Learning)

**What it does**: Pattern-driven curriculum that organizes learning by problem patterns and meta-skills.

**Implementation**: `lib/studyPlanV2/`, `/study-path` and `/pattern-track` pages

**Database**: `pattern_progress`, `lesson_progress`, `track_progress` tables

**Feature flag**: `NEXT_PUBLIC_FEATURE_STUDY_PLAN_V2` (default: ON)

**Tracks**: foundation1 → foundation2 → intermediate → competitive

**Where it appears**: `/study-path`, `/pattern-track` pages

**Success criteria**:
- Patterns displayed with progress
- Meta-skills tracked across problems
- Recommendations generated based on mastery

---

### 18. Warm-Up Protocol

**What it does**: Shows 2-5 minute micro-drills before the main study session to prime pattern recognition.

**Implementation**: `lib/warmupSelector.ts`, `lib/drillService.ts`, `/api/warmup/*` routes, `components/warmup/`

**Data**: `data/warmup-drills.json`

**Feature flag**: `NEXT_PUBLIC_FEATURE_WARMUP_PROTOCOL` (default: ON)

**Selection algorithm**:
- Decay-based block selection (prioritizes rusty patterns)
- Include if decay > 0.3, exclude if mastery > 0.85
- Recent mistake types weighted

**Configuration**:
- Drill time limit: 20 seconds per item
- Skip allowed once per day (with -0.05 mastery penalty)

**Success criteria**:
- Drills appear before main session
- Timed MCQ/short answer format
- Must complete or skip to proceed

---

### 19. Pivot Injection

**What it does**: Dynamically injects pivot questions during problem-solving to help students get "unstuck".

**Implementation**: `lib/pivotService.ts`, `/api/pivot/*` routes

**Feature flag**: `NEXT_PUBLIC_FEATURE_PIVOT_INJECTION` (default: ON)

**Triggers when**:
- Time spent on step exceeds threshold (90-180 seconds)
- Multiple wrong attempts (2-4 depending on difficulty)
- High hint level reached (level >= 2)

**Pivot categories**:
- Simplify: Break down complex problems
- Analogy: Connect to familiar concepts
- Constraint: Identify problem boundaries
- Decompose: Split into sub-problems
- Visualize: Draw or imagine the scenario
- Reverse: Work backwards from goal

**Success criteria**:
- Pivot questions appear when stuck
- Help reframe thinking without revealing answer
- Can skip if not helpful

---

### 20. Constraint Collision Detection

**What it does**: Real-time detection of physics law violations (e.g., ignoring friction on a rough surface).

**Implementation**: `lib/constraintCollisionEngine.ts`, `lib/constraintExtractor.ts`, `lib/constraintDialogueEngine.ts`

**Feature flag**: `NEXT_PUBLIC_FEATURE_CONSTRAINT_COLLISION` (default: ON)

**Constraint categories**:
- Friction (frictionless, rough, kinetic/static)
- Momentum (elastic/inelastic collisions)
- Energy (conservative/non-conservative)
- Forces (massless, rigid)

**Success criteria**:
- Constraints extracted from problem text
- Violations detected in real-time
- Socratic dialogue guides correction

---

### 21. Constraint Highlight

**What it does**: Highlights constraint keywords in the problem statement after a wrong answer.

**Implementation**: `lib/constraintHighlightService.ts`, `components/ConstraintHighlightModal.tsx`

**Feature flag**: `NEXT_PUBLIC_FEATURE_CONSTRAINT_HIGHLIGHT` (default: ON)

**Detected keywords**: frictionless, massless, elastic, rigid, inextensible, etc. (14+ patterns)

**Success criteria**:
- Keywords highlighted after wrong answer
- Hint provided for missed constraint
- Requires acknowledgment before continuing

---

### 22. Paper Solution Upload

**What it does**: Allows students to upload photos of handwritten solutions for OCR and analysis.

**Implementation**: `/api/paper-solution/*` routes, `components/paper-solution/`

**Feature flag**: `NEXT_PUBLIC_FEATURE_PAPER_SOLUTION` (default: ON)

**Flow**:
1. Upload image
2. OCR extraction via Claude Vision
3. Rubric-based analysis
4. Socratic feedback on handwritten work

**Success criteria**:
- Images uploaded successfully
- Text extracted from handwriting
- Feedback provided against rubrics

---

### 23. Boundary Case Builder

**What it does**: Interactive tool to "stress test" equations by examining limiting cases.

**Implementation**: `lib/boundaryCaseService.ts`, `components/BoundaryCaseBuilder.tsx`

**Feature flag**: `NEXT_PUBLIC_FEATURE_BOUNDARY_CASE` (default: ON)

**Example cases**: θ → 0°, θ → 90°, m → ∞, μ → 0

**Success criteria**:
- Shows after deriving equation
- Interactive parameter adjustment
- Validates physical intuition

---

### 24. Concept Contrast Challenge

**What it does**: Challenges students to explain why they rejected "neighboring" concepts before applying their chosen principle.

**Implementation**: `lib/conceptContrastService.ts`, `components/ConceptContrastModal.tsx`

**Database**: `precomputed_concept_contrasts` table

**Feature flag**: `NEXT_PUBLIC_FEATURE_CONCEPT_CONTRAST` (default: ON)

**Example**: "Why not use energy conservation here instead of momentum?"

**Success criteria**:
- Triggers on key physics concepts
- Forces articulation of why similar concepts don't apply
- Builds deep understanding through differentiation

---

### 25. Socratic Rewind

**What it does**: Guides students back using Socratic method when they're stuck.

**Implementation**: `lib/socraticRewindService.ts`, `/api/socratic-rewind`

**Where it appears**: "I'm stuck" button triggers rewind

**Success criteria**:
- Rewinds to earlier step
- Socratic questions guide re-examination
- Helps recover without revealing answer

---

### 26. Socratic-First Step Interaction

**What it does**: Transforms step interaction from hint-reveal to Socratic questioning.

**Implementation**: `lib/socraticFirstService.ts`, `components/SocraticFirstStep.tsx`

**Feature flag**: Hardcoded ON (`FEATURE_FLAGS.SOCRATIC_FIRST_MODE = true`)

**Flow**:
1. Step opens with thinking prompt: "What's your approach?"
2. Student answers + rates confidence
3. AI verifies → guides with follow-up questions OR celebrates mastery
4. If stuck: Hint ladder with Socratic verification per hint

**Success criteria**:
- Warm tone (never uses "wrong")
- Self-report + AI verify pattern
- Integrates with Concept Mastery and Mistake Notebook

---

### 27. P0 Decision Gates

**What it does**: Requires students to correctly complete micro-tasks before step submission.

**Implementation**: `lib/gatingPolicyEngine.ts`

**Feature flag**: `NEXT_PUBLIC_FEATURE_P0_DECISION_GATES` (default: ON)

**Configuration**:
- Required correct answers: 1 (or 2 if weak confidence)
- Max attempts: 2 (then auto-unlock Hint Level 2)

**Success criteria**:
- Gating applies to concept, setup, equation steps
- Wrong answers show targeted feedback
- Gating intensity increases on consecutive errors

---

### 28. P0 Rebuild Gates

**What it does**: Forces students who use Hint Level 5 (Reveal) to demonstrate understanding.

**Implementation**: `lib/gatingPolicyEngine.ts`

**Feature flag**: `NEXT_PUBLIC_FEATURE_P0_REBUILD_GATES` (default: ON)

**Questions after reveal**:
1. "Which pattern was used?"
2. "What was the first decision?"

**Success criteria**:
- Triggers immediately after reveal
- Must answer correctly to continue
- Prevents passive reveal-skipping

---

### 29. Cognitive Load Governor

**What it does**: Dynamically reduces UI complexity for struggling students.

**Implementation**: `lib/cognitiveLoadService.ts`

**Feature flag**: `NEXT_PUBLIC_FEATURE_COGNITIVE_LOAD_GOVERNOR` (default: ON)

**Monitors**:
- Time spent per step
- Wrong attempt count
- Hint escalation speed
- Reveal usage
- Circuit breaker state

**When cognitive load = high**:
- Show only ONE active step at a time
- Collapse future steps (read-only)
- Reduce MCQs to binary where possible
- Shorten hint text

**Success criteria**:
- Automatic detection of struggling
- UI simplification without explicit notice
- Gradual restoration as performance improves

---

### 30. Confidence Repair System

**What it does**: Detects frustrating sessions and auto-recovers students on next session.

**Implementation**: `lib/confidenceRepairService.ts`, `lib/recoveryModePolicy.ts`

**Feature flag**: `NEXT_PUBLIC_FEATURE_CONFIDENCE_REPAIR` (default: ON)

**Detection criteria (any 2)**:
- Reveal used > 2 times
- Circuit breaker tripped
- Average step time > 5 minutes
- Session ended mid-problem

**Recovery mode**:
- 1 warm-up problem from mastered pattern
- Disable Reveal during recovery
- Extra micro-tasks for confidence
- Supportive tone only

**Success criteria**:
- Automatic recovery activation
- Confidence rebuilding flow
- Exits after 1 successful warm-up

---

### 31. Learning Integrity Monitor

**What it does**: Silently tracks behavioral signals that may indicate AI-assisted answering.

**Implementation**: `lib/learningIntegrityService.ts`

**Feature flag**: `NEXT_PUBLIC_FEATURE_LEARNING_INTEGRITY` (default: ON)

**Monitored signals**:
- Fast answers (< threshold time)
- Tab switching frequency
- Paste events
- Answer pattern anomalies

**Interventions (never accusatory)**:
- Comprehension checks
- Extra decision gates
- Session flagging for review

**Principles**:
- Silent detection, never accusation
- Pattern accumulation (not single incidents)
- Generous thresholds
- Never blocks progress

---

### 32. Question Engine

**What it does**: Template-based question resolution for faster, consistent scaffolds.

**Implementation**: `lib/questionEngine/`, `/api/question/resolve`

**Feature flag**: `NEXT_PUBLIC_FEATURE_QUESTION_ENGINE` (default: ON)

**Features**:
- 27 physics templates (mechanics, thermo, EM, optics, waves, modern)
- LLM-free fingerprinting for template selection
- Content-addressed caching (SHA-256)
- Template enforcement (LLM fills slots only)

**Success criteria**:
- Faster response times
- Consistent step structure
- Lower LLM costs

---

### 33. Dashboard v3

**What it does**: New unified AppShell layout with dashboard as default landing.

**Implementation**: `components/dashboard/`, `components/shell/`, `/study-path` page

**Feature flag**: Hardcoded ON (`FEATURE_FLAGS.DASHBOARD_V3 = true`)

**Layout**:
- Desktop: Sidebar + TopBar navigation
- Mobile: Bottom nav (4 items + More menu)

**Features**:
- Hero metrics (days practiced, problems solved, independence)
- Today's plan editor with task reordering
- Session runner for guided daily practice

**Success criteria**:
- Dashboard as default landing page
- `/solve` as dedicated solver route
- Responsive navigation

---

### 34. Database-Backed Questions

**What it does**: Uses questions from PostgreSQL database instead of static JSON.

**Implementation**: `lib/db.ts`, Prisma models, `/api/pattern-track/*` routes

**Feature flag**: `NEXT_PUBLIC_FEATURE_DATABASE_QUESTIONS` (default: ON)

**Database tables**: `questions`, `question_tags`, `question_edges`

**Success criteria**:
- Questions loaded from database
- Patterns linked to questions
- Dynamic question addition without code changes

---

### 35. Spot the Mistake Mode

**What it does**: Students identify flaws in provided solutions.

**Implementation**: `/api/spot-mistake/*` routes, `/spot-mistake` page

**Flow**:
1. Generate flawed solution
2. Student identifies errors
3. Analyze student's spotting

**Success criteria**:
- Realistic flawed solutions generated
- Error identification tracked
- Feedback on spotting accuracy

---

### 36. Reveal-Reconstruct-Validate Flow

**What it does**: 3-stage structured learning flow for reading mode.

**Implementation**: `lib/revealReconstructValidate.ts`

**Feature flag**: `NEXT_PUBLIC_FEATURE_REVEAL_RECONSTRUCT_VALIDATE` (default: ON)

**Stages**:
1. REVEAL: Structured explanation with scannable sections
2. RECONSTRUCT: Comprehension check questions
3. VALIDATE: Confidence-weighted feedback

**Success criteria**:
- Structured learning for passive readers
- Comprehension verification
- Confidence feedback integration

---

## Partial / Experimental Features

### Free Body Diagram Canvas

**What it does**: Interactive force diagram drawing tool for mechanics problems.

**Implementation**: `lib/fbdValidator.ts`, FBD components

**Feature flag**: `NEXT_PUBLIC_ENABLE_FBD` (default: OFF)

**Status**: Disabled - causes step completion issues

**When available**:
- Force palette
- Snap angles
- Validation against expected diagram

---

### Phased Scaffold Loading

**What it does**: 3-phase scaffold generation for reduced latency.

**Implementation**: `lib/phasedScaffold.ts`

**Feature flag**: `FEATURE_FLAGS.PHASED_SCAFFOLD = false`

**Status**: Disabled - causes UI issues (green steps without passing, fill-in-blanks broken)

**Phases**:
- Phase A: Outline (~10-20s)
- Phase B: Step Expansion (on-demand)
- Phase C: Final Solve (optional)

---

### PDF Question Import

**What it does**: Extracts physics questions from PDF files using Claude Vision.

**Implementation**: `scripts/pdf-to-questions.ts`, `/api/questions/extract`

**Optional dependencies**: MathPix API keys for enhanced extraction

**CLI Usage**:
```bash
npx ts-node scripts/pdf-to-questions.ts problems.pdf -o questions.json
```

**Status**: Functional but requires manual curation of extracted questions

---

### Explain to Friend (Feynman Summary)

**What it does**: Generates 3-line Feynman-style summaries.

**Implementation**: `lib/explainToFriendService.ts`, `/api/explain-to-friend`

**Status**: Implemented, available via API

---

### Debug/Refactor Problem Modes

**What it does**: Alternative problem-solving modes for debugging and refactoring exercises.

**Implementation**: `lib/debugRefactorService.ts`

**Feature flag**: `NEXT_PUBLIC_FEATURE_DEBUG_REFACTOR` (default: ON)

**Debug Mode**:
- 5-step flow: understand → hypothesis → fix → test → reflection

**Refactor Mode**:
- 5-step flow: read → identify → refactor → test → reflection

**Status**: Implemented but not physics-focused (coding exercises)

---

## Out of Scope / Not Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| User authentication (production) | Partial | Simple session-based, no full auth system |
| Cloud sync | Not implemented | LocalStorage + database hybrid |
| Mobile-optimized UI | Partial | Desktop-first design, basic responsive |
| Offline mode | Not implemented | Requires internet for AI |
| Multi-language support | Not implemented | English only |
| Teacher/instructor dashboard | Planned | No class management |
| LMS integration | Planned | Canvas, Blackboard not connected |
| Multiplayer solving | Planned | Single-user only |

---

## Feature Flags Reference

### Always ON (hardcoded)
```typescript
MICRO_TASKS: true
MISTAKE_NOTEBOOK: true
ERROR_ANTICIPATOR: true
DASHBOARD_V3: true
SOCRATIC_FIRST_MODE: true
```

### Default ON (environment configurable)
```bash
NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR=true
NEXT_PUBLIC_FEATURE_PATTERN_FIRST=true
NEXT_PUBLIC_FEATURE_SKIP_COMMIT=true
NEXT_PUBLIC_FEATURE_STUDY_PLAN_V2=true
NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS=true
NEXT_PUBLIC_FEATURE_BOUNDARY_CASE=true
NEXT_PUBLIC_FEATURE_CONCEPT_CONTRAST=true
NEXT_PUBLIC_FEATURE_ADAPTIVE_PREFLIGHT=true
NEXT_PUBLIC_FEATURE_WARMUP_PROTOCOL=true
NEXT_PUBLIC_FEATURE_PIVOT_INJECTION=true
NEXT_PUBLIC_FEATURE_CONSTRAINT_COLLISION=true
NEXT_PUBLIC_FEATURE_CONSTRAINT_HIGHLIGHT=true
NEXT_PUBLIC_FEATURE_PAPER_SOLUTION=true
NEXT_PUBLIC_FEATURE_QUESTION_ENGINE=true
NEXT_PUBLIC_FEATURE_DATABASE_QUESTIONS=true
```

### Default OFF
```bash
NEXT_PUBLIC_ENABLE_FBD=false  # Causes issues
```

### Disabled in Code
```typescript
FBD_CANVAS: false          // Step completion issues
PHASED_SCAFFOLD: false     // UI state issues
```
