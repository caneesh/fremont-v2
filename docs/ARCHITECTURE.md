# PhysiScaffold - Architecture Document

**Version**: 2.0
**Last Updated**: 2026-01-09

This document describes the system architecture of PhysiScaffold, an AI-powered physics tutoring platform.

---

## 1. System Overview

PhysiScaffold is a Next.js 15 application that provides scaffolded physics problem-solving with adaptive learning features. The core philosophy is the "Socratic Engine" - guiding students through reasoning rather than providing direct answers.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Dashboard  │  │   Solver    │  │  Pattern    │  │  History   │ │
│  │  (v3 Shell) │  │    Page     │  │   Track     │  │   Page     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                              │                                      │
│                    ┌─────────▼─────────┐                           │
│                    │   React Components │                           │
│                    │   (100+ components)│                           │
│                    └─────────┬─────────┘                           │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ HTTP/WebSocket
┌──────────────────────────────▼──────────────────────────────────────┐
│                        Next.js API Routes                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  /scaffold/* │  │ /socratic-*  │  │  /pattern-*  │  ... 60+    │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                         Service Layer                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Core Services: scaffold, hint, socratic, pattern, warmup   │   │
│  │  Adaptive: SRS, mistake tracking, cognitive load, preflight │   │
│  │  Physics: constraint collision, FBD validation, concepts    │   │
│  │  Policy: gating, session mode, recovery mode                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
       ▼                       ▼                       ▼
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  Anthropic  │        │  PostgreSQL │        │  Vercel KV  │
│  Claude API │        │   (Neon)    │        │   (Redis)   │
└─────────────┘        └─────────────┘        └─────────────┘
```

---

## 2. Core Architectural Patterns

### 2.1 Two-Pass AI Architecture

The scaffold generation uses a two-pass model to ensure accuracy while maintaining pedagogical soundness:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Two-Pass Generation                          │
│                                                                 │
│  ┌─────────────────────┐     ┌─────────────────────┐           │
│  │     Pass 1          │     │     Pass 2          │           │
│  │  (Hidden Solver)    │────▶│ (Visible Scaffold)  │           │
│  │                     │     │                     │           │
│  │  • Full solution    │     │  • Step-by-step     │           │
│  │  • Verified answer  │     │  • Hints & tasks    │           │
│  │  • Internal only    │     │  • Student-facing   │           │
│  └─────────────────────┘     └─────────────────────┘           │
│                                                                 │
│  Purpose: Pass 1 ensures correctness; Pass 2 ensures pedagogy  │
│  without leaking answers prematurely.                          │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation**: `lib/anthropic.ts`, `/api/scaffold/*`

### 2.2 Phased Scaffold Delivery

Scaffolds are delivered in phases to minimize perceived latency:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Phase A   │    │   Phase B   │    │   Phase C   │
│   Outline   │───▶│  Expansion  │───▶│   Reveal    │
│  (10-20s)   │    │ (on-demand) │    │  (optional) │
└─────────────┘    └─────────────┘    └─────────────┘
      │                  │                  │
      ▼                  ▼                  ▼
 Step list only    Micro-tasks,       Full solution
 Minimal info      hints, traps       per step
```

| Phase | Endpoint | Content | Timing |
|-------|----------|---------|--------|
| A | `/api/scaffold/outline` | Step list, goals, minimal info | ~10-20 seconds |
| B | `/api/scaffold/step` | Micro-tasks, hints, explanations | On-demand per step |
| C | `/api/scaffold/step` (reveal) | Complete solution | User-triggered |

**Implementation**: `lib/phasedScaffold.ts`

**Note**: The phased scaffold UI flag is currently disabled (`FEATURE_FLAGS.PHASED_SCAFFOLD = false`) due to UI state issues.

### 2.3 Service Layer Architecture

The application uses a service-oriented architecture with 60+ specialized services:

```
lib/
├── Core Services
│   ├── anthropic.ts              # Claude API integration
│   ├── phasedScaffold.ts         # Scaffold generation
│   ├── hintEngine.ts             # 5-level hint system
│   └── scaffoldCache.ts          # Scaffold caching
│
├── Pedagogical Services
│   ├── socraticTutorService.ts   # Socratic dialogue
│   ├── socraticRewindService.ts  # Rewind & recovery
│   ├── revealReconstructValidate.ts # 3-stage learning
│   └── explainToFriendService.ts # Feynman summaries
│
├── Adaptive Learning Services
│   ├── confidenceWeightedSRS.ts  # Confidence × correctness SRS
│   ├── mistakeNotebook.ts        # Error tracking
│   ├── mistakeTracking.ts        # Struggle detection
│   ├── cognitiveLoadService.ts   # Load management
│   ├── adaptivePreflightService.ts # Risk-based gating
│   └── adaptiveDensity.ts        # Dynamic granularity
│
├── Physics-Specific Services
│   ├── constraintCollisionEngine.ts  # Law violation detection
│   ├── constraintExtractor.ts        # Problem constraint parsing
│   ├── constraintDialogueEngine.ts   # Socratic correction
│   ├── boundaryCaseService.ts        # Limiting case validation
│   └── conceptMappingService.ts      # Concept relationships
│
├── Pattern & Curriculum Services
│   ├── patternFirstService.ts    # Pattern identification
│   ├── drillService.ts           # Drill generation
│   ├── warmupSelector.ts         # Session warm-up
│   └── studyPlanV2/              # Pattern-first curriculum
│
├── Policy Engines
│   ├── gatingPolicyEngine.ts     # Feature availability
│   ├── sessionModePolicyEngine.ts # Exam vs practice
│   └── recoveryModePolicy.ts     # Error recovery
│
└── Curriculum Services
    ├── contentVersioning.ts      # Version management, deprecation
    ├── difficultyTaxonomy.ts     # 5-dimensional difficulty scoring
    ├── ragIngestion.ts           # RAG embedding decisions
    ├── foundationClassification.ts # F1/F2 classification
    ├── conceptEvolution.ts       # Cross-grade progression
    └── curriculumAudit.ts        # Pedagogical integrity checks
```

### 2.4 Feature Flag System

Features are controlled via a centralized flag system:

```typescript
// lib/featureFlags.ts
export const FEATURE_FLAGS = {
  // Hardcoded flags (always on/off)
  MICRO_TASKS: true,
  MISTAKE_NOTEBOOK: true,
  DASHBOARD_V3: true,
  SOCRATIC_FIRST_MODE: true,
  FBD_CANVAS: false,           // Disabled: step completion issues
  PHASED_SCAFFOLD: false,      // Disabled: UI state issues

  // Environment-configurable flags (default ON)
  SOCRATIC_TUTOR_CHAT: process.env.NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR !== 'false',
  PATTERN_FIRST_MODE: process.env.NEXT_PUBLIC_FEATURE_PATTERN_FIRST !== 'false',
  // ... 20+ additional flags
}
```

**Design Principles**:
- Most features default to ON
- Set to `false` in env to disable
- Hardcoded flags for features with known issues
- Client-side flags prefixed with `NEXT_PUBLIC_`

---

## 3. Data Architecture

### 3.1 Database Schema (PostgreSQL via Neon)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Core Entities                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌─────────────────┐     ┌─────────────┐       │
│  │  questions  │────▶│ question_edges  │◀────│  questions  │       │
│  │             │     │ (relationships) │     │             │       │
│  └──────┬──────┘     └─────────────────┘     └─────────────┘       │
│         │                                                           │
│         ├────────────────┐                                          │
│         │                │                                          │
│         ▼                ▼                                          │
│  ┌─────────────┐  ┌─────────────┐                                  │
│  │question_tags│  │user_question│                                  │
│  │ (normalized)│  │  _history   │                                  │
│  └─────────────┘  └─────────────┘                                  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                      Progress Tracking                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │pattern_progress │  │ lesson_progress │  │ track_progress  │     │
│  │ (per pattern)   │  │  (per lesson)   │  │ (denormalized)  │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     Precomputed Content                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │precomputed_scaffold  │  │ precomputed_step     │                │
│  │     _outlines        │──│    _expansions       │                │
│  └──────────────────────┘  └──────────────────────┘                │
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │precomputed_concept   │  │ precomputed          │                │
│  │     _contrasts       │  │    _variations       │                │
│  └──────────────────────┘  └──────────────────────┘                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Key Enums

```typescript
enum QuestionLifecycleState {
  draft      // Initial state; not visible to users
  review     // Under editorial review
  approved   // Live in production
  retired    // Removed from active pool
}

enum Track {
  foundation1   // Beginners, intuition building
  foundation2   // Pre-competitive readiness
  intermediate  // Class 11-12 regular
  competitive   // JEE/NEET aspirants
}

enum AttemptOutcome {
  completed   // All steps done + sanity check passed
  abandoned   // Left mid-problem
  revealed    // Used full solution reveal
  skipped     // Skip-or-Commit gate skip
}

enum EdgeType {
  same_difficulty  // A ↔ B equally hard
  harder           // A → B means B is harder
  easier           // A → B means B is easier
  same_pattern     // Share physics pattern
  prerequisite     // A must be done before B
  variation        // Variations of same problem
}
```

### 3.3 Storage Strategy

| Data Type | Storage | Rationale |
|-----------|---------|-----------|
| Questions, Progress | PostgreSQL (Neon) | Relational, ACID, complex queries |
| Session State | Vercel KV (Redis) | Fast read/write, TTL support |
| Scaffold Cache | Redis + DB | Hot cache in Redis, persistent in DB |
| Problem History | localStorage + DB | Offline-first, synced to DB |
| Static Data | JSON files | Questions, patterns, drills |
| File Uploads | Vercel Blob | Paper solution images |

---

## 4. API Architecture

### 4.1 API Route Organization

```
app/api/
├── scaffold/                 # Scaffold generation
│   ├── outline/route.ts      # Phase A - step outline
│   ├── step/route.ts         # Phase B - step expansion
│   └── hint/route.ts         # Hint generation
│
├── socratic-tutor/           # Socratic dialogue
│   ├── route.ts              # Main chat
│   ├── initial-prompt/       # Opening question
│   └── hint-verification/    # Verify hint understanding
│
├── pattern-track/            # Pattern learning
│   ├── patterns/route.ts     # Pattern list/details
│   ├── questions/route.ts    # Questions by pattern
│   ├── lessons/route.ts      # Lesson management
│   ├── practice/route.ts     # Practice mode
│   └── progress/route.ts     # User progress
│
├── warmup/                   # Warm-up protocol
│   ├── start/route.ts        # Start session
│   ├── assign/route.ts       # Assign drill blocks
│   ├── submit/route.ts       # Submit answers
│   └── drills/[blockId]/     # Get block drills
│
├── pivot/                    # Pivot injection
│   ├── init/route.ts         # Initialize state
│   ├── show/route.ts         # Trigger pivot
│   └── answer/route.ts       # Answer pivot
│
├── paper-solution/           # Handwritten analysis
│   ├── upload/route.ts       # Upload image
│   ├── extract/route.ts      # OCR extraction
│   └── analyze/route.ts      # Rubric analysis
│
├── question/                 # Question lifecycle
│   ├── resolve/route.ts      # Template resolution
│   ├── complete/route.ts     # Mark complete
│   └── lifecycle/route.ts    # State transitions
│
├── curriculum/               # Curriculum management
│   ├── content-pack/route.ts # Content pack fetching
│   ├── classify/route.ts     # Foundation classification
│   ├── difficulty/route.ts   # Difficulty analysis
│   ├── audit/route.ts        # Content auditing
│   ├── evolution/route.ts    # Concept evolution maps
│   └── rag/route.ts          # RAG ingestion
│
└── ... (40+ additional endpoints)
```

### 4.2 Key API Contracts

#### Scaffold Outline (Phase A)

```typescript
// POST /api/scaffold/outline
Request {
  problem: string           // Problem text
  questionId?: string       // Optional precomputed question ID
}

Response {
  success: boolean
  data: {
    scaffold_id: string
    problem: string
    tags: { domain, subdomain, patterns, difficulty }
    concepts: Array<{ id, name }>
    steps: Array<{
      step_id: string
      title: string
      goal: string
      minimal_task: string
      step_type: 'concept' | 'setup' | 'equation' | 'calculation'
    }>
    estimated_time_mins: number
  }
}
```

#### Step Expansion (Phase B)

```typescript
// POST /api/scaffold/step
Request {
  scaffold_id: string
  step_id: string
  problem: string
}

Response {
  success: boolean
  data: {
    scaffold_id: string
    step_id: string
    micro_tasks: Array<{
      task_id: string
      type: 'MCQ' | 'fill_blank' | 'open'
      question: string
      options?: string[]
      correct_index?: number
      reasoning: string
    }>
    explanation: string
    traps: string[]
    hints: Array<{ level: 1-5, content: string }>
    gating: {
      min_correct_tasks: number
      allow_skip_after_attempts: number
    }
  }
}
```

#### Socratic Tutor Chat

```typescript
// POST /api/socratic-tutor
Request {
  stepContext: {
    step_id: string
    title: string
    goal: string
    concepts: string[]
  }
  messages: Array<{ role: 'user' | 'assistant', content: string }>
  userMessage: string
}

Response {
  response: string
  isComplete: boolean      // True when understanding validated
  followUpQuestion?: string
}
```

---

## 5. Domain Model

### 5.1 Core Entities

| Entity | Description | Key Fields |
|--------|-------------|------------|
| `Question` | Physics problem with JSONB payload | id, questionId, difficulty, track, lifecycleState, payload |
| `QuestionEdge` | Directed relationship between questions | fromQuestionId, toQuestionId, edgeType, weight, isCurated |
| `QuestionTag` | Normalized tags for filtering | questionId, tagType, tagValue |
| `Pattern` | Physics problem pattern | patternId, label, parentPatternId, level |
| `Topic` | Physics topic hierarchy | topicId, label, parentTopicId, level |
| `UserQuestionHistory` | User's attempt on a question | userId, questionId, outcome, score, stepsCompleted |
| `PatternProgress` | User's mastery per pattern | userId, patternId, masteryLevel, currentStreak |
| `PrecomputedScaffoldOutline` | Cached Phase A content | questionId, scaffoldId, outlineData |

### 5.2 Question Lifecycle

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐
│  draft  │────▶│ review  │────▶│ approved │────▶│ retired │
└─────────┘     └─────────┘     └──────────┘     └─────────┘
```

| State | Description | Visibility |
|-------|-------------|------------|
| `draft` | Initial state | Editorial only |
| `review` | Under editorial review | Editorial only |
| `approved` | Live in production | Users can access |
| `retired` | Removed from active pool | Historical only |

**Invariants**:
- Only `approved` questions are served to users
- Questions cannot skip states (draft → approved is INVALID)
- AI-generated questions MUST go through `review`

### 5.3 Track Definitions

| Track | Difficulty | Target Audience | Characteristics |
|-------|------------|-----------------|-----------------|
| `foundation1` | 1-2 | Beginners | Intuition, qualitative reasoning |
| `foundation2` | 2-4 | Pre-competitive | Vector sense, 2-3 step problems |
| `intermediate` | 4-6 | Class 11-12 | Equation setup, standard procedures |
| `competitive` | 6-10 | JEE/NEET | Pattern recognition, trap avoidance |

---

## 6. Curriculum Architecture

### 6.1 Atomic Learning Objects

The curriculum system is built on atomic, composable learning objects:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Content Pack                                  │
│  (Complete curriculum bundle for a concept)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────┐        │
│  │  Concept    │  │  Misconception  │  │    Problem       │        │
│  │   Cards     │  │     Cards       │  │   Archetypes     │        │
│  │             │  │                 │  │                  │        │
│  │ • Statement │  │ • Trap triggers │  │ • Canonical form │        │
│  │ • Intuition │  │ • Correction    │  │ • Transfer vars  │        │
│  │ • Mental    │  │ • Severity      │  │ • Solution path  │        │
│  │   model     │  │                 │  │                  │        │
│  └─────────────┘  └─────────────────┘  └──────────────────┘        │
│                                                                     │
│  ┌─────────────────────┐  ┌────────────────────────────────┐       │
│  │   Socratic Trees    │  │      Mastery Checks            │       │
│  │                     │  │                                │       │
│  │ • Branching paths   │  │ • Conceptual questions         │       │
│  │ • Adaptive fading   │  │ • Qualitative reasoning        │       │
│  │ • Recovery routes   │  │ • Transfer application         │       │
│  └─────────────────────┘  └────────────────────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Implementation**: `types/atomicLearning.ts`, `lib/curriculum/`

### 6.2 Five-Dimensional Difficulty Taxonomy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Difficulty Dimensions                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Dimension                 │ Score Range │ Description              │
│  ─────────────────────────┼─────────────┼────────────────────────  │
│  Conceptual Load          │  1-5        │ # of concepts involved   │
│  Reasoning Depth          │  1-5        │ Logical chain length     │
│  Transfer Distance        │  1-5        │ Context similarity       │
│  Representation Switching │  1-5        │ Diagram↔equation↔graph   │
│  Misconception Risk       │  1-5        │ Probability of errors    │
│                                                                     │
│  Composite Score = weighted_average(dimensions)                     │
│  Overall Level = scoreToLevel(composite)                            │
│                                                                     │
│  Levels: novice → developing → proficient → advanced → expert       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Implementation**: `lib/curriculum/difficultyTaxonomy.ts`

### 6.3 Foundation Classification

```
┌─────────────────────────────────────────────────────────────────────┐
│               Foundation 1 vs Foundation 2                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Foundation 1 (F1)                │  Foundation 2 (F2)              │
│  ─────────────────────────────    │  ──────────────────────────    │
│  Focus: Intuition + FBD           │  Focus: Non-obvious interactions│
│  Max difficulty: 2 (developing)   │  Max difficulty: 3 (proficient) │
│  Max reasoning steps: 3           │  Max reasoning steps: 5         │
│  Math level: Arithmetic only      │  Math level: Basic algebra      │
│  Requires FBD: Yes                │  Requires FBD: Yes              │
│  Intuition-based: Yes             │  Non-obvious interactions: Yes  │
│                                                                     │
│  Target Skills:                   │  Target Skills:                 │
│  • Qualitative reasoning          │  • Multi-step reasoning         │
│  • Representation                 │  • Hidden force identification  │
│  • Cause-effect                   │  • Quantitative prediction      │
│  • Comparison                     │  • Constraint-based analysis    │
│  • Limiting cases                 │  • Edge case handling           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Implementation**: `lib/curriculum/foundationClassification.ts`

### 6.4 Concept Evolution Maps

Tracks concept progression across grade levels:

```
┌─────────────────────────────────────────────────────────────────────┐
│              Newton's Laws Evolution Map                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Class 9          Class 11           JEE Mains       JEE Advanced   │
│  ──────────       ──────────         ─────────       ────────────   │
│  ┌─────────┐      ┌─────────┐       ┌─────────┐     ┌─────────┐    │
│  │ N3L     │─────▶│ N3L +   │──────▶│ Pseudo  │────▶│ Variable│    │
│  │ Basic   │      │ Systems │       │ Forces  │     │ Mass    │    │
│  │ Pairs   │      │ FBD     │       │         │     │ Systems │    │
│  └─────────┘      └─────────┘       └─────────┘     └─────────┘    │
│       │                │                  │               │         │
│       ▼                ▼                  ▼               ▼         │
│  Prerequisites    Prerequisites     Prerequisites   Prerequisites   │
│  - None           - F1 complete     - Class 11     - JEE Mains     │
│                   - Horse-cart      - Multi-body   - Rotating      │
│                     resolved                         frames        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Implementation**: `lib/curriculum/conceptEvolution.ts`

### 6.5 Curriculum Auditing

Automated pedagogical integrity checks:

| Check | Severity | Description |
|-------|----------|-------------|
| Explanation over Inquiry | High | Detects telling vs. asking ratio imbalance |
| Formula Leakage | Critical | Prevents premature equation reveal |
| Hint Dependency | Medium | Warns when progression requires hints |
| Difficulty Calibration | High | Validates F1/F2 constraints |
| Fading Balance | Low | Ensures scaffold withdrawal is gradual |

**Implementation**: `lib/curriculum/curriculumAudit.ts`

---

## 7. Adaptive Learning Architecture

### 7.1 Confidence-Weighted SRS

```
┌─────────────────────────────────────────────────────────────┐
│                 Confidence × Correctness Matrix             │
├───────────────┬─────────────┬─────────────┬────────────────┤
│               │   Correct   │   Correct   │    Wrong       │
│               │   + Solid   │   + Guess   │   + Solid      │
├───────────────┼─────────────┼─────────────┼────────────────┤
│ Scheduling    │ Accelerated │ Sooner      │ Aggressive     │
│               │ (mastery)   │ (lucky)     │ (misconception)│
├───────────────┼─────────────┼─────────────┼────────────────┤
│ Interval      │ × 2.5       │ × 1.2       │ ÷ 3           │
│ Multiplier    │             │             │                │
└───────────────┴─────────────┴─────────────┴────────────────┘
```

**Implementation**: `lib/confidenceWeightedSRS.ts`

### 7.2 Cognitive Load Governor

Monitors session metrics and adjusts UI complexity:

```
Inputs:
  - timeSpentPerStep
  - wrongAttempts
  - hintEscalationSpeed
  - revealUsed
  - circuitBreakerState

When cognitiveLoadScore = 'high':
  - Show only ONE active step
  - Collapse future steps
  - Reduce MCQs to binary
  - Shorten hint text
```

**Implementation**: `lib/cognitiveLoadService.ts`

### 7.3 Adaptive Preflight Gating

Risk-based preflight checks before high-probability-of-error steps:

```
riskScore = weighted_average(
  mistakeNotebook.getSeverity(concept),
  mistakeTracking.getStruggleRate(pattern),
  conceptMastery.getMasteryScore(concept)
)

if (riskScore > 0.55) {
  triggerPreflightCheck()
}
```

**Implementation**: `lib/adaptivePreflightService.ts`

---

## 7. Physics-Specific Architecture

### 7.1 Constraint Collision Engine

Real-time detection of physics law violations:

```
┌─────────────────────────────────────────────────────────────┐
│                 Constraint Collision Flow                   │
│                                                             │
│  Problem Text ──▶ Constraint Extractor ──▶ Constraint Set  │
│                                                             │
│  Student Work ──▶ Collision Detector ──▶ Violations?       │
│                         │                     │             │
│                         │              ┌──────┴──────┐      │
│                         │              │             │      │
│                         ▼              ▼             ▼      │
│                    No Violations    Soft        Critical   │
│                         │           Warning      Block     │
│                         │              │             │      │
│                         ▼              ▼             ▼      │
│                      Continue     Show Hint    Socratic    │
│                                                Dialogue    │
└─────────────────────────────────────────────────────────────┘
```

**Constraint Categories**:
- Friction: frictionless, rough, kinetic/static coefficients
- Momentum: elastic/inelastic collisions
- Energy: conservative/non-conservative forces
- Forces: massless, rigid, inextensible

**Implementation**: `lib/constraintCollisionEngine.ts`, `lib/constraintExtractor.ts`

### 7.2 Pattern Registry

27 physics problem-solving patterns organized hierarchically:

```
data/studyPlanV2/patterns.json
├── mechanics/
│   ├── newton-incline
│   ├── newton-pulley
│   ├── energy-conservation
│   ├── momentum-collision
│   └── ...
├── thermodynamics/
│   ├── ideal-gas
│   ├── heat-transfer
│   └── ...
├── electromagnetism/
│   ├── coulomb-field
│   ├── circuit-analysis
│   └── ...
└── ...
```

---

## 8. Client Architecture

### 8.1 Component Hierarchy

```
app/
├── layout.tsx                 # Root layout
├── page.tsx                   # Home (redirects based on Dashboard v3)
├── solve/page.tsx             # Solver page
├── study-path/page.tsx        # Dashboard
└── pattern-track/page.tsx     # Pattern learning

components/
├── shell/
│   ├── AppShell.tsx           # Main layout wrapper
│   ├── Sidebar.tsx            # Desktop navigation
│   └── BottomNav.tsx          # Mobile navigation
│
├── solve/
│   ├── SolvePage.tsx          # Main solver entry
│   ├── SolutionScaffold.tsx   # Scaffold renderer
│   ├── StepAccordion.tsx      # Step UI
│   └── StepContent.tsx        # Step details
│
├── dashboard/
│   ├── DashboardV3.tsx        # Dashboard container
│   ├── ProgressOverview.tsx   # Hero metrics
│   └── TodaysFocus.tsx        # Daily plan
│
├── micro-tasks/
│   ├── MicroTaskRenderer.tsx  # Task display
│   ├── MCQTask.tsx            # Multiple choice
│   └── FillBlankTask.tsx      # Fill in blank
│
└── modals/
    ├── PatternFirstModal.tsx  # Pattern gate
    ├── SkipCommitGateModal.tsx # Triage gate
    └── ConceptContrastModal.tsx # Concept challenge
```

### 8.2 State Management

| State Type | Storage | Sync |
|------------|---------|------|
| UI State | React useState/useReducer | N/A |
| Session | localStorage | On mount |
| Problem History | localStorage + API | Periodic sync |
| User Progress | Database (Prisma) | On action |
| Feature Flags | Environment variables | Build time |

---

## 9. Deployment Architecture

### 9.1 Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Edge Network                      │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐       │   │
│  │  │  Static   │  │   SSR     │  │   API     │       │   │
│  │  │  Assets   │  │  Pages    │  │  Routes   │       │   │
│  │  └───────────┘  └───────────┘  └───────────┘       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Neon      │       │ Vercel KV   │       │  Anthropic  │
│ PostgreSQL  │       │   (Redis)   │       │   Claude    │
│ (Serverless)│       │             │       │     API     │
└─────────────┘       └─────────────┘       └─────────────┘
```

### 9.2 Environment Configuration

| Environment | DATABASE_URL | Features |
|-------------|--------------|----------|
| Development | Local or Neon dev | All flags ON |
| Preview | Neon preview branch | All flags ON |
| Production | Neon production | Configured via env |

---

## 10. Invariants (NON-NEGOTIABLE)

### Data Integrity

1. **Raw extractions are immutable** - `RawExtraction.rawLatex` MUST NEVER be modified after creation
2. **Question IDs are stable** - `Question.questionId` MUST NOT be reused after deletion
3. **Edge direction is semantic** - `harder` edge from A→B means B is harder than A

### User Safety

4. **Only approved questions reach users** - All selection algorithms MUST filter by `lifecycleState = 'approved'`
5. **AI never publishes directly** - AI-generated content goes to `draft`, requires human review

### Progression Logic

6. **Completion is explicit** - A question is "completed" only when all scaffold steps are done + sanity check passed
7. **Prerequisites are absolute** - If edge type is `prerequisite`, source question MUST be completed before destination

### AI Controls

8. **AI quotas are per-user-per-day** - No unlimited AI usage; quotas reset at midnight UTC
9. **AI provenance is tracked** - Every AI-generated question has `isAiGenerated = true` with model and timestamp

---

## 11. Scalability Considerations

### Current Design Limits

| Component | Current Limit | Scaling Path |
|-----------|---------------|--------------|
| Scaffold generation | ~20s latency | Precomputation, caching |
| Database connections | Neon pooler limits | Connection pooling |
| AI API calls | Anthropic rate limits | Queuing, batching |
| Redis cache | Vercel KV limits | Cache eviction policies |

### Precomputation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   Precompute Pipeline                       │
│                                                             │
│  Question Added ──▶ PrecomputeJob Queue                    │
│                           │                                 │
│         ┌─────────────────┼─────────────────┐              │
│         │                 │                 │              │
│         ▼                 ▼                 ▼              │
│   Scaffold Outline   Step Expansions   Concept Contrasts   │
│   (Phase A cache)    (Phase B cache)   (Distractor cache)  │
│                                                             │
│  Status: pending → generating → completed → invalidated    │
└─────────────────────────────────────────────────────────────┘
```

**Implementation**: `precompute_jobs` table, background workers

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-06 | Initial domain model and invariants |
| 2.0 | 2026-01-09 | Complete architecture rewrite with full system coverage |
