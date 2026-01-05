# PhysiScaffold - Implemented Features

A comprehensive intelligent tutoring system for IIT-JEE Physics problem-solving.

---

## Table of Contents

1. [Core Learning Features](#1-core-learning-features)
2. [Intelligent Tutoring Systems](#2-intelligent-tutoring-systems)
3. [Personalization & Adaptive Learning](#3-personalization--adaptive-learning)
4. [Interactive Features & UX](#4-interactive-features--ux)
5. [Database & Data Management](#5-database--data-management)
6. [Authentication & Access Control](#6-authentication--access-control)
7. [API Endpoints](#7-api-endpoints)
8. [Specialized Systems](#8-specialized-systems)
9. [Analytics & Monitoring](#9-analytics--monitoring)
10. [Feature Flags](#10-feature-flags)
11. [Tech Stack](#11-tech-stack)

---

## 1. Core Learning Features

### Scaffolded Problem Solving
- **Step-by-step guided solutions** with 5 progressive hint levels
- **Adaptive scaffold density** - adjusts granularity based on user needs
- **Physics domain classification** - Mechanics, Thermodynamics, Optics, etc.
- **Multi-step navigation** with completion tracking

**Hint Levels:**
| Level | Name | Description |
|-------|------|-------------|
| 1 | Concept Identification | Identify key physics principles |
| 2 | Visualization | Visual understanding and diagrams |
| 3 | Strategy Selection | Problem-solving approach |
| 4 | Structural Equation | Mathematical setup |
| 5 | Full Solution | Complete answer |

### Active Learning & Micro-Tasks
- **MCQ-style comprehension checks** at each step
- **Fill-in-the-blank problems**
- **Task-based hint unlocking** - must complete micro-tasks before revealing higher hints

### Interactive Explanation Modes

#### Feynman Technique
- Requires students to explain concepts in their own words
- Validates understanding before unlocking advanced hints
- Scoring and feedback on explanation quality

#### Explain to Friend
- Breaks down complex concepts into simple language
- Conversational explanation generation

#### Paper Solution Upload
- Upload handwritten solution photos
- Claude Vision-based OCR extraction
- Solution analysis and feedback against rubrics

---

## 2. Intelligent Tutoring Systems

### Socratic Teaching Method
- **Live chat interface** with AI tutor (Professor Socrates)
- **Comprehension check questions** after each step
- **Dynamic dialogue-based teaching**
- **Hint verification system**
- **Socratic Rewind** - step back and re-examine earlier steps

### Concept Management
- **Concept Network Visualization** - interactive graph of physics concepts
- **Concept Contrast Challenge** - explain why similar concepts don't apply
- **Concept Mapping Service** - tracks relationships and dependencies

### Constraint & Physics Understanding
- **Constraint Collision Engine** - real-time detection of violations (e.g., ignoring friction)
- **Constraint extraction** from problem context
- **Socratic dialogue guidance** for corrections
- **Implication-based rules** for physical laws

### Boundary Case & Sanity Checking
- **Boundary Case Builder** - stress test equations with limiting cases (θ → 0°, m → ∞)
- **Sanity Check Matrix:**
  - Limit checks (extreme value analysis)
  - Symmetry checks
  - Dimensional analysis

---

## 3. Personalization & Adaptive Learning

### Study Plans & Learning Paths

#### Study Path v2: Pattern-First Learning
- Meta-skills based curriculum
- Pattern tracks (core problem-solving patterns)
- Error recycling loop (mistake → pattern → fix)
- Confidence-weighted spaced repetition

#### Study Path v1: Topic-Based
- Traditional topic organization
- Hierarchical navigation

### Pattern Tracking
- Pattern-based problem organization
- Pattern mastery tracking
- Pattern-specific lessons and practice modes
- Pattern-to-question mapping

### Mistake & Error Management

#### Mistake Notebook
- Track recurring mistakes
- Spaced repetition scheduling (SRS)
- Error severity classification
- Card-based review system

#### Error Pattern Detection
- Identify systematic mistakes
- Misconception flag system
- Error watchlist visualization

#### Error Anticipator
- Proactive warning beacons for common traps
- Mistake prediction at step level
- Non-spoilery guidance

### Cognitive Load Management

#### Adaptive Preflight Gating
- Auto-insert preflight checks on high-risk steps
- Risk scoring based on:
  - Mistake history
  - Concept mastery levels
  - Recency of errors

#### Phased Scaffold Loading
| Phase | Content | Load Time |
|-------|---------|-----------|
| A | Outline (step list only) | ~10-20s |
| B | Step Expansion (on-demand) | As needed |
| C | Final Solve (optional) | On request |

### Confidence & Performance Tracking
- **Confidence Rating** - post-answer self-assessment
- **Confidence-Weighted SRS** - accelerated review based on confidence × correctness
- **Step Heatmap** - visual confidence distribution

---

## 4. Interactive Features & UX

### Solution Input & Validation
- Structured problem entry
- Step-by-step input with real-time validation
- Multi-format answer submission
- LaTeX equation input

### Visual & Interactive Tools
- **Free Body Diagram Canvas** - interactive force diagram drawing
- **Concept Panel** - quick reference cards
- **MathRenderer** - LaTeX rendering with help docs

### Navigation & UI
- **Dashboard v3** - unified navigation with hero metrics
- **Bottom Navigation** - mobile-optimized
- **Today's Plan** visualization
- **Task Picker Modal**

### Audio & Voice
- Speech-to-text for problem description
- Audio feedback components

### Modals & Dialogs
- Pre-Flight Check Modal
- Repair Mode Modal
- Decision Gate Modal
- Pattern Picker Modal

---

## 5. Database & Data Management

### PostgreSQL Schema (via Neon)

| Table | Purpose |
|-------|---------|
| `Questions` | Problem storage with JSONB payload, lifecycle states |
| `QuestionEdges` | Relationships (prerequisite, variation, harder, easier) |
| `QuestionTags` | Normalized tags (topics, patterns, meta-skills, traps) |
| `UserQuestionHistory` | Attempts, outcomes, progress snapshots |
| `UserAIQuota` | Feature-based quota tracking |
| `Patterns` | Problem-solving patterns |
| `Topics` | Hierarchical topic organization |
| `AIGenerationLog` | Audit trail for AI calls, token/cost tracking |

### Database Seeding
- Sample questions for testing
- Pattern and topic hierarchy
- Default configuration

---

## 6. Authentication & Access Control

### Pilot Authentication
- 10 pilot access codes (PILOT-ALPHA-001 through 010)
- Session management in localStorage
- Login/logout functionality

### Quota System

**Daily Limits:**
| Feature | Limit |
|---------|-------|
| Problem Scaffolds | 5 |
| Hint Generations | 10 |
| Prerequisite Checks | 2 |
| Reflections | 2 |
| Problem Variations | 2 |

- Auto-reset at midnight
- Server-side quota enforcement
- Cost estimation per call

---

## 7. API Endpoints

### Problem Solving & Scaffolding
| Endpoint | Description |
|----------|-------------|
| `/api/solve` | Generate problem scaffold |
| `/api/solve/final` | Final solution submission |
| `/api/scaffold/outline` | Outline-only scaffold (phased) |
| `/api/scaffold/step` | Step content expansion |
| `/api/scaffold/step/explain` | Step explanation |
| `/api/scaffold/hint` | Hint generation |

### Analysis & Feedback
| Endpoint | Description |
|----------|-------------|
| `/api/analyze-error` | Error analysis |
| `/api/repair` | Solution repair guidance |
| `/api/verify-reasoning` | Reasoning verification |
| `/api/grade-solution` | Solution grading |

### Interactive Features
| Endpoint | Description |
|----------|-------------|
| `/api/prerequisites` | Prerequisite checks |
| `/api/reflection` | Reflection questions |
| `/api/variations` | Problem variations |
| `/api/step-up` | Step-up challenges |
| `/api/concept-contrast` | Concept comparison |
| `/api/explain-to-friend` | Simple explanations |

### Special Modes
| Endpoint | Description |
|----------|-------------|
| `/api/spot-mistake/*` | Spot the mistake mode |
| `/api/feynman-validate` | Validate Feynman explanations |
| `/api/paper-solution/*` | Handwritten solution analysis |
| `/api/socratic-tutor/*` | Socratic tutoring |
| `/api/socratic-rewind` | Rewind Socratic session |

### Pattern & Learning
| Endpoint | Description |
|----------|-------------|
| `/api/pattern-track/patterns` | Pattern management |
| `/api/pattern-track/questions` | Pattern-specific questions |
| `/api/pattern-track/lessons` | Pattern lessons |
| `/api/pattern-track/practice` | Practice mode |
| `/api/pattern-track/progress` | Progress tracking |
| `/api/study-path/*` | Study path management |

---

## 8. Specialized Systems

### Interview Mode
- Timed exam mode for formal assessment
- Explanation scoring via rubrics
- Performance grading
- Session persistence
- Clean architecture implementation

### Question Engine
- Question selection algorithm
- Fingerprinting system for similarity detection
- KV store integration for caching
- Anthropic adapter for AI generation

### Drill System
- Problem classification and categorization
- Difficulty scaling
- Drill player with results visualization

### Policy Engines
- **Gating Policy** - feature availability based on eligibility
- **Session Mode Policy** - exam vs. practice mode rules
- **Recovery Mode Policy** - error recovery strategies
- **Circuit Breaker** - API failure handling

---

## 9. Analytics & Monitoring

### Dashboard Analytics
- Hero metrics and KPIs
- Progress visualization
- Independence metrics
- Daily debrief generation

### Event Logging
Events tracked:
- Problem lifecycle (started, saved, solved)
- Step events (activated, completed, failed)
- Hint events (unlocked, viewed)
- Micro-task events (attempted, correct, incorrect)
- Reading mode tracking
- Sanity check completion
- Error logging

### AI Generation Monitoring
- Token usage tracking
- Cost estimation per call
- Model performance tracking
- Latency monitoring

---

## 10. Feature Flags

| Flag | Status | Description |
|------|--------|-------------|
| `MICRO_TASKS` | Enabled | Active learning MCQ/fill-in-blank |
| `MISTAKE_NOTEBOOK` | Enabled | Spaced repetition review |
| `ERROR_ANTICIPATOR` | Enabled | Common mistake warnings |
| `CONFIDENCE_WEIGHTED_SRS` | Enabled | Confidence-based scheduling |
| `BOUNDARY_CASE_BUILDER` | Enabled | Limiting case testing |
| `EQUATIONLESS_PATH` | Enabled | Verbal plan before algebra |
| `CONCEPT_CONTRAST` | Enabled | Concept differentiation |
| `FEYNMAN_HINT_PROMPTS` | Enabled | Conceptual explanation gating |
| `CONSTRAINT_COLLISION` | Enabled | Constraint violation detection |
| `PAPER_SOLUTION_UPLOAD` | Enabled | Handwritten solution analysis |
| `SOCRATIC_TUTOR_CHAT` | Enabled | Live Socratic tutor |
| `STUDY_PLAN_V2` | Enabled | Pattern-first curriculum |
| `ADAPTIVE_PREFLIGHT` | Enabled | Risk-based preflight gating |
| `WHY_THIS_STEP` | Enabled | Step purpose explanations |
| `STEP_HEATMAP` | Enabled | Confidence visualization |
| `FBD_CANVAS` | Disabled | Free body diagram tool |
| `PHASED_SCAFFOLD` | Disabled | 3-phase loading |

---

## 11. Tech Stack

### Core Framework
- Next.js 15.5.8
- React 18.3.1
- TypeScript 5.7.2

### Database & Storage
- PostgreSQL via Neon (serverless)
- Prisma 6.19.1
- Vercel KV (Redis)
- Vercel Blob (file storage)

### AI Integration
- Anthropic SDK 0.32.1

### Visualization
- ReactFlow 11.11.4 (concept graphs)
- KaTeX 0.16.11 (math rendering)

### Testing
- Vitest 4.0.16
- Playwright 1.57.0
- Testing Library

### Styling
- Tailwind CSS 3.4.17

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Pedagogical Features | 15+ |
| Interactive Modes | 8 |
| Study Systems | 4 |
| API Endpoints | 47 |
| Database Models | 8 |
| Feature Flags | 20 |
| UI Components | 100+ |
| Service Modules | 40+ |

---

*Last updated: January 2026*
