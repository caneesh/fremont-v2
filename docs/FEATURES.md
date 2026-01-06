# PhysiScaffold — Features

This document describes all currently available features and explicitly notes what is out of scope.

---

## Currently Available Features

### 1. Two-Pass AI Architecture

**What it does**: Uses a hidden solver pass to generate the correct solution internally, then a visible scaffolder pass to create guidance without revealing answers.

**Where it appears**: Backend processing during scaffold generation (`/api/scaffold/outline`, `/api/scaffold/step`)

**Success criteria**:
- Scaffold steps align with correct solution path
- No direct answers leak to the student
- Hints are contextually accurate

---

### 2. Problem Input & Scaffold Generation

**What it does**: Accepts physics problem text (typed or pasted) and generates a structured step-by-step solution scaffold.

**Where it appears**: Main page at `/` — problem input textarea and "Generate Scaffold" button

**Success criteria**:
- Scaffold appears within 5-10 seconds
- Steps are logically ordered
- Concept inventory populates in right panel

---

### 3. Solution Roadmap (Step Accordion)

**What it does**: Displays scaffold steps as an expandable accordion. Steps unlock progressively as the student completes each one.

**Where it appears**: Main solve interface — left/center panel

**Success criteria**:
- Only current step is interactive
- Completed steps show checkmark
- Locked steps are visually distinct

---

### 4. Micro-Task Mode

**What it does**: Breaks each step into micro-tasks: multiple-choice questions (MCQs) and fill-in-the-blank exercises instead of open-ended hints.

**Where it appears**: Within each accordion step when expanded

**Success criteria**:
- MCQs render with selectable options
- Fill-in-blanks accept text input
- Immediate feedback on submission

---

### 5. Socratic Tutor Chat (Professor Check-In)

**What it does**: After completing a step, an AI tutor asks a "why" question to validate conceptual understanding. Provides conversational guidance.

**Where it appears**: Chat panel that appears after step completion (when `NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR=true`)

**Success criteria**:
- Tutor question appears after step submission
- Accepts natural language responses
- Advances to next step after validation

---

### 6. Concept Inventory Panel

**What it does**: Displays relevant formulas, definitions, and explanations for the current problem in a right-side panel.

**Where it appears**: Right panel on the solve page

**Success criteria**:
- Concepts load with scaffold
- LaTeX formulas render correctly (KaTeX)
- Scrollable if content is long

---

### 7. Hint System

**What it does**: Provides progressive hints when students are stuck. Hints become more specific with each request.

**Where it appears**: "Show Hint" button within each step

**Success criteria**:
- Hints are contextual to current step
- Multiple hint levels available
- Does not directly reveal answer

---

### 8. Sanity Check Module

**What it does**: Final validation step that prompts students to verify their answer using limiting cases, dimensional analysis, and symmetry checks.

**Where it appears**: Final step of the scaffold flow

**Success criteria**:
- Prompts for reasonableness check
- Accepts qualitative reasoning
- Marks problem as complete after validation

---

### 9. Pattern-First Mode

**What it does**: Timed pattern identification phase before solving. Students must recognize the problem type within a time limit.

**Where it appears**: Modal that appears before scaffold generation (when `NEXT_PUBLIC_FEATURE_PATTERN_FIRST=true`)

**Success criteria**:
- Timer counts down from configured duration
- Pattern options are displayed
- Selection recorded before proceeding

---

### 10. Skip-or-Commit Gate

**What it does**: Forces triage decision at T=25 seconds — student must commit to solving or skip the problem. Trains exam strategy.

**Where it appears**: Modal overlay during solve (when `NEXT_PUBLIC_FEATURE_SKIP_COMMIT=true`)

**Success criteria**:
- Gate appears at configured time
- "Commit" continues solving
- "Skip" marks problem as skipped

---

### 11. Problem History & Progress Tracking

**What it does**: Tracks all problem attempts with status (in-progress, solved, skipped). Persists progress for resumption.

**Where it appears**: `/history` page and dashboard indicators

**Success criteria**:
- All attempts logged
- Status accurately reflects completion
- Resume works from last position

---

### 12. Draft Autosave

**What it does**: Automatically saves work every 30 seconds. Prevents data loss on browser close or refresh.

**Where it appears**: Background process during solve

**Success criteria**:
- No visible save action needed
- Progress restored on return
- Works across browser sessions

---

### 13. Mistake Notebook

**What it does**: Tracks errors made during problem-solving for targeted review later.

**Where it appears**: Accessible from history/review interface

**Success criteria**:
- Mistakes are captured automatically
- Categorized by error type
- Available for review sessions

---

### 14. Confidence-Weighted SRS

**What it does**: Spaced repetition system that adjusts review intervals based on self-reported confidence levels.

**Where it appears**: Study plan and review scheduling (when `NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS=true`)

**Success criteria**:
- Confidence prompt after completion
- Lower confidence = sooner review
- Intervals adjust over time

---

### 15. PDF Question Import

**What it does**: Extracts physics questions from PDF files (JEE, NEET, textbooks) using Claude Vision.

**Where it appears**:
- CLI: `npx ts-node scripts/pdf-to-questions.ts`
- API: `POST /api/questions/extract`

**Success criteria**:
- PDFs processed successfully
- Questions extracted with metadata
- Output in structured JSON format

---

### 16. Study Plan v2

**What it does**: Pattern-driven curriculum that organizes learning by problem patterns and meta-skills rather than topics alone.

**Where it appears**: `/study-plan` pages (when `NEXT_PUBLIC_FEATURE_STUDY_PLAN_V2=true`)

**Success criteria**:
- Patterns displayed with progress
- Skills tracked across problems
- Recommendations generated

---

## Out of Scope / Not Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| User authentication (production) | Partial | Pilot codes only; no full auth system |
| Cloud sync | Not implemented | LocalStorage only currently |
| Mobile-optimized UI | Not implemented | Desktop-first design |
| Offline mode | Not implemented | Requires internet for AI |
| Multi-language support | Not implemented | English only |
| Diagram drawing tool | Not implemented | Text descriptions only |
| Handwriting recognition | In progress | Paper solution upload experimental |
| Teacher/instructor dashboard | Planned | No class management |
| LMS integration | Planned | Canvas, Blackboard not connected |
| Multiplayer solving | Planned | Single-user only |

---

## Feature Flags Reference

```bash
# Core Features
NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR=true    # Professor Check-In chat
NEXT_PUBLIC_FEATURE_PATTERN_FIRST=true      # Pattern identification gate
NEXT_PUBLIC_FEATURE_SKIP_COMMIT=true        # Triage decision training
NEXT_PUBLIC_FEATURE_STUDY_PLAN_V2=true      # Pattern-driven study plan

# Learning Enhancements
NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS=true     # Confidence-weighted review
NEXT_PUBLIC_FEATURE_BOUNDARY_CASE=true      # Equation stress-testing
NEXT_PUBLIC_FEATURE_ADAPTIVE_PREFLIGHT=true # Auto-inserted checks
NEXT_PUBLIC_FEATURE_WHY_THIS_STEP=true      # Step importance explanations

# Experimental
NEXT_PUBLIC_FEATURE_PAPER_SOLUTION=true     # Upload handwritten solutions
NEXT_PUBLIC_FEATURE_CONSTRAINT_COLLISION=true # Real-time constraint checking
```
