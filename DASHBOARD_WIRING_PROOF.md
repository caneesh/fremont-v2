# Dashboard Wiring Proof

**Audit Date:** 2026-01-10
**Purpose:** Verify that "Fixed" dashboard metrics are wired to real user actions

---

## 1. markQuestionSolved() Wiring Proof

### Function Definition

**File:** `lib/studyPath/studyPathService.ts:160-176`

```typescript
markQuestionSolved(topicId: string, questionId: string): void {
  const allProgress = this.getAllProgress()
  const topicProgress = this.getTopicProgress(topicId)

  if (!topicProgress.questionsAttempted.includes(questionId)) {
    topicProgress.questionsAttempted.push(questionId)
  }

  if (!topicProgress.questionsSolved.includes(questionId)) {
    topicProgress.questionsSolved.push(questionId)
  }

  topicProgress.lastAccessedAt = new Date().toISOString()

  allProgress[topicId] = topicProgress
  this.saveProgress(allProgress)  // Writes to localStorage
}
```

### Call Sites

| File | Line | Caller | Context |
|------|------|--------|---------|
| `components/SolutionScaffold.tsx` | 1599 | `handleReflectionComplete()` | After user completes reflection |

**Call Site Code:**
```typescript
// components/SolutionScaffold.tsx:1595-1599
problemHistoryService.markSolved(problemId(), problemTitle(), progressWithReflection)

// Update study path progress - mark question as solved
const topicId = data.domain.toLowerCase()
studyPathService.markQuestionSolved(topicId, problemId())
```

### User Action Trigger

1. User works through all steps of a problem in `/solve`
2. User completes all sanity checks (SanityCheckMatrix or SanityCheckStep)
3. User clicks "Mark as Solved" button
4. Reflection modal appears
5. **User submits reflection answers** → `handleReflectionComplete()` fires
6. `markQuestionSolved()` is called with `topicId` (from `data.domain.toLowerCase()`) and `problemId()`

### Production Build Verification

- **No dev-only guards:** The call is inside `handleReflectionComplete` callback with no `process.env.NODE_ENV` checks
- **No feature flags:** No `FEATURE_FLAGS.*` conditionals wrap this call
- **Runs in production:** Yes, the entire flow is production code

### Storage Key Written

- **Key:** `physiscaffold_study_progress`
- **Structure:** `{ [topicId]: { questionsAttempted: string[], questionsSolved: string[], lastAccessedAt: string, timeSpent: number } }`

---

## 2. sanityCheckCompleted() Wiring Proof

### Function Definition

**File:** `lib/storage/eventLogger.ts:207-209`

```typescript
sanityCheckCompleted(problemId: string, passed: boolean): StorageResult<StoredEvent> {
  return this.log('sanity_check_completed', { problemId, isCorrect: passed })
}
```

### Call Sites

| File | Line | Caller | Context |
|------|------|--------|---------|
| `components/SolutionScaffold.tsx` | 2433 | `handleSanityCheckSolved()` | After user completes all sanity checks |

**Call Site Code:**
```typescript
// components/SolutionScaffold.tsx:2430-2436
// Handle sanity check solved
const handleSanityCheckSolved = useCallback(() => {
  // Log sanity check completed event for dashboard metrics
  eventLogger.sanityCheckCompleted(problemId(), true)
  // Trigger celebration and allow proceeding to Mark as Solved
  setShowCelebration(true)
}, [problemId])
```

### UI Binding

**SanityCheckMatrix binding:** `components/SolutionScaffold.tsx:3276`
```typescript
<SanityCheckMatrix
  matrix={data.sanityCheckMatrix}
  problemText={data.problem}
  domain={data.domain}
  subdomain={data.subdomain}
  steps={data.steps}
  concepts={data.concepts}
  onAllChecksComplete={handleSanityCheckSolved}  // <-- HERE
  onTargetStep={handleTargetStep}
/>
```

**SanityCheckStep binding:** `components/SolutionScaffold.tsx:3290`
```typescript
<SanityCheckStep
  ...
  onSolved={handleSanityCheckSolved}  // <-- HERE
/>
```

### User Action Trigger

1. User works through all steps of a problem in `/solve`
2. **Sanity Check Matrix path:**
   - User completes all 3 sanity checks (Extreme Cases, Symmetry, Dimensions)
   - Each check requires prediction + reasoning + validation
   - When all 3 pass → `onAllChecksComplete` callback fires
3. **Sanity Check Step path (legacy):**
   - User answers the single sanity check question
   - When verified correct → `onSolved` callback fires
4. `handleSanityCheckSolved()` executes
5. `eventLogger.sanityCheckCompleted(problemId(), true)` writes event to storage

### Production Build Verification

- **No dev-only guards:** The callback has no `process.env.NODE_ENV` checks
- **No feature flags:** No `FEATURE_FLAGS.*` conditionals wrap this call
- **Runs in production:** Yes

### Storage Key Written

- **Key:** `physiscaffold_events`
- **Event Type:** `sanity_check_completed`
- **Metadata:** `{ problemId: string, isCorrect: boolean }`

---

## 3. Verification Checklist

### Manual UI Verification

#### Verify markQuestionSolved

1. Open browser DevTools → Application → Local Storage
2. Clear `physiscaffold_study_progress` or note current value
3. Navigate to `/solve?question=mech-kin-001` (or any valid question)
4. Complete all steps (use hints if needed)
5. Complete sanity checks
6. Click "Mark as Solved"
7. Fill in reflection answers and submit
8. Check `physiscaffold_study_progress`:
   - Should have key `mechanics` (or matching topic)
   - `questionsSolved` array should contain the question ID

#### Verify sanityCheckCompleted

1. Open browser DevTools → Application → Local Storage
2. Clear `physiscaffold_events` or note current event count
3. Navigate to `/solve?question=mech-kin-001`
4. Complete all steps
5. Complete all 3 sanity checks (Extreme Cases, Symmetry, Dimensions)
6. Check `physiscaffold_events`:
   - Should have new event with `type: "sanity_check_completed"`
   - Event should have `metadata.problemId` matching current problem

---

## 4. Call Chain Diagrams

### markQuestionSolved Call Chain

```
User submits reflection
       │
       ▼
┌────────────────────────────────────────────┐
│ ReflectionStep.onComplete(reflections)     │
│ components/SolutionScaffold.tsx:3314       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│ handleReflectionComplete(reflections)      │
│ components/SolutionScaffold.tsx:1582       │
└────────────────────────────────────────────┘
       │
       ├──► problemHistoryService.markSolved()  → physiscaffold_problem_attempts
       │
       ▼
┌────────────────────────────────────────────┐
│ studyPathService.markQuestionSolved()      │
│ components/SolutionScaffold.tsx:1599       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│ localStorage.setItem(                      │
│   'physiscaffold_study_progress', ...)     │
│ lib/studyPath/studyPathService.ts:113      │
└────────────────────────────────────────────┘
```

### sanityCheckCompleted Call Chain

```
User completes all 3 sanity checks
       │
       ▼
┌────────────────────────────────────────────┐
│ SanityCheckMatrix detects all 3 complete   │
│ components/SanityCheckMatrix.tsx:171-173   │
│   const allCompleted = Object.values(...)  │
│   if (allCompleted) onAllChecksComplete()  │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│ handleSanityCheckSolved()                  │
│ components/SolutionScaffold.tsx:2431       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│ eventLogger.sanityCheckCompleted()         │
│ components/SolutionScaffold.tsx:2433       │
└────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│ localStorage.setItem(                      │
│   'physiscaffold_events', ...)             │
│ lib/storage/LocalStorageProvider.ts:283    │
└────────────────────────────────────────────┘
```

---

## 5. Vercel Environment Variables

No environment variables gate these specific functions. However, the following flags affect dashboard visibility:

| Variable | Effect | Default |
|----------|--------|---------|
| `NEXT_PUBLIC_DASHBOARD_V3` | Enables DashboardV3 with Progress tiles | `true` |
| `NEXT_PUBLIC_STUDY_PLAN_V2` | Enables V2 pattern-based tracking | `false` |

---

---

## 6. recordStepCompletionV2() Wiring Proof (V2 Step Attempts)

### Function Definition

**File:** `lib/studyPlanV2/telemetryHook.ts:18-57`

```typescript
export function recordStepCompletionV2(params: {
  problemId: string
  stepIndex: number
  isCorrect: boolean
  hintCount: number
  usedReveal: boolean
  timeSpentSeconds: number
  confidenceRating?: 'low' | 'medium' | 'high'
}): void {
  // Only record if feature is enabled
  if (!FEATURE_FLAGS.STUDY_PLAN_V2) {
    return
  }
  // ... writes to physiscaffold_v2_step_attempts via studyPlanV2Service.recordStepAttempt()
}
```

### Call Sites

| File | Line | Caller | Context |
|------|------|--------|---------|
| `components/SolutionScaffold.tsx` | 1906-1914 | `handleConfidenceRated()` | After user rates confidence |

**Call Site Code:**
```typescript
// components/SolutionScaffold.tsx:1903-1914
// Record step attempt for V2 analytics (confidence distribution, etc.)
// This writes to physiscaffold_v2_step_attempts for ProgressOverview
const stepTimeSpent = Math.floor((Date.now() - problemStartTime) / 1000)
recordStepCompletionV2({
  problemId: problemId(),
  stepIndex: stepId,
  isCorrect,
  hintCount: hintLevel,
  usedReveal: hintLevel >= 5,
  timeSpentSeconds: stepTimeSpent,
  confidenceRating: confidence,
})
```

### User Action Trigger

1. User works through a step in `/solve`
2. User completes the step (verifies answer or uses full solution)
3. **Confidence rating prompt appears**
4. **User selects Low/Medium/High confidence** → `handleConfidenceRated()` fires
5. `recordStepCompletionV2()` writes step attempt with confidence to storage

### Production Build Verification

- **Feature flag guard:** `FEATURE_FLAGS.STUDY_PLAN_V2` must be `true` (default: ON)
- **Runs in production:** Yes, when V2 flag is enabled

### Storage Key Written

- **Key:** `physiscaffold_v2_step_attempts`
- **Structure:** `{ [userId]: StepAttemptEvent[] }`
- **Event Fields:** `problemId`, `stepIndex`, `isCorrect`, `hintCount`, `usedReveal`, `timeSpentSeconds`, `confidenceRating`

---

## Conclusion

All three metrics are now fully wired:

| Metric | Storage Key | Writer | Trigger | Production Safe |
|--------|-------------|--------|---------|-----------------|
| Problems Solved | `physiscaffold_study_progress` | `markQuestionSolved()` | Submit reflection | Yes |
| Sanity Check Rate | `physiscaffold_events` | `sanityCheckCompleted()` | Complete 3 checks | Yes |
| Confidence Distribution | `physiscaffold_v2_step_attempts` | `recordStepCompletionV2()` | Rate step confidence | Yes (V2 flag) |
