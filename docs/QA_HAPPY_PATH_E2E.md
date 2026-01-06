# PhysiScaffold — E2E Happy Path (Single Scenario)

## Preconditions
- Environment: local or deployed build of PhysiScaffold with a clean browser profile (or clear site data).
- Authentication: login is available and you can sign in with a valid pilot code (use `DEV` if enabled).
- Quotas: daily quotas are not exhausted (problems/hints/prereqs/reflections all have remaining capacity).
- Feature flags (must be enabled for this scenario):
  - Micro-task solving flow is enabled (default).
  - Professor Check-In / Socratic Tutor is enabled (`NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR` is not `false`).
- Navigation: Dashboard (Study Path) is the default landing page after login.

---

## Chosen Physics Question (One Only)
- **Topic:** Mechanics — Newton’s Laws (inclined plane with kinetic friction)
- **Difficulty:** Medium
- **Problem statement (copy-paste):**
  > A 2 kg block is released from rest on a 30° rough incline. The coefficient of kinetic friction between the block and the plane is μk = 0.20. Take g = 10 m/s². Find the block’s acceleration (magnitude and direction) immediately after release.

---

## Happy Path Scaffold Steps (10 steps total)

### 1) Start Problem (Create a new solve)
- **Step name:** Start problem from Dashboard
- **Prompt shown to the user:** “Enter Your Physics Problem” / “Problem Statement”
- **EXACT input text QA should enter (copy-paste):**
```text
A 2 kg block is released from rest on a 30° rough incline. The coefficient of kinetic friction between the block and the plane is μk = 0.20. Take g = 10 m/s². Find the block’s acceleration (magnitude and direction) immediately after release.
```
- **Expected system behavior:**
  - Scaffold generation begins (loading state appears).
  - A “Solution Roadmap” (or equivalent step list) appears.
  - Step 1 becomes active and the app is ready to guide the learner.

---

### 2) Step 1 (Concept + forces) → Professor Check-In response
- **Step name:** Identify forces on the block
- **Prompt shown to the user:** “List all forces acting on the block on the incline.”
- **EXACT input text QA should enter (copy-paste):**
```text
Forces: weight mg downward, normal force N perpendicular to the plane, kinetic friction fk along the plane opposing motion (up the plane since the block slides down).
```
- **Expected system behavior:**
  - The system accepts the response (no blocking error).
  - The step is marked as completed/earned (e.g., “insight collected”).
  - A Professor Check-In appears asking a short “why” question for Step 1.

---

### 3) Professor Check-In for Step 1 (Socratic Tutor)
- **Step name:** Professor Check-In — friction direction
- **Prompt shown to the user:** “Why is friction directed up the incline here?”
- **EXACT input text QA should enter (copy-paste):**
```text
Kinetic friction opposes relative motion at the contact. Since gravity makes the block move down the incline, friction acts up the incline to oppose that sliding motion.
```
- **Expected system behavior:**
  - Tutor feedback acknowledges understanding (may include celebration/confetti).
  - The app advances to Step 2 (Step 2 becomes active).

---

### 4) Step 2 (Resolve weight components)
- **Step name:** Resolve weight into components
- **Prompt shown to the user:** “Resolve mg into components parallel and perpendicular to the incline (use θ = 30°).”
- **EXACT input text QA should enter (copy-paste):**
```text
Parallel: mg sinθ = 2*10*sin30° = 20*0.5 = 10 N (down the plane).
Perpendicular: mg cosθ = 2*10*cos30° ≈ 20*0.866 ≈ 17.32 N (into the plane).
```
- **Expected system behavior:**
  - Step 2 is accepted and marked complete.
  - Professor Check-In appears for Step 2 (short conceptual validation).

---

### 5) Professor Check-In for Step 2 (axis choice)
- **Step name:** Professor Check-In — why these components
- **Prompt shown to the user:** “Why do we use components parallel/perpendicular to the incline?”
- **EXACT input text QA should enter (copy-paste):**
```text
Because normal force and friction align naturally with perpendicular/parallel directions. This makes Newton’s 2nd law simple: one equation along the plane and one perpendicular to it.
```
- **Expected system behavior:**
  - Tutor validates and closes.
  - Step 3 becomes active.

---

### 6) Step 3 (Normal force)
- **Step name:** Compute the normal force
- **Prompt shown to the user:** “Write N and compute its value (no acceleration perpendicular to the plane).”
- **EXACT input text QA should enter (copy-paste):**
```text
No acceleration perpendicular ⇒ N = mg cosθ ≈ 17.32 N.
```
- **Expected system behavior:**
  - Step 3 is marked complete.
  - Step 4 becomes active (or the tutor check-in appears and then Step 4 becomes active).

---

### 7) Step 4 (Friction magnitude)
- **Step name:** Compute kinetic friction
- **Prompt shown to the user:** “Compute fk and state its direction.”
- **EXACT input text QA should enter (copy-paste):**
```text
fk = μk N = 0.20 * 17.32 ≈ 3.46 N, directed up the incline (opposes downward motion).
```
- **Expected system behavior:**
  - Step 4 completes and the system advances to Step 5.

---

### 8) Step 5 (Newton’s 2nd law along incline)
- **Step name:** Set up Newton’s 2nd law along the plane
- **Prompt shown to the user:** “Write ΣF along the plane and relate it to acceleration.”
- **EXACT input text QA should enter (copy-paste):**
```text
Choose down the incline as +x: ΣF = mg sinθ − fk = ma.
```
- **Expected system behavior:**
  - Step 5 completes and the system advances to Step 6.

---

### 9) Step 6 (Solve for acceleration)
- **Step name:** Solve for a
- **Prompt shown to the user:** “Solve for the acceleration (magnitude and direction).”
- **EXACT input text QA should enter (copy-paste):**
```text
a = (mg sinθ − fk)/m = (10 − 3.46)/2 ≈ 3.27 m/s², down the incline.
```
- **Expected system behavior:**
  - Step 6 completes.
  - The app shows a “Sanity Check” / “Check your result” step (or similar end-of-solve validation).

---

### 10) Done (Sanity + Mark Solved + Reflection)
- **Step name:** Sanity check + mark solved + reflection
- **Prompt shown to the user:** “Sanity Check / Reflection (explain why your result makes sense).”
- **EXACT input text QA should enter (copy-paste):**
```text
Sanity: If μk = 0 then a = g sin30° = 5 m/s². With friction present, acceleration must be smaller, so ~3.27 m/s² is reasonable. Also if μk approaches tan30° ≈ 0.577, acceleration approaches 0; our μk = 0.20 is well below that, so the block should slide down.
Reflection: I will always resolve forces along/perpendicular to the incline and check limiting cases (μk = 0 and μk → tanθ) to catch sign mistakes.
```
- **Expected system behavior:**
  - The app accepts the entry and completes the end-of-problem flow.
  - The attempt is marked **Solved** (celebration or solved state visible).
  - A “Continue / Next” affordance appears (or the system returns to Dashboard/History depending on configuration).

---

## Completion Verification Checklist (“Done” proof)
- The problem attempt shows **Solved** status (in the current UI and/or in `History`).
- The solution flow reaches the final screen/state without blocking alerts or errors.
- Step progression is consistent: Steps 1→6 complete in order and the end-of-problem flow appears.
- “Professor Check-In” appears and accepts inputs for Steps 1 and 2 (tutor closes and advances).
- History entry exists for this attempt with status `SOLVED` and the problem title matches the entered text (or a recognizable snippet).

---

## Failure Diagnostics (what to check if stuck)
- **Quota / limits:** Look for an in-app warning/toast about daily limits; verify remaining quotas in the welcome/limits UI.
- **Auth/session:** If API calls fail, confirm you’re logged in (pilot session exists) and the app isn’t stuck on “Not authenticated”.
- **Network / API:** Open devtools → Network:
  - `/api/solve` returns `200` (not `429`).
  - If `429`, quotas are exhausted; reset local quotas or use a different pilot session.
- **Tutor not appearing:** Confirm `NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR` is enabled and you completed a step (tutor triggers on completion).
- **Step won’t advance:** Check for any gating overlays (preflight/decision gate) blocking progression; close/complete them.
- **UI state corruption:** Clear site data (localStorage) for the app domain and retry from Preconditions.
- **Console errors:** In devtools console, capture any uncaught exceptions and note the last completed scaffold step.
