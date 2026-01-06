# PhysiScaffold — User Guide

This guide walks you through using PhysiScaffold to solve physics problems from start to finish.

---

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
3. You'll land on the main problem-solving interface

---

## Solving a Problem

### Step 1: Enter Your Problem

1. Locate the **problem input area** on the main page
2. Type or paste your physics problem text
3. Example input:
   ```
   A 2 kg block is released from rest on a 30° rough incline.
   The coefficient of kinetic friction is μk = 0.20.
   Take g = 10 m/s². Find the block's acceleration.
   ```
4. Click **"Generate Scaffold"** (or press Enter)

### Step 2: Wait for Scaffold Generation

- A loading indicator appears while the AI processes your problem
- This typically takes 5-10 seconds
- The scaffold (Solution Roadmap) will appear when ready

### Step 3: Review the Solution Roadmap

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

### Step 4: Complete Each Step

For each step:

1. **Read the prompt** — Understand what the step is asking
2. **Complete the micro-task**:
   - **MCQ**: Select the correct option
   - **Fill-in-blank**: Type your answer
   - **Open response**: Write your reasoning
3. **Submit** your answer
4. **Receive feedback** — Correct or try again

**Example interaction:**

```
Prompt: "List all forces acting on the block."

Your input: "Weight mg downward, normal force N perpendicular
to incline, friction fk up the incline opposing motion."

System: ✓ Correct! Moving to next step...
```

### Step 5: Professor Check-In (Socratic Tutor)

After completing certain steps, the **Professor Check-In** appears:

1. A chat panel opens with a conceptual question
2. Example: "Why is friction directed up the incline here?"
3. Type your explanation in natural language
4. The tutor validates your understanding
5. If correct, you advance to the next step

**Example response:**
```
"Kinetic friction opposes relative motion. Since the block
slides down, friction acts up the incline to oppose it."
```

### Step 6: Complete the Sanity Check

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

### Step 7: Problem Completed

After the sanity check:

1. Problem is marked as **Solved**
2. Celebration feedback may appear
3. You can review your solution or start a new problem

---

## Using the Concept Inventory

The **right panel** displays helpful information:

- **Formulas**: Relevant equations for the problem
- **Definitions**: Key physics concepts
- **Diagrams**: Visual aids (when available)

Use this as a reference while solving — it updates based on the current step.

---

## Using Hints

If you're stuck on a step:

1. Click the **"Show Hint"** button
2. A hint appears below the prompt
3. Hints become more specific if you request more
4. Try to solve with minimal hints for best learning

**Hint progression example:**
- Hint 1: "Think about what forces act on the block"
- Hint 2: "Consider components parallel and perpendicular to the incline"
- Hint 3: "The parallel component of weight is mg sin(θ)"

---

## Pattern-First Mode (Optional)

If enabled, before solving you'll see a **pattern identification** modal:

1. A timer starts (typically 30-60 seconds)
2. Read the problem quickly
3. Select the problem pattern from options:
   - Newton's Laws — Inclined Plane
   - Energy Conservation
   - Momentum
   - etc.
4. Your selection is recorded for learning analytics

---

## Skip-or-Commit Gate (Optional)

If enabled, at T=25 seconds a decision modal appears:

1. **Commit**: Continue solving this problem
2. **Skip**: Move to a different problem

This trains exam triage skills — deciding quickly whether to invest time.

---

## Viewing Problem History

Access your problem history at `/history`:

| Status | Meaning |
|--------|---------|
| **Solved** | Completed successfully |
| **In Progress** | Started but not finished |
| **Skipped** | Chose to skip |

Click any problem to:
- **Resume** (if in progress)
- **Review** (if solved)
- **Retry** (start fresh)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit answer |
| `Tab` | Move to next input |
| `Shift+Tab` | Move to previous input |
| `H` | Show hint (when focused on step) |

---

## Tips for Effective Learning

### Do:
- **Read the problem twice** before generating scaffold
- **Use hints sparingly** — struggle improves retention
- **Complete sanity checks honestly** — they catch errors
- **Review mistakes** in the Mistake Notebook

### Don't:
- Rush through steps without understanding
- Skip the Professor Check-In responses
- Ignore limiting case analysis
- Leave problems in "In Progress" state

---

## Troubleshooting

### Scaffold won't generate
- Check internet connection
- Verify problem text is clear physics question
- Check for quota limits (if applicable)

### Step won't accept my answer
- Ensure you've filled all required fields
- Check for typos in numerical answers
- Try rephrasing conceptual responses

### Tutor chat not appearing
- Verify `NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR=true`
- Ensure the step was actually completed

### Progress lost after refresh
- Check browser allows LocalStorage
- Clear site data may reset progress
- Draft autosave runs every 30 seconds

### LaTeX/math not rendering
- Hard refresh the page (Ctrl+Shift+R)
- Check browser console for KaTeX errors

---

## Sample Problem Walkthrough

**Problem**: A 5 kg block slides down a frictionless 30° incline. Find acceleration.

| Step | Your Input | Expected Outcome |
|------|------------|------------------|
| 1. Identify forces | "Weight mg down, Normal force N perpendicular to surface" | ✓ Advances |
| 2. Resolve weight | "mg sin30° = 25 N parallel, mg cos30° ≈ 43.3 N perpendicular" | ✓ Advances |
| 3. Normal force | "N = mg cos30° ≈ 43.3 N" | ✓ Advances |
| 4. Apply F=ma | "mg sin30° = ma, so a = g sin30°" | ✓ Advances |
| 5. Calculate | "a = 10 × 0.5 = 5 m/s²" | ✓ Advances |
| 6. Sanity check | "Less than g, direction is down incline, units correct" | ✓ Solved |

---

## Getting Help

- Check the [README](../README.md) for setup issues
- Review [FEATURES.md](./FEATURES.md) for feature details
- Use [QA_HAPPY_PATH_E2E.md](./QA_HAPPY_PATH_E2E.md) for testing scenarios
