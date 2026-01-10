# PhysiScaffold - Testing Guide

This guide provides QA testers with complete test scenarios, test data, and validation steps for PhysiScaffold.

## Preconditions

Before running tests, ensure:

1. **Environment**: Local or deployed build of PhysiScaffold
2. **Browser**: Clean profile (or clear site data)
3. **Authentication**: Login available with valid pilot code (use `DEV` if enabled)
4. **Quotas**: Daily quotas not exhausted
5. **Feature flags** (should be enabled for full testing):
   - Micro-task solving flow (default ON)
   - Socratic Tutor (`NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR` not `false`)
   - Pattern-First mode (optional, for that flow)
   - Skip-Commit gate (optional, for that flow)

## Test Data Setup

### Sample User Session
```javascript
localStorage.setItem('physiscaffold_session', JSON.stringify({
  userId: 'user-001',
  code: 'PILOT-ALPHA-001',
  authenticatedAt: new Date().toISOString(),
}))
```

### Sample Physics Problems

**Problem 1 - Inclined Plane with Friction (Medium)**
```
A 2 kg block is released from rest on a 30° rough incline. The coefficient of kinetic friction between the block and the plane is μk = 0.20. Take g = 10 m/s². Find the block's acceleration (magnitude and direction) immediately after release.
```
Expected answer: ~3.27 m/s² down the incline

**Problem 2 - Projectile Motion (Easy)**
```
A ball is thrown horizontally from a cliff 80 m high with an initial velocity of 20 m/s. Take g = 10 m/s². Find the time of flight and the horizontal distance traveled.
```
Expected answer: t = 4 s, horizontal distance = 80 m

**Problem 3 - Circular Motion (Medium)**
```
A small bead of mass 100g can slide without friction on a frictionless circular hoop of radius 0.5m that is rotating about a vertical axis. At what angular velocity will the bead rest at 30° from the vertical?
```
Expected answer: ω ≈ 5.27 rad/s

## Happy Path Test Scenario

This scenario covers the complete problem-solving flow using Problem 1.

### Phase 1: Start Problem

**Step 1.1: Navigate to Solver**

| Action | Expected Result |
|--------|-----------------|
| Open browser to app URL | Dashboard loads (if Dashboard v3 enabled) |
| Click "New Problem" or navigate to `/solve` | Solver page loads with problem input |

**Step 1.2: Enter Problem**

| Action | Expected Result |
|--------|-----------------|
| Paste Problem 1 text into input area | Text appears in textarea |
| Click "Generate Solution Scaffold" | Loading indicator appears |
| Wait 10-20 seconds | Solution Roadmap appears with steps |

**Validation:**
- [ ] Scaffold has 5-7 steps
- [ ] First step is active (●)
- [ ] Remaining steps are locked (○)
- [ ] Concept inventory panel populated on right

### Phase 2: Pattern-First Gate (if enabled)

| Action | Expected Result |
|--------|-----------------|
| Modal appears with timer | 12-second countdown visible |
| Select "Newton's Laws - Inclined Plane" | Selection highlighted |
| Click confirm or wait for timeout | Modal closes, scaffold generation continues |

**Validation:**
- [ ] Pattern options include relevant choices
- [ ] Timer counts down correctly
- [ ] Selection is recorded

### Phase 3: Skip-or-Commit Gate (if enabled)

| Action | Expected Result |
|--------|-----------------|
| At T=25s, modal appears | "Commit" and "Skip" buttons visible |
| Click "Commit" | Modal closes, solving continues |

**Alternative flow:**
| Action | Expected Result |
|--------|-----------------|
| Click "Skip" | Problem marked as skipped, returns to dashboard |

### Phase 4: Complete Step 1 - Identify Forces

**Step 4.1: Expand Step 1**

| Action | Expected Result |
|--------|-----------------|
| Click on Step 1 | Step expands showing prompt and micro-task |

**Prompt**: "List all forces acting on the block on the incline."

**Step 4.2: Complete Micro-Task**

| Input (copy-paste) |
|-------------------|
| `Forces: weight mg downward, normal force N perpendicular to the plane, kinetic friction fk along the plane opposing motion (up the plane since the block slides down).` |

| Action | Expected Result |
|--------|-----------------|
| Enter response | Input accepted |
| Submit | Feedback shown |

**Validation:**
- [ ] Step marked as completed (✓)
- [ ] Next step becomes active

### Phase 5: Professor Check-In (Step 1)

**Prompt**: "Why is friction directed up the incline here?"

**Input (copy-paste):**
```
Kinetic friction opposes relative motion at the contact. Since gravity makes the block move down the incline, friction acts up the incline to oppose that sliding motion.
```

| Action | Expected Result |
|--------|-----------------|
| Type response in chat | Input accepted |
| Submit | Tutor validates understanding |
| Wait for response | Celebration/confirmation shown |

**Validation:**
- [ ] Tutor acknowledges correct understanding
- [ ] Step 2 becomes active

### Phase 6: Complete Step 2 - Resolve Weight Components

**Prompt**: "Resolve mg into components parallel and perpendicular to the incline (use θ = 30°)."

**Input (copy-paste):**
```
Parallel: mg sinθ = 2*10*sin30° = 20*0.5 = 10 N (down the plane).
Perpendicular: mg cosθ = 2*10*cos30° ≈ 20*0.866 ≈ 17.32 N (into the plane).
```

| Action | Expected Result |
|--------|-----------------|
| Enter response | Input accepted |
| Submit | Step marked complete |

### Phase 7: Professor Check-In (Step 2)

**Prompt**: "Why do we use components parallel/perpendicular to the incline?"

**Input (copy-paste):**
```
Because normal force and friction align naturally with perpendicular/parallel directions. This makes Newton's 2nd law simple: one equation along the plane and one perpendicular to it.
```

| Action | Expected Result |
|--------|-----------------|
| Type response | Input accepted |
| Submit | Tutor validates and closes |

### Phase 8: Complete Step 3 - Normal Force

**Prompt**: "Write N and compute its value (no acceleration perpendicular to the plane)."

**Input (copy-paste):**
```
No acceleration perpendicular ⇒ N = mg cosθ ≈ 17.32 N.
```

| Action | Expected Result |
|--------|-----------------|
| Enter response | Input accepted |
| Submit | Step marked complete |

### Phase 9: Complete Step 4 - Friction Magnitude

**Prompt**: "Compute fk and state its direction."

**Input (copy-paste):**
```
fk = μk N = 0.20 * 17.32 ≈ 3.46 N, directed up the incline (opposes downward motion).
```

| Action | Expected Result |
|--------|-----------------|
| Enter response | Input accepted |
| Submit | Step marked complete |

### Phase 10: Complete Step 5 - Newton's 2nd Law

**Prompt**: "Write ΣF along the plane and relate it to acceleration."

**Input (copy-paste):**
```
Choose down the incline as +x: ΣF = mg sinθ − fk = ma.
```

| Action | Expected Result |
|--------|-----------------|
| Enter response | Input accepted |
| Submit | Step marked complete |

### Phase 11: Complete Step 6 - Solve for Acceleration

**Prompt**: "Solve for the acceleration (magnitude and direction)."

**Input (copy-paste):**
```
a = (mg sinθ − fk)/m = (10 − 3.46)/2 ≈ 3.27 m/s², down the incline.
```

| Action | Expected Result |
|--------|-----------------|
| Enter response | Input accepted |
| Submit | Step marked complete |

### Phase 12: Sanity Check

**Prompt**: "Sanity Check / Reflection (explain why your result makes sense)."

**Input (copy-paste):**
```
Sanity: If μk = 0 then a = g sin30° = 5 m/s². With friction present, acceleration must be smaller, so ~3.27 m/s² is reasonable. Also if μk approaches tan30° ≈ 0.577, acceleration approaches 0; our μk = 0.20 is well below that, so the block should slide down.
Reflection: I will always resolve forces along/perpendicular to the incline and check limiting cases (μk = 0 and μk → tanθ) to catch sign mistakes.
```

| Action | Expected Result |
|--------|-----------------|
| Enter response | Input accepted |
| Submit | Problem marked as SOLVED |

**Validation:**
- [ ] Celebration/completion UI shown
- [ ] Problem status is "Solved" in history
- [ ] All steps show completed state (✓)

## Completion Verification Checklist

After completing the happy path:

- [ ] Problem attempt shows **Solved** status in current UI
- [ ] Problem appears in `/history` with status `SOLVED`
- [ ] Solution flow reached final screen without errors
- [ ] Steps 1→6 completed in order
- [ ] Professor Check-In appeared and accepted inputs for Steps 1 and 2
- [ ] No blocking alerts or errors in browser console

## Running Automated Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm run test

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test -- --coverage
```

### End-to-End Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npx playwright test --ui

# Run specific test file
npx playwright test e2e/scaffold.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Generate HTML report
npx playwright show-report
```

### E2E Test Files

| File | Description |
|------|-------------|
| `e2e/home.spec.ts` | Home page and sample problem loading |
| `e2e/scaffold.spec.ts` | Scaffold generation and step interaction |

## Feature-Specific Test Scenarios

### Testing Warm-Up Protocol

**Precondition**: `NEXT_PUBLIC_FEATURE_WARMUP_PROTOCOL=true`

1. Clear site data
2. Navigate to app
3. **Expected**: Warm-up modal appears
4. Complete 2-3 drill questions (20s each)
5. **Expected**: Dashboard accessible after completion

**Skip flow:**
1. Click "Skip" button
2. **Expected**: Warning about mastery penalty (-0.05)
3. Confirm skip
4. **Expected**: Dashboard accessible, skip recorded

### Testing Pivot Injection

**Precondition**: `NEXT_PUBLIC_FEATURE_PIVOT_INJECTION=true`

1. Start a problem
2. Expand a step
3. Wait 90+ seconds without answering OR submit 2+ wrong answers
4. **Expected**: Pivot question modal appears
5. Answer pivot or skip
6. **Expected**: Pivot closes, original step remains active

### Testing Constraint Highlight

**Precondition**: `NEXT_PUBLIC_FEATURE_CONSTRAINT_HIGHLIGHT=true`

1. Use a problem with constraint (e.g., "frictionless")
2. Submit wrong answer that ignores constraint
3. **Expected**: Problem text shows highlighted constraint keyword
4. Acknowledge the highlight
5. **Expected**: Can continue solving

### Testing Confidence-Weighted SRS

**Precondition**: `NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS=true`

1. Complete a step
2. **Expected**: Confidence rating prompt appears
3. Select "Guess" / "Okay" / "Solid"
4. **Expected**: Rating recorded, affects next review scheduling

### Testing Boundary Case Builder

**Precondition**: `NEXT_PUBLIC_FEATURE_BOUNDARY_CASE=true`

1. Complete a step with a derived equation
2. **Expected**: Boundary case builder available
3. Adjust a parameter to extreme value (e.g., θ → 0°)
4. **Expected**: Preview of limiting behavior shown
5. Validate result matches physical intuition

### Testing Paper Solution Upload

**Precondition**: `NEXT_PUBLIC_FEATURE_PAPER_SOLUTION=true`

1. Navigate to solver
2. Click "Upload Solution" button
3. Select an image of handwritten work
4. **Expected**: Upload succeeds, OCR extracts text
5. **Expected**: Analysis feedback provided

## Failure Diagnostics

### Scaffold Generation Fails

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| Spinner indefinitely | API timeout | Check network tab for 504/timeout |
| "Quota exhausted" | Daily limit reached | Reset quotas or wait 24h |
| "Not authenticated" | Session expired | Re-login with pilot code |
| 500 error | Server error | Check server logs, report bug |

### Step Won't Advance

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| No feedback after submit | Gating overlay blocking | Look for modal/overlay to close |
| Wrong answer loop | Need to unlock hint | Click "Show Hint" to progress |
| UI frozen | JavaScript error | Check console, refresh page |

### Tutor Chat Issues

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| Chat doesn't appear | Feature flag disabled | Verify `NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR=true` |
| Chat never closes | Validation failing | Try rephrasing response |
| Chat errors | API issue | Check network tab for errors |

### Progress Lost

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| Steps reset on refresh | Autosave failed | Check localStorage permissions |
| History empty | Site data cleared | Cannot recover, start new session |
| Resume doesn't work | Corrupted state | Clear localStorage, restart |

## Browser Console Checks

Open DevTools (F12) → Console tab and look for:

```javascript
// Check session
localStorage.getItem('physiscaffold_session')

// Check problem history
localStorage.getItem('physiscaffold_problemHistory')

// Check for errors
// Any red error messages indicate issues
```

## Network Tab Checks

Open DevTools (F12) → Network tab and verify:

| Endpoint | Expected Status | Notes |
|----------|-----------------|-------|
| `/api/scaffold/outline` | 200 | Phase A generation |
| `/api/scaffold/step` | 200 | Phase B step expansion |
| `/api/socratic-tutor` | 200 | Chat interaction |
| `/api/warmup/*` | 200 | Warm-up protocol |

Common error codes:
- 401: Authentication required
- 429: Rate limit / quota exceeded
- 500: Server error (report as bug)

## Test Coverage Targets

| Area | Target Coverage |
|------|-----------------|
| Core solving flow | 90%+ |
| Feature flag paths | 80%+ |
| Error handling | 75%+ |
| Edge cases | 70%+ |

## Reporting Bugs

When reporting issues, include:

1. **Steps to reproduce** (exact sequence)
2. **Expected behavior**
3. **Actual behavior**
4. **Screenshots** (if visual issue)
5. **Console errors** (copy/paste text)
6. **Network errors** (status codes)
7. **Environment** (browser, OS, feature flags)
8. **Last completed scaffold step**
