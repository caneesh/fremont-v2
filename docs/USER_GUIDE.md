# PhysiScaffold - User Guide

This guide walks you through using PhysiScaffold to solve physics problems from start to finish.

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (required for AI features)
- Pilot code (if authentication is enabled)

### Accessing the App

1. Open your browser and navigate to the app URL:
   - Local development: `http://localhost:3000`
   - Production: Your deployed URL
2. If prompted, enter your pilot code
3. With Dashboard v3 enabled (default), you'll land on the Study Path dashboard
4. Without Dashboard v3, you'll land directly on the solver interface

## Navigation

### With Dashboard v3 (Default)

The application uses a unified shell layout:

- **Desktop**: Sidebar + TopBar navigation
- **Mobile**: Bottom navigation bar with 4 items + More menu

**Main Routes:**

| Route | Description |
|-------|-------------|
| `/study-path` | Dashboard with daily plan and progress |
| `/solve` | Main problem-solving interface |
| `/pattern-track` | Pattern learning and practice |
| `/mistake-notebook` | Spaced repetition review |
| `/history` | Problem attempt history |
| `/drills/[patternId]` | Drill practice sessions |

### Without Dashboard v3

The home page (`/`) renders the solver directly.

## Solving a Problem

### Step 1: Enter Your Problem

**From Dashboard:**
1. Click "New Problem" or navigate to `/solve`
2. Locate the **problem input area**
3. Type or paste your physics problem text

**Example input:**
```
A 2 kg block is released from rest on a 30° rough incline.
The coefficient of kinetic friction is μk = 0.20.
Take g = 10 m/s². Find the block's acceleration.
```

4. Click **"Generate Solution Scaffold"** (or press Enter)

**Alternatively:**
- Select a sample problem from the "Sample Problems" buttons
- The problem text auto-fills into the input area

### Step 2: Pattern-First Gate (if enabled)

When `PATTERN_FIRST_MODE` is enabled:

1. A modal appears with a 12-second timer
2. Read the problem quickly
3. Select the problem pattern from options (e.g., "Newton's Laws - Inclined Plane")
4. Your selection is recorded for learning analytics
5. Scaffold generation proceeds after selection or timeout

### Step 3: Wait for Scaffold Generation

- A loading indicator appears while the AI processes your problem
- Phase A (outline) typically takes 10-20 seconds
- The **Solution Roadmap** appears when ready

### Step 4: Skip-or-Commit Gate (if enabled)

When `SKIP_COMMIT_GATE` is enabled:

1. At T=25 seconds, a decision modal appears
2. Choose:
   - **Commit**: Continue solving this problem
   - **Skip**: Move to a different problem (no penalty)
3. Auto-commits after 8 seconds if no selection
4. Trains exam triage skills

### Step 5: Review the Solution Roadmap

The scaffold appears as an **accordion** with numbered steps:

```
Step 1: Identify forces on the block          ● Active
Step 2: Resolve weight into components        ○ Locked
Step 3: Compute the normal force              ○ Locked
Step 4: Compute kinetic friction              ○ Locked
Step 5: Apply Newton's 2nd Law                ○ Locked
Step 6: Solve for acceleration                ○ Locked
Sanity Check                                  ○ Locked
```

- **Active step (●)**: Currently working on
- **Locked steps (○)**: Complete previous steps first
- **Completed steps (✓)**: Already finished

### Step 6: Complete Each Step

When you expand a step:

1. **Read the goal/prompt** - Understand what the step asks
2. **Complete micro-tasks** (if present):
   - **MCQ**: Select the correct option
   - **Fill-in-blank**: Type your answer
3. **Submit** your answer
4. **Receive feedback**:
   - Correct: Step advances with celebration
   - Wrong: Targeted feedback with reasoning

**Step Interaction Flow (Socratic-First Mode):**

1. Step opens with a thinking prompt: "What's your approach?"
2. You answer and rate your confidence (guess/okay/solid)
3. AI verifies and guides with follow-up questions
4. If stuck: Hint ladder with Socratic verification per hint

### Step 7: Warm-Up Protocol (if enabled)

When `WARMUP_PROTOCOL` is enabled:

1. Before main study session, 2-5 minute micro-drills appear
2. Drills focus on rusty patterns (decay-based selection)
3. Each drill has a 20-second time limit
4. Skip option available once per day (with mastery penalty)
5. Must complete or skip to access dashboard

### Step 8: Pivot Injection (if enabled)

When `PIVOT_INJECTION` is enabled and you're stuck:

1. After threshold time (90-180s) or multiple wrong attempts
2. A pivot question appears to help reframe thinking
3. Categories: Simplify, Analogy, Constraint, Decompose, Visualize, Reverse
4. Answer the pivot or skip to continue

### Step 9: Professor Check-In (Socratic Tutor)

After completing certain steps, the **Socratic Tutor** chat appears:

1. A chat panel opens with a conceptual "why" question
2. Example: "Why is friction directed up the incline here?"
3. Type your explanation in natural language
4. The tutor validates your understanding:
   - If correct: Celebration and advance to next step
   - If struggling: Dynamic Socratic dialogue until understanding

**Example response:**
```
"Kinetic friction opposes relative motion. Since the block
slides down, friction acts up the incline to oppose it."
```

### Step 10: Using Hints

If you're stuck on a step:

1. Click **"Show Hint"** button
2. Hints are progressive (5 levels):
   - Level 1: Concept Identification
   - Level 2: Visualization
   - Level 3: Strategy Selection
   - Level 4: Structural Equation
   - Level 5: Full Solution (Reveal)
3. Try to solve with minimal hints for best learning

**Feynman Hint Prompts (if enabled):**
- Before unlocking Level 3+ hints, you must explain the concept
- This ensures understanding before getting computational help

### Step 11: Rate Your Confidence

After completing a step (when Confidence-Weighted SRS is enabled):

1. A prompt asks: "How confident are you?"
2. Options: **Guess** / **Okay** / **Solid**
3. Your rating affects spaced repetition scheduling:
   - Correct + High confidence = accelerated review (mastery)
   - Correct + Low confidence = sooner review (lucky guess)
   - Wrong + High confidence = aggressive review (misconception)

### Step 12: Complete Sanity Check

The final step validates your answer:

1. **Limiting cases**: What happens at extreme values?
2. **Dimensional analysis**: Are units correct?
3. **Reasonableness**: Does the magnitude make sense?

**Example sanity check response:**
```
"If friction were zero, a = g sin(30°) = 5 m/s².
With friction, acceleration should be less, so 3.27 m/s²
is reasonable. Units are m/s² — correct for acceleration."
```

### Step 13: Problem Completed

After the sanity check:

1. Problem is marked as **Solved**
2. Celebration feedback appears
3. Options:
   - Start a new problem
   - Review your solution
   - Return to dashboard
4. Progress stored in history

## Using the Concept Inventory Panel

The **right panel** displays contextual information:

- **Formulas**: Relevant equations for the current problem
- **Definitions**: Key physics concepts
- **Diagrams**: Visual aids (when available)
- **Constraints**: Problem constraints highlighted

Use this as a reference while solving - it updates based on the current step.

## Viewing Problem History

Access your problem history at `/history`:

| Status | Meaning |
|--------|---------|
| **Solved** | Completed successfully |
| **In Progress** | Started but not finished |
| **Skipped** | Chose to skip |
| **Revealed** | Used full solution reveal |
| **Abandoned** | Left without completing |

Click any problem to:
- **Resume** (if in progress)
- **Review** (if solved)
- **Retry** (start fresh)

## Using the Mistake Notebook

Access at `/mistake-notebook`:

1. View tracked mistakes from problem-solving sessions
2. Mistakes categorized by:
   - Error type (conceptual, calculation, sign, etc.)
   - Pattern/topic
   - Severity
3. Review cards with spaced repetition scheduling
4. Cards scheduled based on last review and confidence

## Pattern Track (Study Plan v2)

Access at `/pattern-track` or `/study-path`:

### Curriculum Structure
- **Tracks**: Foundation1 → Foundation2 → Intermediate → Competitive
- **Patterns**: 27 physics problem-solving patterns
- **Meta-skills**: Higher-order thinking skills

### Features
- View pattern progress and mastery levels
- Access lessons for each pattern
- Practice mode with pattern-specific questions
- Track streaks and daily activity

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit answer |
| `Tab` | Move to next input |
| `Shift+Tab` | Move to previous input |

## Tips for Effective Learning

### Do:
- **Read the problem twice** before generating scaffold
- **Use hints sparingly** - struggle improves retention
- **Complete sanity checks honestly** - they catch errors
- **Rate confidence accurately** - honest self-assessment helps SRS
- **Review mistakes** in the Mistake Notebook regularly
- **Complete warm-ups** - they prime pattern recognition

### Don't:
- Rush through steps without understanding
- Skip Professor Check-In responses
- Ignore limiting case analysis
- Leave problems in "In Progress" state
- Always reveal full solutions (builds dependency)

## Interactive Features

### Boundary Case Builder

When enabled (`BOUNDARY_CASE_BUILDER`):

1. Available after deriving an equation
2. Stress-test by setting variables to limits (θ→0°, m→∞)
3. Verify behavior matches physical intuition
4. Builds equation validation skills

### Concept Contrast Challenge

When enabled (`CONCEPT_CONTRAST`):

1. Triggers on steps with key physics concepts
2. Challenges you to explain why similar concepts don't apply
3. Example: "Why not use energy conservation here?"
4. Forces deep understanding through differentiation

### Paper Solution Upload

When enabled (`PAPER_SOLUTION_UPLOAD`):

1. Click "Upload Solution" button
2. Take a photo of your handwritten work
3. OCR extracts your solution via Claude Vision
4. AI analyzes against rubrics
5. Receive feedback on your handwritten solution

### Constraint Highlight

When enabled (`CONSTRAINT_HIGHLIGHT`):

1. After a wrong answer, constraint keywords highlight in problem
2. Keywords: frictionless, massless, elastic, rigid, etc.
3. Helps notice what you may have missed
4. Requires acknowledgment before continuing

### Socratic Rewind

When stuck:

1. Click "I'm stuck" or use rewind button
2. System rewinds to earlier step
3. Socratic questions guide you to re-examine
4. Helps recover from errors without revealing answer

## Troubleshooting

### Scaffold won't generate
- Check internet connection
- Verify problem text is a clear physics question
- Check for API quota limits (if applicable)
- Look for errors in browser console

### Step won't accept my answer
- Ensure all required fields are filled
- Check for typos in numerical answers
- Try rephrasing conceptual responses
- Verify units are included where expected

### Tutor chat not appearing
- Verify `NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR=true`
- Ensure the step was actually completed (not just expanded)
- Check browser console for errors

### Progress lost after refresh
- Check browser allows localStorage
- Draft autosave runs every 30 seconds
- Clear site data may reset progress
- Consider using database-backed progress (requires account)

### LaTeX/math not rendering
- Hard refresh the page (Ctrl+Shift+R)
- Check browser console for KaTeX errors
- Ensure JavaScript is enabled

### Warm-up won't complete
- Each drill has 20s time limit
- Must answer all drills in block
- Skip option available once per day

## Getting Help

- Check the [README](../README.md) for setup issues
- Review [FEATURES.md](./FEATURES.md) for feature details
- Use [TESTING_GUIDE.md](./TESTING_GUIDE.md) for test scenarios
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
