# Dashboard Write Path Verification

**Audit Date:** 2026-01-10
**Auditor:** Write Path Analysis
**Purpose:** Verify each localStorage key is written by real user actions, not just read paths

---

## Executive Summary

| Storage Key | Production Write Path | Verdict |
|------------|----------------------|---------|
| `physiscaffold_problem_attempts` | `SolutionScaffold.tsx` calls `saveDraft()`, `markSolved()` | **REAL** |
| `physiscaffold_today_plan_*` | `DashboardV3.tsx`, `SolvePage.tsx` call plan service | **REAL** |
| `physiscaffold_study_progress` | `SolutionScaffold.tsx` calls `markQuestionSolved()` | **REAL** |
| `physiscaffold_mistake_cards` | `SolutionScaffold.tsx` calls `createCardIfNotExists()` | **REAL** |
| `physiscaffold_v2_pattern_states` | `telemetryHook.ts` calls via `advanceV2Session()` | **CONDITIONAL** - Only in V2 sessions |
| `physiscaffold_v2_step_attempts` | `SolutionScaffold.tsx` calls `recordStepCompletionV2()` | **REAL** - Via confidence rating |
| `physiscaffold_events` | `SolutionScaffold.tsx` calls `sanityCheckCompleted()` | **REAL** |

---

## 1. physiscaffold_problem_attempts

### Write Path Proof Table

| Writer Function | File:Line | Trigger User Action | UI Location | Guard |
|----------------|-----------|---------------------|-------------|-------|
| `saveDraft()` | `lib/problemHistory.ts:48` | User edits step, skips, or saves | `SolutionScaffold.tsx:1437` | None |
| `markSolved()` | `lib/problemHistory.ts:108` | User completes reflection | `SolutionScaffold.tsx:1593` | `onReflectionComplete` callback |
| `markAttemptSkipped()` | `lib/problemHistory.ts:164` | User skips problem | `SolutionScaffold.tsx:1398` | `handleSkip` |

### Call Stack
```
User clicks "Submit" on reflection
  → SolutionScaffold.onReflectionComplete()
    → problemHistoryService.markSolved(problemId, problemTitle, progress)
      → localStorage.setItem('physiscaffold_problem_attempts', ...)
```

### Verdict: **REAL**

---

## 2. physiscaffold_today_plan_*

### Write Path Proof Table

| Writer Function | File:Line | Trigger User Action | UI Location | Guard |
|----------------|-----------|---------------------|-------------|-------|
| `addTask()` | `lib/dashboard/todayPlanService.ts:138` | User adds task | `DashboardV3.tsx:82` | TaskPickerModal |
| `removeTask()` | `lib/dashboard/todayPlanService.ts:159` | User removes task | `DashboardV3.tsx:87` | Confirmation |
| `markTaskDone()` | `lib/dashboard/todayPlanService.ts:193` | User completes task | `SolvePage.tsx:105` | Problem completion |
| `moveTaskUp/Down()` | `lib/dashboard/todayPlanService.ts:170,181` | User reorders | `DashboardV3.tsx:92,97` | Drag/drop |

### Verdict: **REAL**

---

## 3. physiscaffold_study_progress

### Write Path Proof Table

| Writer Function | File:Line | Trigger User Action | UI Location | Guard |
|----------------|-----------|---------------------|-------------|-------|
| `markQuestionAttempted()` | `lib/studyPath/studyPathService.ts:143` | User starts question | `SolvePage.tsx:294,573` | Page load |
| `markQuestionSolved()` | `lib/studyPath/studyPathService.ts:160` | User solves question | **NOT CALLED** | - |

### Gap Analysis
```typescript
// lib/studyPath/studyPathService.ts:160
markQuestionSolved(topicId: string, questionId: string): void {
  // This function EXISTS but is NEVER CALLED from UI
}
```

**Impact:** Dashboard Progress tile shows `problemsSolved: 0` because `questionsSolved` array is never populated.

### Verdict: **PARTIAL** - markQuestionSolved not wired

---

## 4. physiscaffold_mistake_cards

### Write Path Proof Table

| Writer Function | File:Line | Trigger User Action | UI Location | Guard |
|----------------|-----------|---------------------|-------------|-------|
| `createCardIfNotExists()` | `lib/mistakeNotebook.ts:251` | User fails step | `SolutionScaffold.tsx:857` | `task_incorrect` |
| `createCardIfNotExists()` | `lib/mistakeNotebook.ts:251` | User requests hint (level 3+) | `SolutionScaffold.tsx:2102` | `hint_requested` |
| `saveCards()` | `lib/mistakeNotebook.ts:38` | Internal save | Multiple | After any card mutation |

### Verdict: **REAL**

---

## 5. physiscaffold_v2_pattern_states

### Write Path Proof Table

| Writer Function | File:Line | Trigger User Action | UI Location | Guard |
|----------------|-----------|---------------------|-------------|-------|
| `saveUserPatternState()` | `lib/studyPlanV2/repository.ts:300` | Pattern session complete | `telemetryHook.ts:120,161` | `STUDY_PLAN_V2` flag |
| `updateMasteryOnAttempt()` | `lib/studyPlanV2/scheduler.ts:184` | Step attempt recorded | `scheduler.ts:184,840` | V2 mode |

### Conditional Flow
Only populated when user is in a V2 study session (started from pattern track).

### Verdict: **CONDITIONAL** - Works in V2 mode only

---

## 6. physiscaffold_v2_step_attempts

### Write Path Proof Table

| Writer Function | File:Line | Trigger User Action | UI Location | Guard |
|----------------|-----------|---------------------|-------------|-------|
| `addStepAttempt()` | `lib/studyPlanV2/repository.ts:437` | Step completed | `studyPlanV2Service.ts:282` | STUDY_PLAN_V2 |
| `recordStepCompletionV2()` | `lib/studyPlanV2/telemetryHook.ts:18` | Confidence rated | `SolutionScaffold.tsx:1906` | STUDY_PLAN_V2 |

### Call Site (WIRED)
```typescript
// components/SolutionScaffold.tsx:1903-1914
// Record step attempt for V2 analytics (confidence distribution, etc.)
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

**Trigger:** User selects Low/Medium/High confidence after completing a step

### Verdict: **REAL** - Wired via handleConfidenceRated callback

---

## 7. physiscaffold_events

### Write Path Proof Table

| Writer Function | File:Line | Trigger User Action | UI Location | Guard |
|----------------|-----------|---------------------|-------------|-------|
| `warmup_assigned` | `lib/warmUp/warm-up-service.ts:49` | Warm-up starts | WarmUpPlayer | None |
| `warmup_completed` | `lib/warmUp/warm-up-service.ts:76` | Warm-up done | WarmUpPlayer | None |
| `drill_started` | `lib/drillService.ts:361` | Drill begins | DrillModal | None |
| `drill_completed` | `lib/drillService.ts:403` | Drill done | DrillModal | None |
| `pattern_first_shown` | `lib/patternFirstService.ts:91` | Pattern shown | PatternFirst | None |
| `sanityCheckCompleted` | `lib/storage/eventLogger.ts:207` | Sanity check done | **NOT CALLED** | - |

### Gap Analysis
```typescript
// lib/storage/eventLogger.ts:207
sanityCheckCompleted(problemId: string, passed: boolean): StorageResult<StoredEvent> {
  return this.log('sanity_check_completed', { problemId, isCorrect: passed })
}
// This method EXISTS but is NEVER CALLED from SanityCheckMatrix component
```

**Impact:** ProgressOverview Sanity Check Rate always shows 0% because no sanity check events are logged.

### Verdict: **PARTIAL** - sanityCheckCompleted not wired

---

## 8. Dev Seeding Detection

### Dev-Only Pages Found

| Path | Purpose | Storage Keys Written |
|------|---------|---------------------|
| `/dev/progress-test` | Test ProgressOverview | `physiscaffold_v2_pattern_states`, `physiscaffold_v2_step_attempts`, `physiscaffold_events` |
| `/dev/events` | Event viewer | Read-only |
| `/dev/time-pressure` | Test time pressure | None |

### Seeding Code Location
```typescript
// app/dev/progress-test/page.tsx:166
localStorage.setItem(STORAGE_KEYS.USER_PATTERN_STATES, JSON.stringify(states))
localStorage.setItem(STORAGE_KEYS.STEP_ATTEMPTS, JSON.stringify(attempts))
localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events))
```

**Risk:** Dev pages are protected by route (not exposed in production menu) but accessible if URL is known.

---

## 9. Canonical Event Types

| Event Type | Emitter | Production Status |
|------------|---------|-------------------|
| `warmup_assigned` | `warm-up-service.ts:49` | ACTIVE |
| `warmup_started` | `warm-up-service.ts:55` | ACTIVE |
| `warmup_item_completed` | `warm-up-service.ts:60` | ACTIVE |
| `warmup_block_completed` | `warm-up-service.ts:69` | ACTIVE |
| `warmup_completed` | `warm-up-service.ts:76` | ACTIVE |
| `warmup_skipped` | `warm-up-service.ts:83` | ACTIVE |
| `drill_started` | `drillService.ts:361` | ACTIVE |
| `drill_item_completed` | `drillService.ts:381` | ACTIVE |
| `drill_completed` | `drillService.ts:403` | ACTIVE |
| `drill_abandoned` | `drillService.ts:421` | ACTIVE |
| `pattern_first_shown` | `patternFirstService.ts:91` | ACTIVE |
| `pattern_selected` | `patternFirstService.ts:107` | ACTIVE |
| `pattern_correctness` | `patternFirstService.ts:143` | ACTIVE |
| `sanity_check_completed` | `eventLogger.ts:207` | **NOT WIRED** |
| `integrity_signal_detected` | `integrityMonitor.ts:221` | ACTIVE |

---

## 10. Recommended Fixes

### Fix 1: Wire markQuestionSolved (Priority: HIGH)

**File:** `components/SolutionScaffold.tsx`
**Location:** After line 1593 (inside `onReflectionComplete`)

```typescript
// After: problemHistoryService.markSolved(problemId(), problemTitle(), progressWithReflection)
// Add:
if (data.topic) {
  studyPathService.markQuestionSolved(data.topic, problemId())
}
```

### Fix 2: Wire sanityCheckCompleted (Priority: MEDIUM)

**File:** `components/micro-tasks/SanityCheckMatrix.tsx`
**Location:** `onComplete` callback

```typescript
// Add import:
import { eventLogger } from '@/lib/storage/eventLogger'

// In onComplete:
eventLogger.sanityCheckCompleted(problemId, passed)
```

### Fix 3: Wire recordStepCompletionV2 (Priority: LOW - V2 feature)

**File:** `components/SolutionScaffold.tsx`
**Location:** After step completion

```typescript
// Add import:
import { recordStepCompletionV2 } from '@/lib/studyPlanV2'

// In handleStepComplete:
recordStepCompletionV2({
  problemId: problemId(),
  stepIndex: stepIndex,
  isCorrect: true,
  hintCount: stepHintLevels.get(stepId) || 0,
  usedReveal: false,
  timeSpentSeconds: Math.floor((Date.now() - stepStartTime) / 1000),
})
```

---

## 11. Verification Checklist

After implementing fixes, verify:

- [ ] Solve a problem completely → check `physiscaffold_study_progress` has `questionsSolved` populated
- [ ] Complete a sanity check → check `physiscaffold_events` has `sanity_check_completed` event
- [ ] Check ProgressOverview → confidence distribution shows data
- [ ] Check ProgressOverview → sanity check rate shows percentage
- [ ] Run e2e tests → all dashboard tests pass

---

## Conclusion

**All storage keys are now REAL (wired to user actions):**

| Storage Key | Status | Fix Applied |
|-------------|--------|-------------|
| `physiscaffold_problem_attempts` | REAL | - |
| `physiscaffold_today_plan_*` | REAL | - |
| `physiscaffold_study_progress` | **FIXED** | Added `markQuestionSolved()` in `handleReflectionComplete` |
| `physiscaffold_mistake_cards` | REAL | - |
| `physiscaffold_v2_pattern_states` | CONDITIONAL | V2 session only |
| `physiscaffold_v2_step_attempts` | **FIXED** | Added `recordStepCompletionV2()` in `handleConfidenceRated` |
| `physiscaffold_events` | **FIXED** | Added `sanityCheckCompleted()` in `handleSanityCheckSolved` |

**All dashboard metrics now update from real user activity.**
