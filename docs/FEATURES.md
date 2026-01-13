# PhysiScaffold - Features

This document describes all features with their implementation status, location in code, and navigation paths. This document is synchronized with the [Feature Registry](/lib/featureRegistry.ts) - the single source of truth.

> **Tip**: Visit `/features` in the app to explore all features interactively.

---

## Feature Status Legend

| Status | Meaning |
|--------|---------|
| **IMPLEMENTED** | Fully functional and available |
| **PARTIAL** | Partially implemented, some functionality missing |
| **STUB** | Placeholder exists, functionality not yet built |
| **DISABLED** | Implemented but disabled due to issues |
| **DEV_ONLY** | Development/testing only, hidden in production |

---

## Core Learning Features

### 1. Problem Solver

**Status**: IMPLEMENTED

**What it does**: Main problem-solving interface with AI-generated scaffolds. Accepts physics problem text and generates structured step-by-step solution guidance.

**Where to find it in the UI**:
- **Route**: `/solve`
- **Navigation**: Sidebar > "Solve" (primary nav) | Mobile bottom nav > "Solve"

**Implementation**: `components/solve/SolvePage.tsx`, `components/solve/SolutionScaffold.tsx`

**API Routes**: `/api/scaffold/outline`, `/api/scaffold/step`, `/api/scaffold/hint`

<!-- TODO: Screenshot of Problem Solver interface -->

---

### 2. Solution Roadmap (Step Accordion)

**Status**: IMPLEMENTED

**What it does**: Displays scaffold steps as an expandable accordion. Steps unlock progressively as the student completes each one.

**Where to find it in the UI**:
- **Route**: `/solve` (embedded in solver)
- **Navigation**: Within Problem Solver interface

**Implementation**: `components/solve/SolutionScaffold.tsx`, `components/solve/StepAccordion.tsx`

<!-- TODO: Screenshot of Step Accordion -->

---

### 3. Micro-Task Mode

**Status**: IMPLEMENTED

**What it does**: Breaks each step into micro-tasks: multiple-choice questions (MCQs) and fill-in-the-blank exercises instead of open-ended hints.

**Where to find it in the UI**:
- **Route**: `/solve` (embedded in steps)
- **Navigation**: Within each accordion step when expanded

**Required Flag**: `MICRO_TASKS` (hardcoded ON)

**Implementation**: `components/micro-tasks/MultipleChoiceRenderer.tsx`, `components/micro-tasks/FillBlankRenderer.tsx`

<!-- TODO: Screenshot of Micro-Task MCQ -->

---

### 4. 5-Level Hint System

**Status**: IMPLEMENTED

**What it does**: Provides progressive hints when students are stuck. Hints escalate from conceptual to computational.

| Level | Type | Content |
|-------|------|---------|
| 1 | Concept Identification | Key physics principles |
| 2 | Visualization | Diagrams, intuition |
| 3 | Strategy Selection | Problem-solving approach |
| 4 | Structural Equation | Mathematical setup |
| 5 | Full Solution | Complete answer reveal |

**Where to find it in the UI**:
- **Route**: `/solve` (embedded in steps)
- **Navigation**: "Show Hint" button within each step

**Implementation**: `lib/hintEngine.ts`

<!-- TODO: Screenshot of Hint System -->

---

### 5. Socratic Tutor Chat (Professor Check-In)

**Status**: IMPLEMENTED

**What it does**: After completing a step, an AI tutor asks a "why" question to validate conceptual understanding. Provides conversational guidance.

**Where to find it in the UI**:
- **Route**: `/solve` (embedded)
- **Navigation**: Chat panel appears after step completion

**Required Flag**: `SOCRATIC_TUTOR_CHAT` (env: `NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR`, default: ON)

**Implementation**: `components/SocraticTutorChat.tsx`

**API Routes**: `/api/socratic-tutor/`

<!-- TODO: Screenshot of Socratic Tutor Chat -->

---

### 6. Concept Inventory Panel

**Status**: IMPLEMENTED

**What it does**: Displays relevant formulas, definitions, and explanations for the current problem in a right-side panel.

**Where to find it in the UI**:
- **Route**: `/solve` (right panel)
- **Navigation**: Right panel on the solve page (desktop)

**Implementation**: `components/ConceptInventory.tsx`

<!-- TODO: Screenshot of Concept Inventory Panel -->

---

### 7. Sanity Check Module

**Status**: IMPLEMENTED

**What it does**: Final validation step that prompts students to verify their answer using limiting cases, dimensional analysis, and symmetry checks.

**Where to find it in the UI**:
- **Route**: `/solve` (final step)
- **Navigation**: Last step of the scaffold flow

**Implementation**: `lib/sanityCheckService.ts`, `components/solve/SanityCheck.tsx`

<!-- TODO: Screenshot of Sanity Check -->

---

### 8. P0 Decision Gates

**Status**: IMPLEMENTED

**What it does**: Requires students to correctly complete micro-tasks before step submission. Gating intensity increases on consecutive errors.

**Where to find it in the UI**:
- **Route**: `/solve` (embedded in steps)
- **Navigation**: Applies automatically to concept, setup, equation steps

**Required Flag**: `P0_DECISION_GATES` (env: `NEXT_PUBLIC_FEATURE_P0_DECISION_GATES`, default: ON)

**Implementation**: `lib/gatingPolicyEngine.ts`, `components/DecisionGate.tsx`

---

### 9. P0 Rebuild Gates

**Status**: IMPLEMENTED

**What it does**: Forces students who use Hint Level 5 (Reveal) to demonstrate understanding by answering 2 questions about the solution.

**Where to find it in the UI**:
- **Route**: `/solve` (embedded)
- **Navigation**: Triggers immediately after using Reveal

**Required Flag**: `P0_REBUILD_GATES` (env: `NEXT_PUBLIC_FEATURE_P0_REBUILD_GATES`, default: ON)

**Implementation**: `lib/gatingPolicyEngine.ts`, `components/RebuildGate.tsx`

---

### 10. Question Engine

**Status**: IMPLEMENTED

**What it does**: Template-based question resolution for faster, consistent scaffolds. Uses 27 physics templates with LLM-free fingerprinting.

**Where to find it in the UI**:
- **Route**: N/A (backend service)
- **Navigation**: Used automatically during scaffold generation

**Required Flag**: `QUESTION_ENGINE` (env: `NEXT_PUBLIC_FEATURE_QUESTION_ENGINE`, default: ON)

**Implementation**: `lib/questionEngine/`

**API Routes**: `/api/question/resolve`

---

### 11. Reveal-Reconstruct-Validate Flow

**Status**: IMPLEMENTED

**What it does**: 3-stage structured learning flow for reading mode: REVEAL (explanation), RECONSTRUCT (comprehension questions), VALIDATE (confidence feedback).

**Where to find it in the UI**:
- **Route**: `/solve` (embedded in reading mode)
- **Navigation**: Appears when using reveal mode

**Required Flag**: `REVEAL_RECONSTRUCT_VALIDATE` (env: `NEXT_PUBLIC_FEATURE_REVEAL_RECONSTRUCT_VALIDATE`, default: ON)

**Implementation**: `components/micro-tasks/RevealReconstructValidate.tsx`

---

## Adaptive Learning Features

### 12. Mistake Notebook

**Status**: IMPLEMENTED

**What it does**: Tracks errors made during problem-solving for targeted review later using spaced repetition.

**Where to find it in the UI**:
- **Route**: `/mistake-notebook`
- **Navigation**: Sidebar > "Review" (primary nav) | Mobile bottom nav > "Review"

**Required Flag**: `MISTAKE_NOTEBOOK` (hardcoded ON)

**Implementation**: `lib/mistakeNotebook.ts`, `lib/mistakeTracking.ts`, `components/MistakeCardDisplay.tsx`, `components/ReviewSession.tsx`

<!-- TODO: Screenshot of Mistake Notebook -->

---

### 13. Confidence-Weighted SRS

**Status**: IMPLEMENTED

**What it does**: Spaced repetition system that adjusts review intervals based on self-reported confidence levels (Guess/Okay/Solid).

| Correctness | Confidence | Scheduling |
|-------------|------------|------------|
| Correct | High (Solid) | Accelerated review (mastery) |
| Correct | Low (Guess) | Sooner review (lucky guess) |
| Wrong | High (Solid) | Aggressive review (misconception) |
| Wrong | Low (Guess) | Normal review |

**Where to find it in the UI**:
- **Route**: `/solve` (embedded), `/mistake-notebook`
- **Navigation**: Confidence prompt after step completion

**Required Flag**: `CONFIDENCE_WEIGHTED_SRS` (env: `NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS`, default: ON)

**Implementation**: `lib/confidenceWeightedSRS.ts`, `lib/srsScheduler.ts`, `components/ConfidenceRating.tsx`

---

### 14. Error Anticipator

**Status**: IMPLEMENTED

**What it does**: Proactive warning beacons for common mistakes. Predicts errors at step level without spoiling answers.

**Where to find it in the UI**:
- **Route**: `/solve` (embedded)
- **Navigation**: Warning beacons appear on steps

**Required Flag**: `ERROR_ANTICIPATOR` (hardcoded ON)

**Implementation**: `lib/errorAnticipatorService.ts`

---

### 15. Adaptive Preflight Gating

**Status**: IMPLEMENTED

**What it does**: Auto-inserts preflight checks on steps with high mistake probability (risk score > 0.55).

**Where to find it in the UI**:
- **Route**: `/solve` (embedded)
- **Navigation**: Preflight check modal on high-risk steps

**Required Flag**: `ADAPTIVE_PREFLIGHT` (env: `NEXT_PUBLIC_FEATURE_ADAPTIVE_PREFLIGHT`, default: ON)

**Implementation**: `lib/adaptivePreflightService.ts`, `components/AdaptivePreflightModal.tsx`

---

### 16. Pivot Injection

**Status**: IMPLEMENTED

**What it does**: Dynamically injects pivot questions during problem-solving to help students get "unstuck". Categories: Simplify, Analogy, Constraint, Decompose, Visualize, Reverse.

**Where to find it in the UI**:
- **Route**: `/solve` (embedded)
- **Navigation**: Appears after threshold time (90-180s) or multiple wrong attempts

**Required Flag**: `PIVOT_INJECTION` (env: `NEXT_PUBLIC_FEATURE_PIVOT_INJECTION`, default: ON)

**Implementation**: `lib/pivotService.ts`

**API Routes**: `/api/pivot/`

---

### 17. Constraint Collision Detection

**Status**: IMPLEMENTED

**What it does**: Real-time detection of physics law violations (e.g., ignoring friction on a rough surface).

**Where to find it in the UI**:
- **Route**: `/solve` (embedded)
- **Navigation**: Socratic dialogue appears on constraint violations

**Required Flag**: `CONSTRAINT_COLLISION` (env: `NEXT_PUBLIC_FEATURE_CONSTRAINT_COLLISION`, default: ON)

**Implementation**: `lib/constraintCollisionEngine.ts`, `lib/constraintExtractor.ts`, `components/ConstraintFeedback.tsx`

---

### 18. Constraint Highlight

**Status**: IMPLEMENTED

**What it does**: Highlights constraint keywords (frictionless, massless, elastic, etc.) in the problem statement after a wrong answer.

**Where to find it in the UI**:
- **Route**: `/solve` (embedded)
- **Navigation**: Modal appears after wrong answer with highlighted keywords

**Required Flag**: `CONSTRAINT_HIGHLIGHT` (env: `NEXT_PUBLIC_FEATURE_CONSTRAINT_HIGHLIGHT`, default: ON)

**Implementation**: `lib/constraintHighlightService.ts`, `components/ConstraintHighlightModal.tsx`

---

### 19. Cognitive Load Governor

**Status**: IMPLEMENTED

**What it does**: Dynamically reduces UI complexity for struggling students (shows only one step at a time, reduces MCQ options, shortens hints).

**Where to find it in the UI**:
- **Route**: `/solve` (embedded)
- **Navigation**: Automatic UI simplification when cognitive load is high

**Required Flag**: `COGNITIVE_LOAD_GOVERNOR` (env: `NEXT_PUBLIC_FEATURE_COGNITIVE_LOAD_GOVERNOR`, default: ON)

**Implementation**: `lib/cognitiveLoadService.ts`

---

### 20. Confidence Repair System

**Status**: IMPLEMENTED

**What it does**: Detects frustrating sessions and auto-recovers students on next session with a warm-up from a mastered pattern.

**Where to find it in the UI**:
- **Route**: `/study-path` (on next session)
- **Navigation**: Recovery mode modal on session start

**Required Flag**: `CONFIDENCE_REPAIR` (env: `NEXT_PUBLIC_FEATURE_CONFIDENCE_REPAIR`, default: ON)

**Implementation**: `lib/confidenceRepairService.ts`, `lib/recoveryModePolicy.ts`, `components/RepairModeModal.tsx`

---

### 21. Learning Integrity Monitor

**Status**: IMPLEMENTED

**What it does**: Silently tracks behavioral signals (fast answers, tab switching, paste events) for integrity without accusation.

**Where to find it in the UI**:
- **Route**: N/A (background service)
- **Navigation**: Runs silently; may trigger comprehension checks

**Required Flag**: `LEARNING_INTEGRITY` (env: `NEXT_PUBLIC_FEATURE_LEARNING_INTEGRITY`, default: ON)

**Implementation**: `lib/learningIntegrityService.ts`

---

## Exam Strategy Training

### 22. Pattern-First Mode

**Status**: IMPLEMENTED

**What it does**: Timed pattern identification phase (~12 seconds) before solving. Students must recognize the problem type.

**Where to find it in the UI**:
- **Route**: `/solve` (modal before scaffold)
- **Navigation**: Modal appears before scaffold generation

**Required Flag**: `PATTERN_FIRST_MODE` (env: `NEXT_PUBLIC_FEATURE_PATTERN_FIRST`, default: ON)

**Implementation**: `lib/patternFirstService.ts`, `components/PatternFirstModal.tsx`

<!-- TODO: Screenshot of Pattern-First Modal -->

---

### 23. Skip-or-Commit Gate

**Status**: IMPLEMENTED

**What it does**: Forces triage decision at T=25 seconds - commit to solving or skip the problem. Trains exam strategy.

**Where to find it in the UI**:
- **Route**: `/solve` (modal overlay)
- **Navigation**: Modal appears 25 seconds into problem

**Required Flag**: `SKIP_COMMIT_GATE` (env: `NEXT_PUBLIC_FEATURE_SKIP_COMMIT`, default: ON)

**Implementation**: `lib/skipCommitGateService.ts`, `components/SkipCommitGateModal.tsx`

<!-- TODO: Screenshot of Skip-Commit Gate -->

---

### 24. Warm-Up Protocol

**Status**: IMPLEMENTED

**What it does**: Shows 2-5 minute micro-drills before the main study session to prime pattern recognition. Uses decay-based selection.

**Where to find it in the UI**:
- **Route**: `/study-path` (before dashboard)
- **Navigation**: Warm-up modal appears on session start

**Required Flag**: `WARMUP_PROTOCOL` (env: `NEXT_PUBLIC_FEATURE_WARMUP_PROTOCOL`, default: ON)

**Implementation**: `lib/warmupSelector.ts`, `lib/drillService.ts`, `components/warmup/`

**API Routes**: `/api/warmup/`

<!-- TODO: Screenshot of Warm-Up Protocol -->

---

### 25. Micro-Pattern Drills

**Status**: IMPLEMENTED

**What it does**: Rapid-fire pattern recognition practice with timed questions (20 seconds per item).

**Where to find it in the UI**:
- **Route**: `/drills` or `/drills/[patternId]`
- **Navigation**: Accessible from Pattern Track or Warm-Up Protocol

**Implementation**: `components/DrillModal.tsx`, `components/DrillResults.tsx`

<!-- TODO: Screenshot of Drills page -->

---

### 26. Pattern Track (Study Plan v2)

**Status**: IMPLEMENTED

**What it does**: Pattern-driven curriculum that organizes learning by problem patterns and meta-skills across 4 tracks.

**Where to find it in the UI**:
- **Route**: `/pattern-track`
- **Navigation**: Sidebar > "Pattern Track" (secondary nav) | Mobile More menu

**Required Flag**: `STUDY_PLAN_V2` (env: `NEXT_PUBLIC_FEATURE_STUDY_PLAN_V2`, default: ON)

**Implementation**: `lib/studyPlanV2/`, `components/PatternTrackDetail.tsx`

**API Routes**: `/api/pattern-track/patterns`, `/api/pattern-track/progress`

<!-- TODO: Screenshot of Pattern Track -->

---

## Interactive Tools

### 27. Concept Network

**Status**: IMPLEMENTED

**What it does**: Visual concept mastery map with repair mode for weak concepts.

**Where to find it in the UI**:
- **Route**: `/concept-network`
- **Navigation**: Sidebar > "Concept Network" (secondary nav) | Mobile More menu

**Implementation**: `components/ConceptMapVisualization.tsx`, `components/RepairModeModal.tsx`

<!-- TODO: Screenshot of Concept Network -->

---

### 28. Spot the Mistake

**Status**: IMPLEMENTED

**What it does**: Critical thinking exercises where students identify errors in provided solutions.

**Where to find it in the UI**:
- **Route**: `/spot-mistake`
- **Navigation**: Sidebar > "Spot Mistake" (secondary nav) | Mobile More menu

**Implementation**: `components/SpotTheMistake.tsx`, `components/MistakeFeedback.tsx`

**API Routes**: `/api/spot-mistake/generate`, `/api/spot-mistake/analyze`

<!-- TODO: Screenshot of Spot the Mistake -->

---

### 29. Boundary Case Builder

**Status**: IMPLEMENTED

**What it does**: Interactive tool to "stress test" equations by examining limiting cases (e.g., theta -> 0, m -> infinity).

**Where to find it in the UI**:
- **Route**: `/solve` (embedded after deriving equations)
- **Navigation**: Appears after deriving an equation in a step

**Required Flag**: `BOUNDARY_CASE_BUILDER` (env: `NEXT_PUBLIC_FEATURE_BOUNDARY_CASE`, default: ON)

**Implementation**: `lib/boundaryCaseService.ts`, `components/BoundaryCaseBuilder.tsx`

---

### 30. Concept Contrast Challenge

**Status**: IMPLEMENTED

**What it does**: Challenges students to explain why they rejected "neighboring" concepts before applying their chosen principle.

**Where to find it in the UI**:
- **Route**: `/solve` (embedded)
- **Navigation**: Modal appears on steps with key physics concepts

**Required Flag**: `CONCEPT_CONTRAST` (env: `NEXT_PUBLIC_FEATURE_CONCEPT_CONTRAST`, default: ON)

**Implementation**: `lib/conceptContrastService.ts`, `components/ConceptContrastModal.tsx`

---

### 31. Paper Solution Upload

**Status**: IMPLEMENTED

**What it does**: Allows students to upload photos of handwritten solutions for OCR analysis via Claude Vision.

**Where to find it in the UI**:
- **Route**: `/solve` (embedded)
- **Navigation**: "Upload Solution" button in solver interface

**Required Flag**: `PAPER_SOLUTION_UPLOAD` (env: `NEXT_PUBLIC_FEATURE_PAPER_SOLUTION`, default: ON)

**Implementation**: `components/paper-solution/PaperSolutionUploader.tsx`

**API Routes**: `/api/paper-solution/`

---

## Analytics & Tracking

### 32. Error Patterns

**Status**: IMPLEMENTED

**What it does**: Analytics on recurring error patterns and remediation suggestions.

**Where to find it in the UI**:
- **Route**: `/error-patterns`
- **Navigation**: Sidebar > "Error Patterns" (secondary nav) | Mobile More menu

**Required Flag**: `ERROR_ANTICIPATOR` (hardcoded ON)

**Implementation**: `components/ErrorPatternAnalytics.tsx`, `components/ErrorPatternInsights.tsx`

<!-- TODO: Screenshot of Error Patterns -->

---

### 33. Problem History

**Status**: IMPLEMENTED

**What it does**: Tracks all problem attempts with status (in-progress, solved, skipped) and resume capability.

**Where to find it in the UI**:
- **Route**: `/history`
- **Navigation**: Sidebar > "History" (primary nav) | Mobile bottom nav > "History"

**Implementation**: `lib/problemHistory.ts`, `components/ProblemReplay.tsx`

<!-- TODO: Screenshot of Problem History -->

---

### 34. Draft Autosave

**Status**: IMPLEMENTED

**What it does**: Automatically saves work every 30 seconds. Prevents data loss on browser close or refresh.

**Where to find it in the UI**:
- **Route**: N/A (background service)
- **Navigation**: Runs automatically during problem solving

**Implementation**: `lib/problemHistory.ts`, `hooks/useAutoSave.ts`

---

## Navigation & Layout

### 35. Dashboard (Study Path)

**Status**: IMPLEMENTED

**What it does**: Study path dashboard with progress tracking, daily plan, and recommendations.

**Where to find it in the UI**:
- **Route**: `/study-path`
- **Navigation**: Sidebar > "Dashboard" (primary nav) | Mobile bottom nav > "Dashboard"

**Required Flag**: `DASHBOARD_V3` (hardcoded ON)

**Implementation**: `components/dashboard/DashboardV3.tsx`, `components/StudyPlanV2Dashboard.tsx`

**API Routes**: `/api/study-path/topics`, `/api/study-path/questions`

<!-- TODO: Screenshot of Dashboard -->

---

### 36. Feature Explorer

**Status**: IMPLEMENTED

**What it does**: Browse all features with status badges, filtering, and documentation links.

**Where to find it in the UI**:
- **Route**: `/features`
- **Navigation**: Sidebar > "Features" (secondary nav) | Mobile More menu

**Implementation**: `app/features/page.tsx`

<!-- TODO: Screenshot of Feature Explorer -->

---

### 37. Feature Flags Dashboard

**Status**: IMPLEMENTED

**What it does**: View effective feature flag values and understand why features are enabled or hidden.

**Where to find it in the UI**:
- **Route**: `/features/flags`
- **Navigation**: Link from Feature Explorer page

**Implementation**: `app/features/flags/page.tsx`

---

## Disabled Features

### 38. Free Body Diagram Canvas

**Status**: DISABLED

**What it does**: Interactive force diagram drawing tool for mechanics problems.

**Why disabled**: Causes step completion issues - needs better implementation.

**Where to find it in the UI**: Not accessible (disabled)

**Required Flag**: `FBD_CANVAS` (hardcoded OFF)

**Implementation**: `components/diagram/FBDCanvas.tsx`, `lib/fbdValidator.ts`

---

### 39. Phased Scaffold Loading

**Status**: DISABLED

**What it does**: 3-phase scaffold generation for reduced latency (Outline -> Step Expansion -> Final Solve).

**Why disabled**: Causes UI issues (green steps without passing, fill-in-blanks broken).

**Where to find it in the UI**: Not accessible (disabled)

**Required Flag**: `PHASED_SCAFFOLD` (hardcoded OFF)

**Implementation**: `lib/phasedScaffold.ts`

---

## Curriculum Management Features

### 46. Curriculum Content Module

**Status**: IMPLEMENTED

**What it does**: Comprehensive curriculum content management system for Foundation 1/2 levels with atomic learning objects, difficulty taxonomy, and pedagogical auditing.

**Where to find it in the UI**:
- **Routes**: API-only (`/api/curriculum/*`)
- **Navigation**: Backend service, not directly user-facing

**Implementation**:
- Types: `types/atomicLearning.ts`
- Services: `lib/curriculum/` (7 modules)
- Data: `data/curriculum/newtonsThirdLaw.json`

**API Routes**:
- `/api/curriculum/content-pack` - Fetch content packs by concept
- `/api/curriculum/classify` - Foundation 1/2 classification
- `/api/curriculum/difficulty` - Difficulty scoring and analysis
- `/api/curriculum/audit` - Content auditing
- `/api/curriculum/evolution` - Concept evolution maps
- `/api/curriculum/rag` - RAG ingestion and annotation

**Key Capabilities**:
- **Atomic Learning Objects**: Concept Cards, Misconception Cards, Problem Archetypes, Socratic Trees, Mastery Checks
- **5-Dimensional Difficulty Taxonomy**: Conceptual load, reasoning depth, transfer distance, representation switching, misconception risk
- **Foundation Classification**: Automatic F1/F2 classification based on content characteristics
- **Concept Evolution Maps**: Cross-grade progression from Class 9 to JEE Advanced
- **Curriculum Auditing**: Pedagogical integrity checks (explanation-over-inquiry, formula leakage, hint dependency)
- **RAG Integration**: Smart embedding decisions for Socratic tutoring context

---

### 47. Foundation 1/2 Classification

**Status**: IMPLEMENTED

**What it does**: Classifies curriculum content into Foundation 1 (intuition + FBD) or Foundation 2 (non-obvious interactions) based on difficulty and content characteristics.

**Where to find it in the UI**:
- **Route**: N/A (backend service)
- **Navigation**: Used by curriculum authoring tools

**Implementation**: `lib/curriculum/foundationClassification.ts`

**API Routes**: `/api/curriculum/classify`

**Classification Criteria**:
| Level | Focus | Max Difficulty | Math Level | Reasoning Steps |
|-------|-------|----------------|------------|-----------------|
| Foundation 1 | Intuition + FBD | 2 (developing) | Arithmetic | ≤3 |
| Foundation 2 | Non-obvious interactions | 3 (proficient) | Basic algebra | ≤5 |

---

### 48. Difficulty Taxonomy

**Status**: IMPLEMENTED

**What it does**: 5-dimensional difficulty scoring system for precise content calibration and student-content matching.

**Where to find it in the UI**:
- **Route**: N/A (backend service)
- **Navigation**: Used during content authoring and question selection

**Implementation**: `lib/curriculum/difficultyTaxonomy.ts`

**API Routes**: `/api/curriculum/difficulty`

**Dimensions**:
1. **Conceptual Load**: Number of concepts involved (1-5 score)
2. **Reasoning Depth**: Depth of logical chain required
3. **Transfer Distance**: How far from learned context
4. **Representation Switching**: Diagram ↔ equation ↔ graph transitions
5. **Misconception Risk**: Probability of common errors

---

### 49. Concept Evolution Maps

**Status**: IMPLEMENTED

**What it does**: Tracks how physics concepts evolve across grade levels (Class 9 → JEE Advanced), enabling payoff messaging and readiness checking.

**Where to find it in the UI**:
- **Route**: N/A (backend service)
- **Navigation**: Used for curriculum progression guidance

**Implementation**: `lib/curriculum/conceptEvolution.ts`

**API Routes**: `/api/curriculum/evolution`

**Grade Progression**:
```
Class 9 → Class 10 → Class 11 → Class 12 → JEE Mains → JEE Advanced
```

**Features**:
- Cross-level prerequisites mapping
- Payoff tag generation ("This prepares you for...")
- Student readiness checking for level transitions

---

## Development-Only Features

These features are only accessible when `NODE_ENV=development`.

### 40. LaTeX Demo

**Status**: DEV_ONLY

**What it does**: Development page for testing LaTeX rendering.

**Where to find it in the UI**:
- **Route**: `/latex-demo`
- **Navigation**: Direct URL access only (dev)

---

### 41. Time Pressure Testing

**Status**: DEV_ONLY

**What it does**: Development page for time pressure UI testing.

**Where to find it in the UI**:
- **Route**: `/dev/time-pressure`
- **Navigation**: Direct URL access only (dev)

---

### 42. Events Testing

**Status**: DEV_ONLY

**What it does**: Development page for event system testing.

**Where to find it in the UI**:
- **Route**: `/dev/events`
- **Navigation**: Direct URL access only (dev)

---

### 43. Progress Testing

**Status**: DEV_ONLY

**What it does**: Development page for progress overview testing.

**Where to find it in the UI**:
- **Route**: `/dev/progress-test`
- **Navigation**: Direct URL access only (dev)

---

### 44. Question Engine Demo

**Status**: DEV_ONLY

**What it does**: Development page for Question Engine testing.

**Where to find it in the UI**:
- **Route**: `/demo/question-engine`
- **Navigation**: Direct URL access only (dev)

---

### 45. Debug Feature Flags

**Status**: DEV_ONLY

**What it does**: Development page for testing feature flag overrides via localStorage.

**Where to find it in the UI**:
- **Route**: `/debug/features`
- **Navigation**: Direct URL access only (dev)

---

## Feature Flags Reference

### Hardcoded ON (cannot disable via env)

```typescript
MICRO_TASKS: true
MISTAKE_NOTEBOOK: true
ERROR_ANTICIPATOR: true
DASHBOARD_V3: true
SOCRATIC_FIRST_MODE: true
```

### Hardcoded OFF (cannot enable via env)

```typescript
FBD_CANVAS: false        // Causes step completion issues
PHASED_SCAFFOLD: false   // Causes UI state issues
```

### Environment Configurable (default: ON)

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
NEXT_PUBLIC_FEATURE_REVEAL_RECONSTRUCT_VALIDATE=true
NEXT_PUBLIC_FEATURE_P0_DECISION_GATES=true
NEXT_PUBLIC_FEATURE_P0_REBUILD_GATES=true
NEXT_PUBLIC_FEATURE_COGNITIVE_LOAD_GOVERNOR=true
NEXT_PUBLIC_FEATURE_CONFIDENCE_REPAIR=true
NEXT_PUBLIC_FEATURE_LEARNING_INTEGRITY=true
NEXT_PUBLIC_FEATURE_DEBUG_REFACTOR=true
```

---

## Navigation Quick Reference

### Primary Navigation (Sidebar + Mobile Bottom Nav)

| Feature | Route | Status |
|---------|-------|--------|
| Dashboard | `/study-path` | IMPLEMENTED |
| Problem Solver | `/solve` | IMPLEMENTED |
| Mistake Notebook | `/mistake-notebook` | IMPLEMENTED |
| Problem History | `/history` | IMPLEMENTED |

### Secondary Navigation (Sidebar Tools + Mobile More Menu)

| Feature | Route | Status |
|---------|-------|--------|
| Concept Network | `/concept-network` | IMPLEMENTED |
| Pattern Track | `/pattern-track` | IMPLEMENTED |
| Spot the Mistake | `/spot-mistake` | IMPLEMENTED |
| Error Patterns | `/error-patterns` | IMPLEMENTED |
| Feature Explorer | `/features` | IMPLEMENTED |

### Hidden Routes (Accessible but not in nav)

| Feature | Route | Status |
|---------|-------|--------|
| Drills | `/drills` | IMPLEMENTED |
| Feature Flags Dashboard | `/features/flags` | IMPLEMENTED |
| Debug Feature Flags | `/debug/features` | DEV_ONLY |
